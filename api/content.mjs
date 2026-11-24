import { guardWrite, isAuthed, json } from './_auth.mjs';
import { ConflictError, deleteMedia, readContent, writeContent } from './_store.mjs';
import { InvalidError, mediaOf, validate } from './_validate.mjs';

const TAG = 'midmut-content';

// GET /api/content          → script público que usa la web (sin piezas ocultas)
// GET /api/content?admin=1  → todo, para el panel
export async function GET(request) {
  if (new URL(request.url).searchParams.has('admin')) {
    if (!isAuthed(request)) return json({ error: 'Sesión vencida. Vuelve a entrar.' }, 401);
    const { content, etag, fresh } = await readContent();
    if (!fresh) return json({ error: 'El último guardado se está propagando. Prueba de nuevo en un minuto.' }, 503);
    return json({ content, etag });
  }

  const headers = { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' };
  try {
    const { content, fresh } = await readContent();
    const out = { version: content.version, series: content.series, pieces: content.pieces.filter(p => !p.hidden) };
    return new Response(`window.MIDMUT_CONTENT = ${JSON.stringify(out)};`, {
      headers: {
        ...headers,
        'vercel-cdn-cache-control': fresh ? 'max-age=900, stale-while-revalidate=86400' : 'max-age=10',
        'vercel-cache-tag': TAG,
      },
    });
  } catch (e) {
    console.error('content GET', e);
    // La web sigue funcionando con contenido.js
    return new Response('/* contenido no disponible: se usa contenido.js */', { headers: { ...headers, 'cache-control': 'no-store' } });
  }
}

// PUT /api/content  { content, etag }  → guardar y publicar
export async function PUT(request) {
  const denied = guardWrite(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const next = validate(body.content);
    const etag = body.etag || null;
    const prev = await readContent();
    if (prev.etag !== etag) throw new ConflictError();
    if (!prev.fresh) return json({ error: 'El guardado anterior se está propagando. Prueba de nuevo en un minuto.' }, 503);

    const newEtag = await writeContent(next, etag, prev.content);

    // Desde acá ya está guardado: lo que sigue no puede hacer fallar el pedido.
    const warnings = [];
    const keep = new Set(mediaOf(next));
    try { await deleteMedia(mediaOf(prev.content).filter(u => !keep.has(u))); }
    catch (e) { console.error('borrado de archivos', e); warnings.push('Algunos archivos eliminados no se pudieron borrar del almacenamiento.'); }
    if (process.env.VERCEL) {
      try { const { dangerouslyDeleteByTag } = await import('@vercel/functions'); await dangerouslyDeleteByTag(TAG); }
      catch (e) { console.error('purga de caché', e); warnings.push('La web puede tardar hasta 15 minutos en mostrar los cambios.'); }
    }
    return json({ ok: true, etag: newEtag, content: next, warnings });
  } catch (e) {
    if (e instanceof ConflictError) return json({ error: 'Hay una versión más nueva guardada desde otra pestaña o dispositivo. Recarga el panel para verla.' }, 409);
    if (e instanceof InvalidError || e instanceof SyntaxError) return json({ error: e.message }, 400);
    console.error('content PUT', e);
    return json({ error: 'No se pudo guardar. Prueba de nuevo.' }, 500);
  }
}
