// Servidor local: sirve la web y ejecuta /api sin Vercel. Guarda en .local/ (no se publica).
//   node scripts/dev.mjs   → http://localhost:5173  y  http://localhost:5173/admin/
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT || 5173);
process.env.MIDMUT_LOCAL_DIR ||= path.join(ROOT, '.local');
process.env.ADMIN_PASSWORD ||= 'solo-para-local-123'; // solo para este servidor local
const LOCAL = process.env.MIDMUT_LOCAL_DIR;
const { guardWrite, json } = await import('../api/_auth.mjs');

const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' };
const { headers: rules } = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(ROOT, 'vercel.json'), 'utf8'));

async function serveFile(req, res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) || /(^|\/)\.(?!local)/.test(path.relative(ROOT, file))) { res.writeHead(404).end(); return; }
  let target = file, st = await stat(target).catch(() => null);
  if (st?.isDirectory()) { target = path.join(target, 'index.html'); st = await stat(target).catch(() => null); }
  if (!st?.isFile()) { res.writeHead(404).end('No existe'); return; }
  const type = TYPES[path.extname(target).slice(1).toLowerCase()] || 'application/octet-stream';
  const head = { 'content-type': /^(text|application\/json)/.test(type) ? type + '; charset=utf-8' : type, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' };
  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (m) {
    const start = +m[1], end = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
    if (start > end) { res.writeHead(416).end(); return; }
    res.writeHead(206, { ...head, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
    createReadStream(target, { start, end }).pipe(res); return;
  }
  res.writeHead(200, { ...head, 'content-length': st.size });
  createReadStream(target).pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    for (const r of rules) if (new RegExp(`^${r.source}$`).test(url.pathname)) for (const h of r.headers) res.setHeader(h.key, h.value);
    if (url.pathname.startsWith('/api/')) {
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const request = new Request(url, { method: req.method, headers: req.headers, ...(hasBody ? { body: Readable.toWeb(req), duplex: 'half' } : {}) });
      let response;
      if (url.pathname === '/api/local-upload' && req.method === 'PUT') {
        const p = url.searchParams.get('path') || '';
        response = guardWrite(request);
        if (!response && !/^media\/(full|thumbs|previews)\/[a-z0-9-]+\.\w+$/.test(p)) response = json({ error: 'Ruta inválida' }, 400);
        if (!response) {
          await mkdir(path.dirname(path.join(LOCAL, p)), { recursive: true });
          await writeFile(path.join(LOCAL, p), Buffer.from(await request.arrayBuffer()));
          response = json({ url: '/local-media/' + p.slice('media/'.length) });
        }
      } else {
        const name = url.pathname.slice(5);
        if (!/^[a-z]+$/.test(name)) { res.writeHead(404).end(); return; }
        const mod = await import(`../api/${name}.mjs`).catch(() => null);
        const fn = mod?.[req.method];
        response = fn ? await fn(request) : json({ error: 'No existe' }, mod ? 405 : 404);
      }
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const p = decodeURIComponent(url.pathname);
    if (p.startsWith('/local-media/')) return await serveFile(req, res, path.join(LOCAL, 'media'), p.slice('/local-media/'.length));
    await serveFile(req, res, ROOT, p);
  } catch (e) { console.error(e); if (!res.headersSent) res.writeHead(500); res.end(); }
}).listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));
