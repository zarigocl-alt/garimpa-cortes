import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const KEY = process.env.YOUTUBE_API_KEY;
const PORT = process.env.PORT || 3000;
const cache = new Map(); // economiza a cota da API (30 min)

const norm = h => String(h || '').trim().toLowerCase().replace(/^#+/, '');
const secs = iso => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ''); return m ? (+m[1]||0)*3600 + (+m[2]||0)*60 + (+m[3]||0) : 0; };

async function yt(endpoint, params) {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + endpoint);
  Object.entries({ ...params, key: KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Erro na API do YouTube');
  return j;
}

async function garimpar(tag, order) {
  const ck = tag + '|' + order;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.t < 30 * 60e3) return hit.data;

  const ids = [];
  let pageToken = '';
  for (let i = 0; i < 2; i++) { // até 100 candidatos
    const s = await yt('search', { part: 'id', q: '#' + tag, type: 'video', videoDuration: 'short', order, maxResults: 50, ...(pageToken && { pageToken }) });
    s.items.forEach(x => ids.push(x.id.videoId));
    pageToken = s.nextPageToken;
    if (!pageToken) break;
  }
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const d = await yt('videos', { part: 'snippet,statistics,contentDetails', id: ids.slice(i, i + 50).join(',') });
    for (const v of d.items) {
      if (secs(v.contentDetails.duration) > 180) continue; // só Shorts
      const text = (v.snippet.title + ' ' + v.snippet.description).toLowerCase();
      const re = new RegExp('#' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}_])', 'u');
      const tagged = re.test(text) || (v.snippet.tags || []).map(norm).includes(tag);
      if (!tagged) continue; // REGRA ABSOLUTA: só com a hashtag
      const st = v.statistics;
      out.push({
        platform: 'youtube', id: v.id, url: 'https://www.youtube.com/shorts/' + v.id,
        profile: v.snippet.channelTitle, title: v.snippet.title, date: v.snippet.publishedAt.slice(0, 10),
        thumb: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || '',
        views: st.viewCount != null ? +st.viewCount : null,
        likes: st.likeCount != null ? +st.likeCount : null,
        comments: st.commentCount != null ? +st.commentCount : null,
        shares: null, hashtags: [tag]
      });
    }
  }
  cache.set(ck, { t: Date.now(), data: out });
  return out;
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/garimpar') {
    res.setHeader('Content-Type', 'application/json');
    try {
      if (!KEY) throw new Error('Falta configurar YOUTUBE_API_KEY no servidor.');
      const tag = norm(u.searchParams.get('tag'));
      if (!tag) throw new Error('Informe uma hashtag.');
      const order = u.searchParams.get('order') === 'date' ? 'date' : 'viewCount';
      res.end(JSON.stringify({ ok: true, videos: await garimpar(tag, order) }));
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); }
    return;
  }
  if (u.pathname !== '/' && u.pathname !== '/index.html') { res.statusCode = 404; return res.end('Não encontrado'); }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  fs.createReadStream(path.join(dir, 'index.html')).pipe(res);
}).listen(PORT, () => console.log('GARIMPA CORTES rodando na porta ' + PORT));
