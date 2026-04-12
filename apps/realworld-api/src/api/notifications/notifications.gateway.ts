import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: {
    origin: (process.env.APP_CORS_ORIGIN || 'http://localhost:3000,https://ewrozka.dev')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService,
  ) {}

  afterInit() {
    this.notificationsService.setGateway({
      emitPendingCount: (wizardId, count) => {
        this.server.to(`wizard:${wizardId}`).emit('pending_count', { count });
      },
      emitAdminPendingVideoCount: (count) => {
        this.server.to('admin').emit('pending_video_count', { count });
      },
      emitNotification: (userId, notification) => {
        this.server.to(`user:${userId}`).emit('notification', notification);
      },
    });
    this.logger.log('NotificationsGateway initialized');
  }

  /** Klient uwierzytelnia się po połączeniu, dołącza do swoich pokojów. */
  @SubscribeMessage('auth')
  async handleAuth(
    @MessageBody() data: { token: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const payload = await this.authService.verifyAccessToken(data.token);
      const userId = String(payload.id);
      if (!userId) throw new Error('brak userId');

      const roles = (payload as { roles?: string[] }).roles ?? [];

      // Każdy użytkownik dołącza do pokoju user:X (powiadomienia ogólne)
      client.join(`user:${userId}`);

      // Wróżka – pokój wizard:X, licznik wniosków
      if (roles.includes('wizard')) {
        client.join(`wizard:${userId}`);
        this.logger.debug(`Socket ${client.id} authenticated as wizard ${userId}`);
        const { total } = await this.notificationsService.getPendingCount(userId);
        client.emit('pending_count', { count: total });
      }

      // Admin – pokój admin, licznik filmików do akceptacji
      if (roles.includes('admin')) {
        client.join('admin');
        this.logger.debug(`Socket ${client.id} authenticated as admin`);
        const videoCount = await this.notificationsService.getAdminPendingVideoCount();
        client.emit('pending_video_count', { count: videoCount });
      }

      // Wyślij liczbę nieprzeczytanych powiadomień
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });

      return { success: true };
    } catch {
      client.emit('auth_error', { message: 'Nieprawidłowy token' });
      return { success: false };
    }
  }
}
