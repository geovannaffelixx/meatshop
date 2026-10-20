import { getAllowedOrigins } from '../config/runtime-config';
import { assertTrackingAccess, isTrackable } from './services/tracking-policy';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { Order } from '../orders/entities/order.entity';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { User } from '../users/entities/user.entity';
import { DeliveryTracking } from './entities/delivery-tracking.entity';
import { DeliveryPerson } from './entities/delivery-person.entity';

const UNIT_ROOM_PREFIX = 'unit:';
const ORDER_ROOM_PREFIX = 'order:';
const allowedOrigins = getAllowedOrigins(process.env);

@WebSocketGateway({
  namespace: '/delivery',
  cors: { origin: allowedOrigins, credentials: true },
})
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(DeliveryGateway.name);
  private readonly expirations = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number; exp: number }>(
        this.extractToken(client),
      );
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user?.is_active) throw new Error('User not found or inactive');
      if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('Token expired');
      client.data.user = user;
      client.data.expiresAt = payload.exp * 1000;
      this.expirations.set(
        client.id,
        globalThis.setTimeout(
          () => client.disconnect(true),
          Math.min(2147483647, payload.exp * 1000 - Date.now()),
        ),
      );
    } catch (error) {
      this.logger.warn(`Delivery connection rejected: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  onModuleDestroy(): void {
    this.expirations.forEach((timer) => globalThis.clearTimeout(timer));
    this.expirations.clear();
  }

  handleDisconnect(client: Socket): void {
    globalThis.clearTimeout(this.expirations.get(client.id));
    this.expirations.delete(client.id);
  }

  @SubscribeMessage('delivery:subscribe-order')
  async subscribeToOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: number },
  ): Promise<{ orderId: number }> {
    const user = client.data.user as User | undefined;
    const orderId = Number(body?.orderId);
    if (!user || !Number.isInteger(orderId) || orderId <= 0) {
      throw new WsException('Invalid order subscription');
    }
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new WsException('Order not found');
    await this.assertCanTrackOrder(order, user);
    const orderRooms = [...client.rooms].filter((room) => room.startsWith(ORDER_ROOM_PREFIX));
    if (orderRooms.length >= 100 && !client.rooms.has(`${ORDER_ROOM_PREFIX}${orderId}`)) {
      throw new WsException('Too many subscriptions');
    }
    await client.join(`${ORDER_ROOM_PREFIX}${orderId}`);
    return { orderId };
  }

  @SubscribeMessage('delivery:unsubscribe-order')
  async unsubscribeFromOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: number },
  ): Promise<{ orderId: number }> {
    const orderId = Number(body?.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new WsException('Invalid order subscription');
    }
    await client.leave(`${ORDER_ROOM_PREFIX}${orderId}`);
    return { orderId };
  }

  @SubscribeMessage('delivery:subscribe')
  async subscribeToUnit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { unitId?: number },
  ): Promise<{ unitId: number }> {
    const user = client.data.user as User | undefined;
    const unitId = Number(body?.unitId);
    if (!user || !Number.isInteger(unitId) || unitId <= 0) {
      throw new WsException('Invalid delivery subscription');
    }

    try {
      const fresh = await this.userRepository.findOne({ where: { id: user.id } });
      if (!fresh?.is_active || client.data.expiresAt <= Date.now())
        throw new Error('Session unavailable');
      await this.unitAuthorizationService.assertHasPermission(
        fresh,
        unitId,
        UnitPermission.VIEW_DELIVERIES,
      );
    } catch {
      throw new WsException('Insufficient unit permissions');
    }

    for (const room of client.rooms) {
      if (room.startsWith(UNIT_ROOM_PREFIX)) await client.leave(room);
    }
    await client.join(`${UNIT_ROOM_PREFIX}${unitId}`);
    return { unitId };
  }

  async emitLocation(order: Order, tracking: DeliveryTracking): Promise<void> {
    const latestOrder = await this.orderRepository.findOne({ where: { id: order.id } });
    if (
      !latestOrder ||
      !isTrackable(latestOrder) ||
      latestOrder.tracking_revoked_at ||
      !latestOrder.tracking_consent_at ||
      tracking.created_at < latestOrder.tracking_consent_at ||
      latestOrder.delivery_person_id !== tracking.delivery_person_id
    )
      return;
    const sender = await this.deliveryPersonRepository.findOne({
      where: { id: latestOrder.delivery_person_id! },
    });
    if (!sender?.is_online || sender.status !== 'ACTIVE') return;
    const payload = {
      accuracy: tracking.accuracy == null ? null : Number(tracking.accuracy),
      capturedAt: tracking.captured_at ?? tracking.created_at,
      pointId: tracking.id,
      orderId: order.id,
      unitId: order.unit_id,
      deliveryPersonId: order.delivery_person_id,
      latitude: Number(tracking.latitude),
      longitude: Number(tracking.longitude),
      recordedAt: tracking.created_at,
    };
    await this.authorizedBroadcast(latestOrder, 'delivery:location.updated', payload);
  }

  emitDeliveryChanged(order: Order): void {
    const payload = {
      orderId: order.id,
      unitId: order.unit_id,
      status: order.status,
      deliveryStatus: order.delivery_status,
      deliveryPersonId: order.delivery_person_id,
      updatedAt: order.updated_at,
    };
    void this.authorizedBroadcast(order, 'delivery:status.updated', payload).catch(() =>
      this.logger.warn('Delivery status broadcast failed'),
    );
  }

  private async assertCanTrackOrder(order: Order, user: User): Promise<void> {
    try {
      const fresh = await this.userRepository.findOne({ where: { id: user.id } });
      if (!fresh) throw new Error('Account unavailable');
      await assertTrackingAccess(
        order,
        fresh,
        this.deliveryPersonRepository,
        this.unitAuthorizationService,
      );
    } catch {
      throw new WsException('Not authorized to track this order');
    }
  }

  private async authorizedBroadcast(order: Order, event: string, payload: unknown): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server
      .in([`${UNIT_ROOM_PREFIX}${order.unit_id}`, `${ORDER_ROOM_PREFIX}${order.id}`])
      .fetchSockets();
    await Promise.all(
      sockets.map(async (client) => {
        try {
          if (!client.data.expiresAt || client.data.expiresAt <= Date.now()) {
            client.disconnect(true);
            return;
          }
          const user = client.data.user as User | undefined;
          if (!user) throw new Error('Unauthenticated');
          await this.assertCanTrackOrder(order, user);
          client.emit(event, payload);
          if (!isTrackable(order)) await client.leave(`${ORDER_ROOM_PREFIX}${order.id}`);
        } catch {
          await client.leave(`${ORDER_ROOM_PREFIX}${order.id}`);
          await client.leave(`${UNIT_ROOM_PREFIX}${order.unit_id}`);
          client.emit('delivery:access.revoked', { orderId: order.id });
        }
      }),
    );
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const cookieHeader = client.handshake.headers.cookie ?? '';
    const accessCookie = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim().split('='))
      .find((parts) => parts[0] === 'access_token');

    if (!accessCookie?.[1]) throw new Error('Missing authentication token');
    return decodeURIComponent(accessCookie.slice(1).join('='));
  }
}
