import { handleUpload } from '@vercel/blob/client';
import { guardWrite, json } from './_auth.mjs';

// El archivo va directo del navegador a Vercel Blob; acá solo se firma el permiso.
const ALLOWED = /^media\/(?:full|thumbs|previews)\/[a-z0-9][a-z0-9-]*\.(?:webp|jpg|png|gif|mp4|webm)$/;

export async function POST(request) {
  const denied = guardWrite(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (body?.type !== 'blob.generate-client-token') return json({ error: 'Pedido no válido.' }, 400);
    const result = await handleUpload({
      body, request,
      onBeforeGenerateToken: async pathname => {
        if (!ALLOWED.test(pathname)) throw new Error('Nombre de archivo no permitido.');
        return {
          allowedContentTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'],
          maximumSizeInBytes: 250 * 1024 * 1024,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return json(result);
  } catch (e) {
    console.error('upload', e);
    return json({ error: 'No se pudo autorizar la subida.' }, 400);
  }
}
