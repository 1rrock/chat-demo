import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SocketIOAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // 모든 origin 허용 (프로덕션에서는 특정 도메인으로 제한 권장)
    credentials: true,
  });

  app.useWebSocketAdapter(new SocketIOAdapter(app));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // 환경변수 포트 지원
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Socket.IO server ready for connections`);
}
bootstrap();
