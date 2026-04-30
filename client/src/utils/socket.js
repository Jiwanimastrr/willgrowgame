import { io } from 'socket.io-client';

// 배포(PROD) 환경일 경우 현재 브라우저의 도메인(루트)을 사용하고, 개발(DEV) 환경일 경우 로컬 백엔드로 접속합니다.
const SOCKET_URL = import.meta.env.PROD 
  ? undefined  // undefined로 설정 시 Socket.io 측에서 현재 창의 origin을 동적으로 파악합니다.
  : 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // 필요할 때 수동 연결
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000, // 서버와 동일하게 60초 설정
  transports: ['websocket', 'polling'], // 웹소켓 우선 연결
});

export const getPlayerId = () => {
  let pid = localStorage.getItem('willgrow_player_id');
  if (!pid) {
    pid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('willgrow_player_id', pid);
  }
  return pid;
};
