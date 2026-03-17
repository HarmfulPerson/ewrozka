import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface RoomParticipant {
  socketId: string;
  userId: number;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: (process.env.APP_CORS_ORIGIN || 'http://localhost:3000,https://ewrozka.dev')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
  namespace: '/video',
})
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VideoGateway.name);
  private rooms = new Map<string, RoomParticipant[]>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove from all rooms
    this.rooms.forEach((participants, roomToken) => {
      const index = participants.findIndex((p) => p.socketId === client.id);
      if (index !== -1) {
        participants.splice(index, 1);
        // Notify others in room
        client.to(roomToken).emit('user-left', { socketId: client.id });
        
        if (participants.length === 0) {
          this.rooms.delete(roomToken);
        }
      }
    });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomToken: string; userId: number; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomToken, userId, username } = data;

    // Join socket.io room
    client.join(roomToken);

    // Add to participants
    if (!this.rooms.has(roomToken)) {
      this.rooms.set(roomToken, []);
    }

    const participants = this.rooms.get(roomToken)!;
    participants.push({
      socketId: client.id,
      userId,
      username,
    });

    // Notify existing participants
    client.to(roomToken).emit('user-joined', {
      socketId: client.id,
      userId,
      username,
    });

    // Send list of existing participants to new user
    const others = participants.filter((p) => p.socketId !== client.id);
    client.emit('room-participants', { participants: others });

    this.logger.log(`User ${username} (${userId}) joined room ${roomToken}`);

    return { success: true, participants: others };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { roomToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomToken } = data;

    const participants = this.rooms.get(roomToken);
    if (participants) {
      const index = participants.findIndex((p) => p.socketId === client.id);
      if (index !== -1) {
        participants.splice(index, 1);
      }
    }

    client.to(roomToken).emit('user-left', { socketId: client.id });
    client.leave(roomToken);

    return { success: true };
  }

  @SubscribeMessage('webrtc-offer')
  handleOffer(
    @MessageBody() data: { to: string; offer: any; roomToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.to).emit('webrtc-offer', {
      from: client.id,
      offer: data.offer,
    });
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @MessageBody() data: { to: string; answer: any; roomToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.to).emit('webrtc-answer', {
      from: client.id,
      answer: data.answer,
    });
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { to: string; candidate: any; roomToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.to).emit('webrtc-ice-candidate', {
      from: client.id,
      candidate: data.candidate,
    });
  }
}
