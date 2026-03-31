# 1. 프론트엔드 (React) 빌드 단계
FROM node:22-alpine AS builder

WORKDIR /app/client
# 캐싱을 위해 패키지 파일만 먼저 복사
COPY client/package*.json ./
RUN npm install

# 나머지 클라이언트 소스 복사 및 빌드 진행
COPY client/ ./
RUN npm run build

# 2. 백엔드 (Node.js) 실행 단계
FROM node:22-alpine AS runner

WORKDIR /app
# builder 단계에서 생성된 React 빌드 결과물을 복사
COPY --from=builder /app/client/dist ./client/dist

# 백엔드 서버 구축
WORKDIR /app/server
# 캐싱을 위해 패키지 파일만 먼저 복사 (production 의존성만 설치)
COPY server/package*.json ./
RUN npm install --production
# 서버 소스 복사
COPY server/ ./

# 구글 클라우드 런에서 환경변수로 내부 8080 포트를 찾아 연결함
ENV PORT=8080
EXPOSE 8080

# 구동 명령어
CMD ["node", "index.js"]
