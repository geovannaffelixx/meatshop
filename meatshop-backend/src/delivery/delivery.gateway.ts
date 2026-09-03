import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
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
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

@WebSocketGateway({ namespace: '/delivery', cors: { origin: allowedOrigins, credentials: true } })
export class DeliveryGateway implements OnGatewayConnection {
  private readonly logger = new Logger(DeliveryGateway.name);

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
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(this.extractToken(client));
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user?.is_active) throw new Error('User not found or inactive');
      client.data.user = user;
    } catch (error) {
      this.logger.warn(`Delivery connection rejected: ${(error as Error).message}`);
      client.disconnect(true);
    }
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
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new WsException('Order not found');
    await this.assertCanTrackOrder(order, user);
    await client.join(`${ORDER_ROOM_PREFIX}${orderId}`);
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
      await this.unitAuthorizationService.assertHasPermission(
        user,
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

  emitLocation(order: Order, tracking: DeliveryTracking): void {
    const payload = {
      orderId: order.id,
      unitId: order.unit_id,
      deliveryPersonId: order.delivery_person_id,
      latitude: Number(tracking.latitude),
      longitude: Number(tracking.longitude),
      recordedAt: tracking.created_at,
    };
    this.server
      ?.to(`${UNIT_ROOM_PREFIX}${order.unit_id}`)
      .volatile.emit('delivery:location.updated', payload);
    this.server
      ?.to(`${ORDER_ROOM_PREFIX}${order.id}`)
      .volatile.emit('delivery:location.updated', payload);
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
    this.server?.to(`${UNIT_ROOM_PREFIX}${order.unit_id}`).emit('delivery:status.updated', payload);
    this.server?.to(`${ORDER_ROOM_PREFIX}${order.id}`).emit('delivery:status.updated', payload);
  }

  private async assertCanTrackOrder(order: Order, user: User): Promise<void> {
    if (order.client_id === user.id) return;
    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: { user_id: user.id },
      select: { id: true },
    });
    if (deliveryPerson?.id === order.delivery_person_id) return;
    try {
      await this.unitAuthorizationService.assertHasPermission(
        user,
        order.unit_id,
        UnitPermission.VIEW_DELIVERIES,
      );
    } catch {
      throw new WsException('Not authorized to track this order');
    }
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
