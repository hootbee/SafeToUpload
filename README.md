# SafeToUpload

개인정보 점검 Chrome Extension + Nest.js 백엔드 프로젝트입니다.

## 프로젝트 구조
- `frontend/`: Chrome Extension 프론트엔드 (React + TypeScript + Vite)
- `server/`: 백엔드 API 서버 (Nest.js + Prisma + PostgreSQL)

## 실행 방식

### 1) 중앙 서버 연결 모드
프론트는 어디서 실행하든 중앙 백엔드 서버를 호출합니다.

프론트(`frontend/.env`):
```env
VITE_API_BASE_URL=http://서버IP:3270
```

백엔드(서버 컴퓨터에서 실행):
```bash
cd server
cp .env.example .env

# Docker Compose v1
docker-compose -f docker-compose.yml up -d --build

# Docker Compose v2
# docker compose -f docker-compose.yml up -d --build
```

서버 확인:
```bash
curl http://localhost:3270/health
```

### 2) 프론트 실행
```bash
cd frontend
npm install
npm run dev
```

## Chrome Extension 로드
1. `frontend`에서 빌드
```bash
npm run build
```
2. Chrome `chrome://extensions`
3. 개발자 모드 ON
4. 압축해제 로드
5. `frontend/dist` 선택

## 실행 모드 요약
- 중앙 서버 연결: `VITE_API_BASE_URL=http://서버IP:3270`

## 문서
- 백엔드 상세 문서: [`server/README.md`](./server/README.md)
