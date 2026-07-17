# 봉주르후르츠 픽업 체크 (자체 서버 버전)

Claude 아티팩트 대신 직접 Render.com에 배포해서 훨씬 빠르게 접속할 수 있는 버전입니다.
화면과 기능은 기존 Claude 버전과 완전히 동일하고, 데이터 저장 방식만 서버 파일로 바뀌었습니다.

## 로컬에서 테스트하기
```bash
npm install
npm start
```
브라우저에서 http://localhost:3000 접속

## Render.com 배포 방법

1. **GitHub에 올리기**
   - 이 폴더를 새 GitHub 저장소로 push (예: `bonjour-pickup`)

2. **Render.com에서 새 Web Service 생성**
   - https://dashboard.render.com → New → Web Service
   - 방금 만든 GitHub 저장소 선택
   - 설정값:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free (테스트용) 또는 Starter(안정적 상시 운영용)

3. **배포 완료 후 생성되는 주소**
   - `https://bonjour-pickup-xxxx.onrender.com` 같은 형태의 URL이 생성됩니다
   - 이 링크를 직원 단톡방에 공유하면 끝입니다 (로그인/설치 불필요)

## ⚠️ 꼭 확인해주세요 - 데이터 보관 관련

이 서버는 주문 데이터를 `data/kv-store.json` 파일에 저장합니다.

- **Free 플랜**: 서비스를 재배포(코드 업데이트 후 재배포)하면 파일이 초기화될 수 있습니다.
  평소 사용(직원 접속, 자동 슬립 후 재시작)으로는 데이터가 지워지지 않지만,
  코드를 다시 배포할 때는 데이터가 날아갈 수 있어 **주의가 필요**합니다.
- 데이터를 확실히 보존하려면 Render의 **Persistent Disk**(유료 애드온)를 `data` 폴더에 연결하는 것을 권장합니다.
  (Render 대시보드 → 서비스 → Disks → Add Disk → Mount Path: `/opt/render/project/src/data`)
- 또는 매일 마감 후 노쇼 기록만이라도 별도로 백업해두시는 걸 권장합니다.

## 구조
```
bonjour-pickup/
  server.js       # Express 서버 (key-value API 제공)
  package.json
  public/
    index.html    # 픽업 체크 앱 (기존 Claude 버전과 동일한 화면/기능)
  data/            # 실행 시 자동 생성 (주문/노쇼 데이터 저장, git에는 포함 안 됨)
```

## 앱이 서버와 통신하는 방식
`public/index.html` 안의 `window.storage.get/set`이 내부적으로
`/api/kv/:key` 엔드포인트를 호출하도록 되어 있습니다.
- 저장: `PUT /api/kv/orders:2026-07-17` (body: `{ "value": "[...]" }`)
- 조회: `GET /api/kv/orders:2026-07-17`

기능을 더 추가하고 싶으면 Claude에게 "bonjour-pickup 서버에 ○○ 기능 추가해줘"라고 요청하시면 됩니다.
