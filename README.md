# SafeToUpload

개인정보 점검 Chrome Extension 프론트엔드 와이어프레임 프로젝트입니다.

## 디렉토리 구조

- `frontend/`: React + TypeScript + Vite + Chrome Extension(MV3)
- `server/`: 추후 Nest.js 서버 구현용(현재 placeholder)

## 요구 사항

- Node.js 20+
- npm 10+
- Chrome 브라우저

## 설치

```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/frontend
npm install
```

## 개발 서버 실행

```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/frontend
npm run dev
```

- 브라우저에서 `http://localhost:5173` 접속
- 이 경로에서는 사이드패널 UI를 일반 웹 형태로 먼저 확인 가능

## 프로덕션 빌드

```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/frontend
npm run build
```

- 결과물 생성 위치: `frontend/dist`

## Chrome 확장 로드 방법

1. 위 빌드 명령으로 `frontend/dist` 생성
2. Chrome에서 `chrome://extensions` 진입
3. 우측 상단 `개발자 모드` 활성화
4. `압축해제된 확장 프로그램 로드` 클릭
5. `/Users/leejunhyeong/Desktop/my-project/safetoupload/frontend/dist` 선택

## 동작 확인 체크리스트

1. 확장 아이콘 클릭 시 Side Panel 열림
2. 홈에서 `AI 모델 불러오기` 후 진행률 표시
3. `분석 시작` 클릭 시 단계 진행 후 리포트 표시
4. 하단 탭(Home / History / Settings) 전환
5. 인스타그램/X/페이스북 페이지 우하단 `개인정보 점검` 플로팅 버튼 표시
6. 텍스트 드래그 후 우클릭 시 `올려도댐? 개인정보 점검` 메뉴 표시
