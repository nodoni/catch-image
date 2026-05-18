// api/pixabay.js — Vercel 서버리스 함수 (안정화 버전)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  // OPTIONS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    q        = '',
    page     = '1',
    per_page = '20',
    order    = 'popular',
    type     = 'image',
  } = req.query;

  const key = process.env.PIXABAY_KEY;
  if (!key) {
    return res.status(500).json({ error: 'PIXABAY_KEY 환경변수가 없습니다.' });
  }

  const safePerPage = Math.min(Math.max(Number(per_page) || 20, 3), 30);
  const safePage    = Math.max(Number(page) || 1, 1);

  const baseUrl = type === 'video'
    ? 'https://pixabay.com/api/videos/'
    : 'https://pixabay.com/api/';

  const params = new URLSearchParams({
    key,
    q:          q || 'nature',
    page:       String(safePage),
    per_page:   String(safePerPage),
    order,
    safesearch: 'true',
  });
  if (type !== 'video') params.set('image_type', 'photo');

  const url = `${baseUrl}?${params}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'CatchImage/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('[pixabay] status:', upstream.status, text.slice(0, 200));
      return res.status(upstream.status).json({
        error: `Pixabay ${upstream.status}`,
        hits: [], totalHits: 0,
      });
    }

    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(502).json({ error: 'JSON 파싱 실패', hits: [], totalHits: 0 }); }

    return res.status(200).json(data);

  } catch (e) {
    console.error('[pixabay] fetch error:', e.message);
    return res.status(502).json({ error: e.message, hits: [], totalHits: 0 });
  }
}
