import { io } from 'socket.io-client';

// 배포(PROD) 환경일 경우 현재 브라우저의 도메인(루트)을 사용하고, 개발(DEV) 환경일 경우 로컬 백엔드로 접속합니다.
const SOCKET_URL = import.meta.env.PROD 
  ? undefined  // undefined로 설정 시 Socket.io 측에서 현재 창의 origin을 동적으로 파악합니다.
  : 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // 필요할 때 수동 연결
});
