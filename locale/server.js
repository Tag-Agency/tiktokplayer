// Piccolo server locale: risolve i link TikTok (anche vm.tiktok.com) e serve il player.
// Nessuna dipendenza: richiede solo Node.js 18 o superiore.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const ALLOWED = /(^|\.)tiktok\.com$/i;

function extractId(u) {
  const m = u.match(/\/(?:video|photo|v)\/(\d{8,})/) || u.match(/[?&](?:item_id|share_item_id)=(\d{8,})/);
  return m ? m[1] : null;
}

async function resolve(input, chain = []) {
  let url = input.trim();
  if (/^\d{8,}$/.test(url)) return { id: url, finalUrl: null, via: 'id' };
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  let current = new URL(url);
  for (let i = 0; i < 8; i++) {
    if (!ALLOWED.test(current.hostname)) throw new Error('Il link non è di TikTok');
    const id = extractId(current.href);
    if (id) return { id, finalUrl: current.href, via: 'url' };
    const res = await fetch(current.href, { redirect: 'manual', headers: { 'User-Agent': UA } });
    const loc = res.headers.get('location');
    chain.push({ url: current.href, status: res.status, location: loc });
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current); continue; }
    // Nessun redirect: cerco l'id nell'HTML della pagina
    const html = await res.text();
    const m = html.match(/"(?:itemId|id)":"(\d{15,})"/) || html.match(/\/video\/(\d{15,})/);
    if (m) return { id: m[1], finalUrl: current.href, via: 'html' };
    break;
  }
  throw new Error('Non riesco a trovare l\'ID del video in questo link');
}

async function probe(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const t = await r.text();
    return { url, status: r.status, length: t.length, snippet: t.replace(/\s+/g, ' ').slice(0, 300) };
  } catch (e) { return { url, error: String(e.cause || e.message) }; }
}

async function debug(input) {
  const out = { input, node: process.version, chain: [] };
  try {
    Object.assign(out, await resolve(input, out.chain));
    const target = out.finalUrl || `https://www.tiktok.com/@/video/${out.id}`;
    out.oembed = await probe('https://www.tiktok.com/oembed?url=' + encodeURIComponent(target));
    out.embedV2 = await probe(`https://www.tiktok.com/embed/v2/${out.id}`);
    out.playerV1 = await probe(`https://www.tiktok.com/player/v1/${out.id}`);
  } catch (e) { out.error = String(e.message) + (e.cause ? ' / ' + e.cause : ''); }
  return out;
}

async function oembed(id, finalUrl) {
  try {
    const target = finalUrl || `https://www.tiktok.com/@/video/${id}`;
    const r = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(target), { headers: { 'User-Agent': UA } });
    if (!r.ok) return {};
    const j = await r.json();
    return { title: j.title, author: j.author_name, authorUrl: j.author_url, thumbnail: j.thumbnail_url };
  } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname === '/api/debug') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end(JSON.stringify(await debug(u.searchParams.get('url') || ''), null, 2));
  }
  if (u.pathname === '/api/resolve') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const { id, finalUrl } = await resolve(u.searchParams.get('url') || '');
      const meta = await oembed(id, finalUrl);
      res.end(JSON.stringify({ ok: true, id, finalUrl, ...meta }));
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }
  const file = path.join(__dirname, 'public', u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
  if (!file.startsWith(path.join(__dirname, 'public'))) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
    res.setHeader('Content-Type', (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  TikTok Player pronto su  http://localhost:${PORT}\n  (Ctrl+C per fermarlo)\n`);
});
