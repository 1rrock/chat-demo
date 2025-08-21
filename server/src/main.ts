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

  await app.listen(3000, '0.0.0.0'); // 모든 네트워크 인터페이스에서 접근 허용
  console.log(`Server running on http://0.0.0.0:3000`);
  console.log(`Socket.IO server ready for connections`);
}
bootstrap();
