import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Railway 헬스체크를 위한 엔드포인트 추가
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'websocket-chat-server'
    };
  }

  @Get('socket.io/health')
  getSocketHealth() {
    return {
      status: 'ok',
      socketio: 'ready',
      timestamp: new Date().toISOString()
    };
  }
}
