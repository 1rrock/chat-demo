import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketIOAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://chat-demo-production-83c1.up.railway.app',
          'https://splendid-clarity-production-efad.up.railway.app',
          // 모든 Railway 서브도메인 허용
          /^https:\/\/.*\.up\.railway\.app$/
        ],
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    console.log('Socket.IO server created on port:', port);
    console.log('CORS enabled for Railway domains');
    return server;
  }
}
