import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
  HttpException,
} from '@nestjs/common';
import { MetricsService } from '../../metrics/metrics.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateLocationDto, SharingConsentDto } from '../dtos/update-location.dto';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { DeliveryGateway } from '../delivery.gateway';
import { distanceMeters, isTrackable } from '../services/tracking-policy';

@Injectable()
export class UpdateDeliveryLocationUseCase {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(DeliveryTracking) private readonly tracking: Repository<DeliveryTracking>,
    private readonly authorization: OrderAuthorizationService,
    private readonly gateway: DeliveryGateway,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  async sharing(orderId: number, dto: SharingConsentDto, user: User) {
    const person = await this.authorization.getActiveDeliveryPerson(user);
    return this.orders.manager.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('o')
        .addSelect('o.tracking_session_id')
        .setLock('pessimistic_write')
        .where('o.id = :orderId', { orderId })
        .getOne();
      if (!order) throw new NotFoundException('Order not found');
      this.authorization.assertIsAssignedDeliveryPerson(order, person);
      if (dto.enabled)
        await this.authorization.assertDeliveryPersonCanServeUnit(person, order.unit_id);
      if (dto.enabled && (!isTrackable(order) || !person.is_online)) {
        throw new ConflictException({
          code: 'TRACKING_ENDED',
          message: 'Delivery is not available for tracking',
        });
      }
      order.tracking_session_id = dto.enabled ? randomUUID() : null;
      order.tracking_consent_user_id = user.id;
      order.tracking_consent_at = dto.enabled ? new Date() : order.tracking_consent_at;
      order.tracking_revoked_at = dto.enabled ? null : new Date();
      await manager.save(Order, order);
      // A new consent session must never expose a point from a previous session.
      await manager.delete(DeliveryTracking, { order_id: orderId });
      return {
        enabled: dto.enabled,
        session_id: order.tracking_session_id,
        consent_version: '2026-09-11',
      };
    });
  }

  async execute(orderId: number, dto: UpdateLocationDto, user: User): Promise<DeliveryTracking> {
    try {
      const point = await this.persist(orderId, dto, user);
      this.metrics?.observeTracking(
        'accepted',
        (Date.now() - new Date(dto.captured_at).getTime()) / 1000,
      );
      return point;
    } catch (error) {
      const response = error instanceof HttpException ? error.getResponse() : null;
      const code =
        response && typeof response === 'object' && 'code' in response ? String(response.code) : '';
      const allowed = [
        'LOCATION_QUALITY',
        'LOCATION_OUT_OF_ORDER',
        'LOCATION_TOO_FREQUENT',
        'LOCATION_IMPLAUSIBLE',
        'TRACKING_ENDED',
        'TRACKING_CONSENT_REQUIRED',
      ];
      this.metrics?.observeTracking(allowed.includes(code) ? code : 'rejected');
      throw error;
    }
  }

  private async persist(
    orderId: number,
    dto: UpdateLocationDto,
    user: User,
  ): Promise<DeliveryTracking> {
    const person = await this.authorization.getActiveDeliveryPerson(user);
    const captured = new Date(dto.captured_at);
    const age = Date.now() - captured.getTime();
    if (
      !Number.isFinite(age) ||
      age > 60000 ||
      age < -10000 ||
      dto.is_mocked ||
      !Number.isFinite(dto.accuracy) ||
      dto.accuracy > 150 ||
      dto.accuracy < 0
    ) {
      throw new BadRequestException({
        code: 'LOCATION_QUALITY',
        message: 'A fresh, accurate GPS position is required',
      });
    }
    const saved = await this.orders.manager.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('o')
        .addSelect('o.tracking_session_id')
        .setLock('pessimistic_write')
        .where('o.id = :orderId', { orderId })
        .getOne();
      if (!order) throw new NotFoundException('Order not found');
      this.authorization.assertIsAssignedDeliveryPerson(order, person);
      const currentPerson = await manager.findOne(DeliveryPerson, {
        where: { id: person.id, status: DeliveryPersonStatus.ACTIVE, is_online: true },
        lock: { mode: 'pessimistic_read' },
      });
      if (!isTrackable(order) || !currentPerson) {
        throw new ConflictException({
          code: 'TRACKING_ENDED',
          message: 'Delivery is no longer active',
        });
      }
      await this.authorization.assertDeliveryPersonCanServeUnit(currentPerson, order.unit_id);
      if (Date.now() - captured.getTime() > 60000)
        throw new BadRequestException({
          code: 'LOCATION_QUALITY',
          message: 'GPS sample expired while waiting',
        });
      if (
        order.tracking_session_id !== dto.session_id ||
        order.tracking_consent_user_id !== user.id ||
        order.tracking_revoked_at ||
        !order.tracking_consent_at
      ) {
        throw new ForbiddenException({
          code: 'TRACKING_CONSENT_REQUIRED',
          message: 'Enable sharing for this delivery',
        });
      }
      const repo = manager.getRepository(DeliveryTracking);
      const duplicate = await repo.findOne({
        where: { order_id: orderId, sample_id: dto.sample_id },
      });
      if (duplicate) return { order, point: duplicate };
      const latest = await repo.findOne({
        where: { order_id: orderId },
        order: { created_at: 'DESC', id: 'DESC' },
      });
      if (latest) {
        const previousTime = (latest.captured_at ?? latest.created_at).getTime();
        if (captured.getTime() <= previousTime) {
          throw new ConflictException({
            code: 'LOCATION_OUT_OF_ORDER',
            message: 'A newer position already exists',
          });
        }
        if (Date.now() - latest.created_at.getTime() < 5000) {
          throw new ConflictException({
            code: 'LOCATION_TOO_FREQUENT',
            message: 'Wait five seconds between positions',
          });
        }
        const meters = distanceMeters(
          Number(latest.latitude),
          Number(latest.longitude),
          dto.latitude,
          dto.longitude,
        );
        const tolerance = Number(latest.accuracy ?? 0) + dto.accuracy;
        if (meters > tolerance + (70 * (captured.getTime() - previousTime)) / 1000) {
          throw new BadRequestException({
            code: 'LOCATION_IMPLAUSIBLE',
            message: 'GPS position changed too quickly',
          });
        }
      }
      const point = await repo.save(
        repo.create({
          order_id: orderId,
          delivery_person_id: person.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          captured_at: captured,
          sample_id: dto.sample_id,
        }),
      );
      return { order, point };
    });
    // Persistence succeeds even if the realtime transport is briefly unavailable; GET recovers it.
    await this.gateway.emitLocation(saved.order, saved.point).catch(() => undefined);
    return saved.point;
  }
}
