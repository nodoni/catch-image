// api/pixabay.js — Vercel 서버리스 함수
// 브라우저에서 /api/pixabay?q=자연&page=1 로 호출하면
// 이 파일이 서버에서 Pixabay에 대신 요청하고 결과를 돌려줍니다

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { q = '', page = 1, per_page = 20, order = 'popular', type = 'image' } = req.query;
  const safePerPage = Math.min(Number(per_page), 30);
  const key = process.env.PIXABAY_KEY;

  if (!key) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
  }

  // 이미지 또는 동영상 URL 선택
  const baseUrl = type === 'video'
    ? 'https://pixabay.com/api/videos/'
    : 'https://pixabay.com/api/';

  const params = new URLSearchParams({
    key,
    q,
    page,
    per_page: safePerPage,
    order,
    safesearch: 'true',
    ...(type !== 'video' && { image_type: 'photo' }),
  });

  try {
    const upstream = await fetch(`${baseUrl}?${params}`);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Pixabay 오류: ' + upstream.status });
    }
    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: '서버 오류: ' + e.message });
  }
}
