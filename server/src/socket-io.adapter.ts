import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketIOAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true, // 모든 origin 허용
        credentials: true,
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true,
    });

    console.log('Socket.IO server created on port:', port);
    return server;
  }
}
