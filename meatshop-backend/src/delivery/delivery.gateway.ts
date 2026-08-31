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

const UNIT_ROOM_PREFIX = 'unit:';

@WebSocketGateway({ namespace: '/delivery', cors: { origin: true, credentials: true } })
export class DeliveryGateway implements OnGatewayConnection {
  private readonly logger = new Logger(DeliveryGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(this.extractToken(client));
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) throw new Error('User not found');
      client.data.user = user;
    } catch (error) {
      this.logger.warn(`Delivery connection rejected: ${(error as Error).message}`);
      client.disconnect(true);
    }
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
    this.server
      ?.to(`${UNIT_ROOM_PREFIX}${order.unit_id}`)
      .volatile.emit('delivery:location.updated', {
        orderId: order.id,
        unitId: order.unit_id,
        deliveryPersonId: order.delivery_person_id,
        latitude: Number(tracking.latitude),
        longitude: Number(tracking.longitude),
        recordedAt: tracking.created_at,
      });
  }

  emitDeliveryChanged(order: Order): void {
    this.server?.to(`${UNIT_ROOM_PREFIX}${order.unit_id}`).emit('delivery:status.updated', {
      orderId: order.id,
      unitId: order.unit_id,
      status: order.status,
      deliveryStatus: order.delivery_status,
      deliveryPersonId: order.delivery_person_id,
      updatedAt: order.updated_at,
    });
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
