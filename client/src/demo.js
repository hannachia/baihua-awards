// Sample data used ONLY by the single-file preview (npm run build:single).
// It lets you click through the gallery, voting and comments without a server.
const base = [
  ['1', 'Li Wei', '春天的歌', 'singing', 128],
  ['2', 'Anna Jensen', 'Winter Wind', 'dance', 97],
  ['3', '陈小雨', '百花齐放', 'calligraphy-painting', 84],
  ['4', 'Mads Nielsen', 'Midnight Aria', 'singing', 63],
  ['5', '王明', '二胡独奏', 'other', 41],
  ['6', 'Copenhagen Dance Crew', 'Zodiac Parade', 'dance', 22]
];
const entries = base.map(([id, name, workTitle, category, voteCount]) => ({
  id, name, workTitle, category, voteCount, projectType: 'individual', organization: '', mediaType: 'demo'
}));
const voted = new Set();
const comments = {
  1: [{ id: 'c1', text: '太好听了，声音很有感染力！', author: 'zh***@example.cn', createdAt: '2026-10-20T10:00:00Z' }],
  2: [{ id: 'c2', text: 'Beautiful choreography!', author: 'an***@example.dk', createdAt: '2026-10-21T12:00:00Z' }]
};

export async function demoApi(path, { method = 'GET', body } = {}) {
  const json = (d, status = 200) => new Response(JSON.stringify(d), { status });
  const [p, qs] = path.split('?');
  const q = new URLSearchParams(qs || '');

  if (p === '/gallery') {
    let list = entries.filter((e) => !q.get('category') || e.category === q.get('category'));
    list = q.get('sort') === 'new' ? [...list].reverse() : [...list].sort((a, b) => b.voteCount - a.voteCount);
    return json({ votingOpen: true, entries: list });
  }
  let m = p.match(/^\/gallery\/(\w+)\/comments$/);
  if (m) {
    const id = m[1];
    if (method === 'POST') {
      const c = { id: 'n' + Date.now(), text: body.text, author: 'yo***@example.com', createdAt: new Date().toISOString() };
      comments[id] = [c, ...(comments[id] || [])];
      return json(c, 201);
    }
    return json(comments[id] || []);
  }
  m = p.match(/^\/gallery\/(\w+)\/vote$/);
  if (m) {
    const e = entries.find((x) => x.id === m[1]);
    if (method === 'POST' && !voted.has(e.id)) { voted.add(e.id); e.voteCount += 1; }
    if (method === 'DELETE' && voted.has(e.id)) { voted.delete(e.id); e.voteCount -= 1; }
    return json({ voteCount: e.voteCount, hasVoted: voted.has(e.id) });
  }
  m = p.match(/^\/gallery\/(\w+)$/);
  if (m) {
    const e = entries.find((x) => x.id === m[1]);
    return e ? json({ ...e, hasVoted: voted.has(e.id), votingOpen: true }) : json({ errors: ['Entry not found.'] }, 404);
  }
  if (p === '/viewers/request-code') return json({ ok: true });
  if (p === '/viewers/verify') return json({ token: 'demo', email: body.email });
  if (p === '/config') return json({ feeFen: 10000, currency: 'CNY', provider: 'mock' });
  if (p === '/entries' && method === 'POST') return json({ id: '6acce97f9ce33ea88ae48797', checkoutUrl: '#/pay/mock?entry=6acce97f9ce33ea88ae48797' }, 201);
  if (p === '/payments/mock/confirm') return json({ ok: true });
  if (p.startsWith('/payments/status/')) return json({ status: 'paid' });
  if (p === '/payments/retry') return json({ url: '#/pay/mock?entry=6acce97f9ce33ea88ae48797' });
  return json({ errors: ['Not available in the preview.'] }, 404);
}
