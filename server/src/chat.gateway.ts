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

interface JoinPayload {
  room: string;
  nickname: string;
}

interface ChatPayload {
  room: string;
  text: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private nickBySocket = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const nick = this.nickBySocket.get(client.id);
    if (nick) {
      // 모든 룸에 시스템 메시지 (해당 소켓이 속한 방 목록)
      for (const room of client.rooms) {
        if (room !== client.id) {
          this.server.to(room).emit('system', `${nick} 님이 퇴장했습니다.`);
        }
      }
      this.nickBySocket.delete(client.id);
    }
  }

  @SubscribeMessage('join')
  onJoin(@MessageBody() data: JoinPayload, @ConnectedSocket() client: Socket) {
    console.log(`Join request: ${data.nickname} -> ${data.room}`);
    client.join(data.room);
    this.nickBySocket.set(client.id, data.nickname);

    client.emit('joined', { room: data.room });
    this.server
      .to(data.room)
      .emit('system', `${data.nickname} 님이 입장했습니다.`);
  }

  @SubscribeMessage('chat')
  onChat(@MessageBody() msg: ChatPayload, @ConnectedSocket() client: Socket) {
    const nickname = this.nickBySocket.get(client.id) ?? '익명';
    const payload = { nickname, text: msg.text, ts: Date.now() };
    console.log(`Chat message: ${nickname} in ${msg.room}: ${msg.text}`);
    this.server.to(msg.room).emit('chat', payload);
  }
}
