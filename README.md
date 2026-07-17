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

## ⚠️ 꼭 확인해주세요 - 데이터 보관 관련 (중요)

이 서버는 주문 데이터를 `data/kv-store.json` 파일에 저장합니다.

### 데이터가 초기화되는 이유
Render **Free 플랜**은 15분간 접속이 없으면 서버가 잠들고, 다시 깨어날 때
서버가 새로 시작되면서 `data` 폴더가 임시 디스크라 **초기화될 수 있습니다.**
(코드 에러가 아니라 Free 플랜의 구조적 한계입니다.)

### 근본 해결책 — Persistent Disk 연결 (강력 권장)
Render 대시보드에서 영구 디스크를 붙이면 서버가 재시작돼도 데이터가 보존됩니다.
1. Render 대시보드 → 해당 서비스 → 왼쪽 메뉴 **Disks** → **Add Disk**
2. Name: `data`, Mount Path: `/opt/render/project/src/data`, Size: 1GB
3. 저장하면 자동 재배포되고, 이후로는 데이터가 날아가지 않습니다.
   (Persistent Disk는 Render 유료 기능입니다. 월 소액으로 데이터 안전을 확보할 수 있습니다.)

### 3중 안전망 (이미 앱에 내장됨)
Persistent Disk를 붙이지 않더라도, 앱에는 데이터 손실을 막는 장치가 들어있습니다.
1. **서버 초기화 자동 감지·복구**: 서버가 비어있는데 화면엔 데이터가 있으면,
   화면 데이터를 지우지 않고 오히려 서버를 다시 채웁니다.
2. **브라우저 자동 백업**: 편집할 때마다 접속한 기기(브라우저)에도 자동 저장돼,
   서버가 죽어도 그 기기에서 새로고침하면 데이터가 살아납니다.
3. **수동 백업/복원 버튼**: 앱 상단의 `💾 백업`으로 언제든 JSON 파일을 내 컴퓨터에 저장하고,
   `📂 복원`으로 그 파일을 불러올 수 있습니다.
   → **매일 마감 전에 `💾 백업` 한 번 눌러두시는 것을 습관화하시길 권장합니다.**

### 관리자용 백업 URL (선택)
- 전체 데이터 조회: `https[]()://내주소.onrender.com/api/backup` (브라우저로 열면 JSON 다운로드 가능)

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
