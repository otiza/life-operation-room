import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SESSION_COOKIE, SessionService } from '../auth/session.service.js';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly sessionService: SessionService) {}

  async handleConnection(client: Socket) {
    const cookieHeader = client.handshake.headers.cookie ?? '';
    const token = this.readCookie(cookieHeader, SESSION_COOKIE);
    const user = await this.sessionService.resolveUserFromSessionToken(token);
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.userId = user.id;
    await client.join(this.userRoom(user.id));
  }

  @SubscribeMessage('notifications.subscribe')
  subscribe(@ConnectedSocket() client: Socket, @MessageBody() _body: unknown) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return { ok: false };
    return { ok: true, room: this.userRoom(userId) };
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private readCookie(cookieHeader: string, name: string): string | undefined {
    const parts = cookieHeader.split(';').map((part) => part.trim());
    for (const part of parts) {
      if (part.startsWith(`${name}=`)) {
        return decodeURIComponent(part.slice(name.length + 1));
      }
    }
    return undefined;
  }
}
