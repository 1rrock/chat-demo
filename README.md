# WebSocket Chat Demo

NestJS + Socket.IO 서버와 React 클라이언트를 사용한 채팅 애플리케이션입니다.

## 🌐 외부 접근 가능한 배포 방법

### 🚀 Railway 배포 (추천 - 무료)

1. **GitHub에 코드 푸시**
2. **Railway 사이트 접속**: https://railway.app
3. **GitHub로 로그인 후 프로젝트 연결**
4. **자동 배포 완료!**

Railway는 WebSocket을 완벽 지원하며 무료 티어가 있습니다.

### 🛠 Render 배포 (무료)

1. **GitHub에 코드 푸시**
2. **Render 사이트 접속**: https://render.com
3. **Blueprint로 배포**: `render.yaml` 파일 사용
4. **서버와 클라이언트 자동 배포**

### ⚡ Heroku 배포

```bash
# Heroku CLI 설치 후
heroku create your-chat-app
git push heroku main
```

## 🏠 로컬 Docker 배포 (내부망)

### 빠른 시작
```bash
# 프로젝트 루트에서 실행
docker-compose up -d --build
```

### 접속 방법
- **클라이언트**: http://서버IP (포트 80)
- **서버 API**: http://서버IP:3000

### Docker 명령어
```bash
# 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down

# 이미지 다시 빌드
docker-compose build --no-cache
```

## 🛠 개발 환경 실행 방법

### 1. 서버 실행
```bash
cd server
npm install
npm run start:dev
```
서버가 http://localhost:3000 에서 실행됩니다.

### 2. 클라이언트 실행 (새 터미널)
```bash
cd client
npm install
npm run dev
```
클라이언트가 http://localhost:5173 에서 실행됩니다.

## 🔧 환경 변수 설정

### 클라이언트 환경 변수 (.env)
```env
VITE_SERVER_URL=https://your-server-url.com
```

### 서버 환경 변수
```env
PORT=3000
NODE_ENV=production
```

## 🌐 외부 접근 설정

### 클라우드 배포의 특징:
1. **자동 HTTPS**: 대부분의 클라우드 플랫폼에서 자동 SSL 제공
2. **글로벌 CDN**: 전세계 어디서나 빠른 접속
3. **자동 스케일링**: 트래픽에 따른 자동 확장
4. **무료 티어**: Railway, Render 등에서 무료 사용 가능

### 배포 후 설정:
1. **서버 URL 확인**: 배포된 서버의 실제 URL을 클라이언트 환경변수에 설정
2. **CORS 검증**: 필요시 특정 도메인만 허용하도록 수정
3. **WebSocket 테스트**: 브라우저 개발자 도구에서 연결 확인

## 프로젝트 구조
```
ws-demo/
  server/                 # NestJS 서버
  client/                 # React 클라이언트 (Vite)
  docker-compose.yml      # 로컬 Docker 배포
  render.yaml            # Render 배포 설정
  Procfile              # Railway/Heroku 배포 설정
  vercel.json           # Vercel 설정 (제한적)
```

## WebSocket 연결 문제 해결

### 개선된 기능들:
1. **전송 방식 개선**: `polling` → `websocket` 순서로 연결 시도
2. **상세한 로깅**: 연결 상태와 오류를 실시간으로 확인 가능
3. **오류 처리**: 연결 실패 시 명확한 오류 메시지 표시
4. **UI 상태 관리**: 연결 상태에 따른 버튼 비활성화
5. **커스텀 Socket.IO 어댑터**: 서버 측 연결 설정 최적화
6. **동적 서버 URL**: 환경에 따른 자동 서버 URL 설정

### 연결 확인 방법:
1. 서버 실행 후 콘솔에서 "Socket.IO server ready for connections" 메시지 확인
2. 클라이언트에서 상태가 "연결됨"으로 변경되는지 확인
3. 브라우저 개발자 도구 콘솔에서 연결 로그 확인

## 패키지 설치 문제 해결

만약 `npm install` 시 패키지 버전 오류가 발생하면:

```bash
# 캐시 정리 후 재시도
npm cache clean --force
npm install

# 또는 yarn 사용
yarn install
```

## 사용 방법

1. 브라우저에서 배포된 URL 접속
2. 상태가 "연결됨"인지 확인
3. 닉네임과 채널명 입력 후 '입장' 버튼 클릭
4. 메시지 입력 후 Enter 키 또는 '보내기' 버튼으로 메시지 전송
5. 여러 브라우저 탭을 열어 같은 채널로 입장하면 실시간 채팅 가능

## 기능

- 실시간 채팅 (Socket.IO 기반)
- 채널(룸) 기반 채팅
- 입장/퇴장 시스템 메시지
- 연결 상태 표시 및 Socket ID 표시
- 자동 스크롤
- 연결 오류 처리 및 재연결
- 외부 접근 가능한 클라우드 배포

## 테스트 방법

전세계 어디서나 배포된 URL로 접속해서 실시간 채팅을 테스트해보세요!

## 주요 파일

### 서버
- `src/main.ts`: 애플리케이션 진입점, 동적 포트 설정
- `src/chat.gateway.ts`: Socket.IO 게이트웨이, 채팅 로직
- `src/socket-io.adapter.ts`: 커스텀 Socket.IO 어댑터
- `src/app.module.ts`: 애플리케이션 모듈
- `Dockerfile`: 서버 Docker 이미지 설정

### 클라이언트  
- `src/App.tsx`: React 메인 컴포넌트, 동적 서버 URL 설정
- `src/main.tsx`: React 애플리케이션 진입점
- `src/vite-env.d.ts`: 환경 변수 타입 정의
- `Dockerfile`: 클라이언트 Docker 이미지 설정
- `nginx.conf`: Nginx 웹서버 설정

### 배포
- `docker-compose.yml`: 로컬 Docker 컨테이너 오케스트레이션
- `render.yaml`: Render 클라우드 배포 설정
- `Procfile`: Railway/Heroku 배포 설정
- `vercel.json`: Vercel 배포 설정 (WebSocket 제한적)

## 트러블슈팅

### 클라우드 배포 관련
- 환경 변수 설정 확인: `VITE_SERVER_URL`, `PORT`
- 빌드 로그 확인: 각 플랫폼의 배포 로그 검토
- HTTPS 연결: 클라우드에서는 자동으로 HTTPS가 적용됨

### Docker 배포 관련
- 포트가 이미 사용 중인 경우: `sudo netstat -tulpn | grep :80`
- Docker 이미지 캐시 문제: `docker-compose build --no-cache`
- 컨테이너 로그 확인: `docker-compose logs -f [service_name]`

### WebSocket 연결 실패
- 서버가 먼저 실행되고 있는지 확인
- 포트 3000이 다른 프로세스에서 사용 중인지 확인: `lsof -i :3000`
- 브라우저 개발자 도구 Network 탭에서 Socket.IO 요청 확인

### CORS 에러
- 서버의 `origin` 설정과 클라이언트의 `withCredentials` 설정 확인
- 클라우드 환경에서는 자동으로 올바른 URL이 설정됨

### 연결은 되는데 이벤트가 안 옴
- 이벤트 이름과 페이로드 키 확인
- `socket.off` 누락 여부 점검
- 서버 콘솔에서 join/chat 이벤트 로그 확인

### 방 브로드캐스트가 안 됨
- `client.join(room)` 호출 여부 확인
- 같은 room 이름으로 입장했는지 확인
