// Sesión del panel: una sola contraseña (variable ADMIN_PASSWORD en Vercel).
// La cookie va firmada con una clave derivada de esa contraseña, así que
// cambiar la contraseña cierra todas las sesiones abiertas.
import { createHash, createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE = 'midmut_admin';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 días
export const MIN_PASSWORD = 12;

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const configured = () => (process.env.ADMIN_PASSWORD || '').length >= MIN_PASSWORD;

let cached;
function key() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!cached || cached.pw !== pw) cached = { pw, key: scryptSync(pw, 'midmut-admin-session-v1', 32) };
  return cached.key;
}
const sign = value => createHmac('sha256', key()).update(value).digest('base64url');
const sha = value => createHash('sha256').update(value).digest();

export function passwordMatches(input) {
  return typeof input === 'string' && timingSafeEqual(sha(input), sha(process.env.ADMIN_PASSWORD));
}

const cookieAttrs = request =>
  `Path=/; HttpOnly; SameSite=Strict${new URL(request.url).protocol === 'https:' || process.env.VERCEL ? '; Secure' : ''}`;

export function sessionCookie(request) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${MAX_AGE}; ${cookieAttrs(request)}`;
}
export const clearCookie = request => `${COOKIE}=; Max-Age=0; ${cookieAttrs(request)}`;

export function isAuthed(request) {
  if (!configured()) return false;
  const raw = (request.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  const [exp, mac] = (raw ? raw.slice(COOKIE.length + 1) : '').split('.');
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(mac), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Los pedidos que escriben tienen que venir de la propia web.
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try { return !!origin && new URL(origin).host === host; } catch { return false; }
}

// Devuelve una Response de error, o null si el pedido puede seguir.
export function guardWrite(request) {
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  if (!isAuthed(request)) return json({ error: 'Sesión vencida. Vuelve a entrar.' }, 401);
  return null;
}
