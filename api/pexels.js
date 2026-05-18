// api/pexels.js — Vercel 서버리스 함수

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.PEXELS_KEY;
  if (!key) {
    return res.status(500).json({ error: 'PEXELS_KEY 환경변수가 없습니다.' });
  }

  const {
    q        = 'nature',
    page     = '1',
    per_page = '20',
    type     = 'image',   // 'image' | 'video'
  } = req.query;

  const safePerPage = Math.min(Math.max(Number(per_page) || 20, 3), 30);
  const safePage    = Math.max(Number(page) || 1, 1);

  const baseUrl = type === 'video'
    ? `https://api.pexels.com/videos/search`
    : `https://api.pexels.com/v1/search`;

  const params = new URLSearchParams({
    query:    q,
    page:     String(safePage),
    per_page: String(safePerPage),
  });

  try {
    const upstream = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'Authorization': key,
        'User-Agent': 'CatchImage/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('[pexels] status:', upstream.status, text.slice(0, 200));
      return res.status(upstream.status).json({
        error: `Pexels ${upstream.status}`,
        photos: [], videos: [], total_results: 0,
      });
    }

    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(502).json({ error: 'JSON 파싱 실패', photos: [], total_results: 0 }); }

    return res.status(200).json(data);

  } catch (e) {
    console.error('[pexels] fetch error:', e.message);
    return res.status(502).json({ error: e.message, photos: [], videos: [], total_results: 0 });
  }
}
