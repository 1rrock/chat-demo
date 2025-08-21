# Railway 배포 설정

이 저장소는 WebSocket 채팅 애플리케이션입니다.

## 배포 방법:

1. 서버 배포: 루트 디렉토리에서 자동 배포됩니다.
2. 클라이언트 배포: client 폴더를 별도 서비스로 배포하세요.

## 서버 환경변수:
- NODE_ENV=production
- PORT=(Railway 자동 할당)

## 클라이언트 환경변수:
- VITE_SERVER_URL=[서버 URL]
