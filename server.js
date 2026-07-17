const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'kv-store.json');

// 데이터 폴더/파일이 없으면 생성
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}', 'utf8');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('저장소 읽기 실패, 빈 저장소로 시작합니다:', e.message);
    return {};
  }
}

function writeStore(store) {
  // 임시 파일에 먼저 쓴 뒤 교체 → 쓰는 도중 중단돼도 원본이 깨지지 않음
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/kv/:key -> { key, value }
app.get('/api/kv/:key', (req, res) => {
  const store = readStore();
  const key = req.params.key;
  if (!(key in store)) {
    return res.status(404).json({ error: 'not found' });
  }
  res.json({ key, value: store[key] });
});

// PUT /api/kv/:key  body: { value: string }
app.put('/api/kv/:key', (req, res) => {
  const key = req.params.key;
  const { value } = req.body || {};
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a string' });
  }
  const store = readStore();
  store[key] = value;
  writeStore(store);
  res.json({ key, value });
});

app.get('/health', (req, res) => res.send('ok'));

// 전체 저장소 백업 조회 (관리용)
app.get('/api/backup', (req, res) => {
  res.json(readStore());
});

// 전체 저장소 일괄 복원 (기존 데이터에 덮어쓰기 병합)
app.put('/api/restore', (req, res) => {
  const incoming = req.body || {};
  if (typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'invalid backup format' });
  }
  const store = readStore();
  Object.assign(store, incoming);
  writeStore(store);
  res.json({ ok: true, keys: Object.keys(store).length });
});

app.listen(PORT, () => {
  console.log(`봉주르후르츠 픽업 서버 실행 중: http://localhost:${PORT}`);
});
