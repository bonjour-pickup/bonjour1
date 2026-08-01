const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Supabase 연결 ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('⚠️  환경변수 SUPABASE_URL / SUPABASE_SERVICE_KEY 가 설정되지 않았습니다.');
  console.error('    Render 대시보드 → Environment 에서 두 값을 등록해주세요.');
}

const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_KEY || 'placeholder', {
  auth: { persistSession: false }
});

const TABLE = 'kv_store';

// --- 로그인 인증 ---
// Render 환경변수에 STAFF_PASSWORD(직원 공용 비밀번호), AUTH_SECRET(토큰 서명용 임의 문자열)을 등록하세요.
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || '';
const AUTH_SECRET = process.env.AUTH_SECRET || '';

if (!STAFF_PASSWORD) {
  console.error('⚠️  환경변수 STAFF_PASSWORD 가 설정되지 않았습니다. 로그인 기능이 막혀있어요.');
}
if (!AUTH_SECRET) {
  console.error('⚠️  환경변수 AUTH_SECRET 이 설정되지 않았습니다. 토큰 서명이 안전하지 않아요.');
}

// 토큰 = "만료시각.서명" 형태. 서버 재시작과 무관하게 검증 가능 (메모리에 세션 저장 안 함)
function signToken(expiry) {
  const h = crypto.createHmac('sha256', AUTH_SECRET || 'insecure-default');
  h.update(String(expiry));
  return expiry + '.' + h.digest('hex');
}
function makeToken() {
  const expiry = Date.now() + 5 * 365 * 24 * 60 * 60 * 1000; // 5년 (사실상 로그아웃 전까지 유지)
  return signToken(expiry);
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const idx = token.indexOf('.');
  if (idx < 0) return false;
  const expiry = token.slice(0, idx);
  const expected = signToken(Number(expiry));
  if (expected !== token) return false;
  if (Number(expiry) < Date.now()) return false;
  return true;
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/login  body: { password }
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!STAFF_PASSWORD) {
    return res.status(500).json({ error: '서버에 비밀번호가 설정되지 않았어요' });
  }
  if (password !== STAFF_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  res.json({ token: makeToken() });
});

// GET /api/kv/:key -> { key, value }
app.get('/api/kv/:key', requireAuth, async (req, res) => {
  const key = req.params.key;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'not found' });
    res.json({ key, value: data.value });
  } catch (e) {
    console.error('GET 실패:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

// PUT /api/kv/:key  body: { value: string }
app.put('/api/kv/:key', requireAuth, async (req, res) => {
  const key = req.params.key;
  const { value } = req.body || {};
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a string' });
  }
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
    res.json({ key, value });
  } catch (e) {
    console.error('PUT 실패:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/health', (req, res) => res.send('ok'));

// 전체 백업 조회 (관리용, 로그인 필요)
app.get('/api/backup', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLE).select('key, value');
    if (error) throw error;
    const out = {};
    (data || []).forEach(row => { out[row.key] = row.value; });
    res.json(out);
  } catch (e) {
    console.error('backup 실패:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

// 전체 저장소 일괄 복원 (관리용, 로그인 필요)
app.put('/api/restore', requireAuth, async (req, res) => {
  const incoming = req.body || {};
  if (typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'invalid backup format' });
  }
  try {
    const rows = Object.entries(incoming).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    res.json({ ok: true, keys: rows.length });
  } catch (e) {
    console.error('restore 실패:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.listen(PORT, () => {
  console.log(`봉주르후르츠 픽업 서버 실행 중 (Supabase): http://localhost:${PORT}`);
});
