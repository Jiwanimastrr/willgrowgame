import { io } from 'socket.io-client';

// 로컬 테스트용, 실제 배포 시에는 환경변수로 설정
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // 필요할 때 수동 연결
});
