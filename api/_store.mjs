// Dónde vive el contenido: Vercel Blob en producción, una carpeta en local (scripts/dev.mjs).
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const PATHNAME = 'content/current.json';
const seed = JSON.parse(readFileSync(new URL('../content/seed.json', import.meta.url), 'utf8'));

export const localDir = () => (!process.env.VERCEL && process.env.MIDMUT_LOCAL_DIR) || null;
export class ConflictError extends Error {}

const normEtag = t => String(t || '').replace(/^W\//, '').replace(/"/g, '');

// → { content, etag, fresh }. etag null = todavía no se guardó nada (contenido inicial).
export async function readContent() {
  const dir = localDir();
  if (dir) {
    try {
      const text = await readFile(path.join(dir, PATHNAME), 'utf8');
      return { content: JSON.parse(text), etag: createHash('md5').update(text).digest('hex'), fresh: true };
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      return { content: seed, etag: null, fresh: true };
    }
  }

  const { head, BlobNotFoundError } = await import('@vercel/blob');
  let meta;
  try { meta = await head(PATHNAME); }
  catch (e) {
    if (e instanceof BlobNotFoundError) return { content: seed, etag: null, fresh: true };
    throw e;
  }
  // El archivo público pasa por CDN (hasta ~60 s de caché). head() siempre da la versión real:
  // comparamos y reintentamos para no entregar una versión vieja.
  let content;
  for (let i = 0; i < 3; i++) {
    const url = new URL(meta.url);
    url.searchParams.set('v', i === 0 ? normEtag(meta.etag) : `${normEtag(meta.etag)}-${Date.now()}`);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Blob respondió ${res.status}`);
    content = await res.json();
    const lag = new Date(meta.uploadedAt).getTime() - Date.parse(content.savedAt);
    if (normEtag(res.headers.get('etag')) === normEtag(meta.etag) || lag < 15000)
      return { content, etag: meta.etag, fresh: true };
    await new Promise(r => setTimeout(r, 400));
  }
  return { content, etag: meta.etag, fresh: false };
}

// Guarda solo si nadie guardó otra versión en el medio. Devuelve el etag nuevo.
export async function writeContent(content, etag, previous) {
  const body = JSON.stringify(content);
  const backupName = `content/backups/${content.savedAt.replace(/[:.]/g, '-')}.json`;
  const dir = localDir();
  if (dir) {
    const now = await readContent();
    if (now.etag !== etag) throw new ConflictError();
    await mkdir(path.join(dir, 'content/backups'), { recursive: true });
    if (etag) await writeFile(path.join(dir, backupName), JSON.stringify(previous));
    await writeFile(path.join(dir, PATHNAME), body);
    return createHash('md5').update(body).digest('hex');
  }

  const { put, BlobPreconditionFailedError } = await import('@vercel/blob');
  const opts = { access: 'public', contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60 };
  if (etag) await put(backupName, JSON.stringify(previous), opts);
  try {
    // Primera vez: sin allowOverwrite, falla si alguien ya creó el archivo.
    const res = await put(PATHNAME, body, etag ? { ...opts, ifMatch: etag } : opts);
    return res.etag;
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError || /already exists/i.test(e.message)) throw new ConflictError();
    throw e;
  }
}

export async function deleteMedia(urls) {
  if (!urls.length) return;
  const dir = localDir();
  if (dir) {
    for (const u of urls) await rm(path.join(dir, u.replace(/^\/local-media\//, 'media/')), { force: true });
    return;
  }
  const { del } = await import('@vercel/blob');
  for (let i = 0; i < urls.length; i += 100) await del(urls.slice(i, i + 100));
}
