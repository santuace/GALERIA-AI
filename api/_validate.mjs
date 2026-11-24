// Revisa lo que manda el panel antes de guardarlo: solo campos conocidos y archivos propios.
import { localDir } from './_store.mjs';

const SITE_FILE = /^imagenes\/(?:(?:thumbs|posters|previews)\/)?[\w.-]+\.(?:webp|jpe?g|png|gif|mp4|webm)$/i;
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const RESERVED = new Set(['all', 'exploraciones', 'ocultas']);

function storeHost() {
  const id = (process.env.BLOB_READ_WRITE_TOKEN || '').split('_')[3] || (process.env.BLOB_STORE_ID || '').replace(/^store_/, '');
  return id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

// Archivo subido desde el panel (los únicos que el panel puede borrar)
export function isUploaded(u) {
  if (localDir()) return /^\/local-media\/[\w./-]+$/.test(u) && !u.includes('..');
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.host === storeHost() && url.pathname.startsWith('/media/') && !url.search && !/["'<>\s\\]/.test(u);
  } catch { return false; }
}

export class InvalidError extends Error {}
const fail = msg => { throw new InvalidError(msg); };

function text(v, max, label) {
  if (v == null) return '';
  if (typeof v !== 'string') fail(`${label}: tiene que ser texto.`);
  const t = v.trim();
  if (t.length > max) fail(`${label}: máximo ${max} caracteres.`);
  return t;
}
function file(v, label, optional) {
  if (!v && optional) return '';
  if (typeof v !== 'string' || !(SITE_FILE.test(v) || isUploaded(v))) fail(`${label}: archivo no permitido.`);
  return v;
}
function int(v, min, max, label) {
  if (!Number.isInteger(v) || v < min || v > max) fail(`${label}: número fuera de rango.`);
  return v;
}

export function validate(input) {
  if (!input || !Array.isArray(input.series) || !Array.isArray(input.pieces)) fail('Contenido incompleto.');
  if (input.series.length > 100) fail('Máximo 100 series.');
  if (input.pieces.length > 3000) fail('Máximo 3000 piezas.');

  const seriesIds = new Set();
  const series = input.series.map(s => {
    if (!ID.test(s?.id || '') || RESERVED.has(s.id)) fail('Serie con identificador inválido.');
    if (seriesIds.has(s.id)) fail(`Serie repetida: ${s.id}`);
    seriesIds.add(s.id);
    const name = text(s.name, 80, 'Nombre de serie');
    if (!name) fail('Hay una serie sin nombre.');
    return { id: s.id, name, description: text(s.description, 600, `Descripción de ${name}`) };
  });

  const ids = new Set();
  const pieces = input.pieces.map(p => {
    if (!ID.test(p?.id || '')) fail('Pieza con identificador inválido.');
    if (ids.has(p.id)) fail(`Pieza repetida: ${p.id}`);
    ids.add(p.id);
    if (p.type !== 'image' && p.type !== 'video') fail(`${p.id}: tipo inválido.`);
    const ser = p.series || null;
    if (ser && !seriesIds.has(ser)) fail(`${p.id}: la serie no existe.`);
    const color = /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#eeeeee';
    return {
      id: p.id, type: p.type, series: ser,
      tool: text(p.tool, 60, `${p.id}: herramienta`),
      year: p.year == null ? null : int(p.year, 1990, 2100, `${p.id}: año`),
      note: text(p.note, 2000, `${p.id}: nota`),
      prompt: text(p.prompt, 8000, `${p.id}: prompt`),
      hidden: p.hidden === true,
      src: file(p.src, `${p.id}: archivo`),
      thumb: file(p.thumb, `${p.id}: miniatura`),
      preview: p.type === 'video' ? file(p.preview, `${p.id}: preview`, true) : '',
      w: int(p.w, 1, 20000, `${p.id}: ancho`), h: int(p.h, 1, 20000, `${p.id}: alto`), color,
    };
  });
  return { version: 1, savedAt: new Date().toISOString(), series, pieces };
}

export const mediaOf = content => content.pieces.flatMap(p => [p.src, p.thumb, p.preview]).filter(u => u && isUploaded(u));
