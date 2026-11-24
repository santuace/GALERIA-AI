import { clearCookie, configured, isAuthed, json, passwordMatches, sameOrigin, sessionCookie } from './_auth.mjs';
import { localDir } from './_store.mjs';

// ¿Hay sesión?
export async function GET(request) {
  return json({ configured: configured(), authed: isAuthed(request), uploads: localDir() ? 'local' : 'blob' });
}

// Entrar
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  if (!configured()) return json({ error: 'El panel todavía no tiene contraseña configurada.' }, 503);
  const body = await request.json().catch(() => ({}));
  if (!passwordMatches(body?.password)) {
    await new Promise(r => setTimeout(r, 1200)); // frena los intentos a ciegas
    return json({ error: 'Contraseña incorrecta.' }, 401);
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request) });
}

// Salir
export async function DELETE(request) {
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie(request) });
}
