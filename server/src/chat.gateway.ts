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
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private nickBySocket = new Map<string, string>();
  private roomUserCounts = new Map<string, number>(); // 방별 사용자 수 추적

  handleConnection(client: Socket) {
    // 간단한 연결 로그만 남기기
    console.log(`Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const nick = this.nickBySocket.get(client.id);
    if (nick) {
      // 효율적인 방 정리
      for (const room of client.rooms) {
        if (room !== client.id) {
          this.server.to(room).emit('system', `${nick} 님이 퇴장했습니다.`);
          this.updateRoomUserCount(room, -1);
        }
      }
      this.nickBySocket.delete(client.id);
    }
    console.log(`Disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  onJoin(@MessageBody() data: JoinPayload, @ConnectedSocket() client: Socket) {
    // 이전 방에서 나가기 (메모리 효율성)
    const currentNick = this.nickBySocket.get(client.id);
    if (currentNick) {
      for (const room of client.rooms) {
        if (room !== client.id && room !== data.room) {
          client.leave(room);
          this.updateRoomUserCount(room, -1);
        }
      }
    }

    client.join(data.room);
    this.nickBySocket.set(client.id, data.nickname);
    this.updateRoomUserCount(data.room, 1);

    client.emit('joined', { room: data.room });
    this.server
      .to(data.room)
      .emit('system', `${data.nickname} 님이 입장했습니다.`);
  }

  @SubscribeMessage('chat')
  onChat(@MessageBody() msg: ChatPayload, @ConnectedSocket() client: Socket) {
    const nickname = this.nickBySocket.get(client.id) ?? '익명';

    // 메시지 길이 제한 (비용 절약)
    if (msg.text.length > 1000) {
      client.emit('system', '메시지가 너무 깁니다. (최대 1000자)');
      return;
    }

    const payload = { nickname, text: msg.text, ts: Date.now() };
    this.server.to(msg.room).emit('chat', payload);
  }

  private updateRoomUserCount(room: string, delta: number) {
    const current = this.roomUserCounts.get(room) || 0;
    const newCount = Math.max(0, current + delta);

    if (newCount === 0) {
      this.roomUserCounts.delete(room); // 빈 방 정리
    } else {
      this.roomUserCounts.set(room, newCount);
    }
  }

  // 주기적으로 비어있는 방 정리 (메모리 절약)
  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }
}
