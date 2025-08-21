import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SocketIOAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 - 클라이언트 도메인 추가
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://chat-demo-production-83c1.up.railway.app',
      'https://splendid-clarity-production-efad.up.railway.app',
      // 모든 Railway 서브도메인 허용
      /^https:\/\/.*\.up\.railway\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  });

  app.useWebSocketAdapter(new SocketIOAdapter(app));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌐 CORS enabled for Railway domains`);
}
bootstrap();
