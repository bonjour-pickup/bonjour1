const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Supabase 연결 ---
// Render 환경변수에 SUPABASE_URL, SUPABASE_SERVICE_KEY 를 등록해야 합니다.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('⚠️  환경변수 SUPABASE_URL / SUPABASE_SERVICE_KEY 가 설정되지 않았습니다.');
  console.error('    Render 대시보드 → Environment 에서 두 값을 등록해주세요.');
}

const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_KEY || 'placeholder', {
  auth: { persistSession: false }
});

const TABLE = 'kv_store'; // key(text, PK), value(text) 컬럼을 가진 테이블

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/kv/:key -> { key, value }
app.get('/api/kv/:key', async (req, res) => {
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
app.put('/api/kv/:key', async (req, res) => {
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

// 전체 백업 조회 (관리용)
app.get('/api/backup', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`봉주르후르츠 픽업 서버 실행 중 (Supabase): http://localhost:${PORT}`);
});
