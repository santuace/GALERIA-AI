// Prepara cada archivo en el navegador: miniatura, versión para ver en grande,
// primer cuadro y preview liviano de los videos. Así la web sigue cargando rápido.
const THUMB_W = 640, FULL_MAX = 2400, PREVIEW_W = 540, PREVIEW_SECONDS = 8;

const canvasOf = (src, w, h) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, 0, 0, w, h);
  return c;
};
const fit = (w, h, maxW, maxH = Infinity) => {
  const k = Math.min(1, maxW / w, maxH / h);
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
};
// WebP si el navegador lo genera (Safari no), si no JPG con fondo blanco
async function encode(canvas, quality) {
  const webp = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
  if (webp && webp.type === 'image/webp') return webp;
  const flat = document.createElement('canvas'); flat.width = canvas.width; flat.height = canvas.height;
  const ctx = flat.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, flat.width, flat.height); ctx.drawImage(canvas, 0, 0);
  return new Promise((res, rej) => flat.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar la imagen.')), 'image/jpeg', quality));
}
function averageColor(src) {
  const c = canvasOf(src, 1, 1);
  const [r, g, b] = c.getContext('2d').getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
}
const once = (el, ok, ms = 20000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('El archivo tardó demasiado en abrirse.')), ms);
  el.addEventListener(ok, () => { clearTimeout(t); res(); }, { once: true });
  el.addEventListener('error', () => { clearTimeout(t); rej(new Error('Este navegador no puede leer el video. Conviértelo a MP4 (H.264).')); }, { once: true });
});

async function prepareImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error('No se pudo leer la imagen. Usa JPG, PNG o WebP.'); }
  const { width: w, height: h } = bmp;
  const [fw, fh] = fit(w, h, FULL_MAX, FULL_MAX);
  const [tw, th] = fit(w, h, THUMB_W);
  // Los GIF se suben tal cual para no perder la animación
  const full = file.type === 'image/gif' ? file : await encode(canvasOf(bmp, fw, fh), 0.9);
  const thumb = await encode(canvasOf(bmp, tw, th), 0.8);
  const color = averageColor(bmp); bmp.close();
  return { type: 'image', full, thumb, preview: null, w: fw, h: fh, color };
}

async function recordPreview(video) {
  const mime = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
    .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime || !HTMLCanvasElement.prototype.captureStream) return null;
  let [w, h] = fit(video.videoWidth, video.videoHeight, PREVIEW_W);
  w -= w % 2; h -= h % 2; if (w < 2 || h < 2) return null;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rec = new MediaRecorder(canvas.captureStream(24), { mimeType: mime, videoBitsPerSecond: 900_000 });
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const stopped = new Promise(r => { rec.onstop = r; });
  video.currentTime = 0; await once(video, 'seeked');
  const seconds = Math.min(PREVIEW_SECONDS, video.duration || PREVIEW_SECONDS);
  const draw = setInterval(() => ctx.drawImage(video, 0, 0, w, h), 1000 / 24);
  try {
    ctx.drawImage(video, 0, 0, w, h); rec.start(); await video.play();
    await new Promise(r => setTimeout(r, seconds * 1000));
  } finally { clearInterval(draw); video.pause(); if (rec.state !== 'inactive') rec.stop(); }
  await stopped;
  const type = mime.split(';')[0];
  const blob = new Blob(chunks, { type });
  return blob.size > 2000 ? blob : null;
}

async function prepareVideo(file, onStep) {
  const url = URL.createObjectURL(file);
  const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, preload: 'auto' });
  try {
    const ready = once(video, 'loadeddata'); video.src = url; await ready;
    if (!video.videoWidth) throw new Error('El video no tiene imagen.');
    const seeked = once(video, 'seeked'); video.currentTime = Math.min(0.1, (video.duration || 1) / 2); await seeked;
    const [tw, th] = fit(video.videoWidth, video.videoHeight, THUMB_W);
    const thumb = await encode(canvasOf(video, tw, th), 0.8);
    const color = averageColor(video);
    const w = video.videoWidth, h = video.videoHeight;
    let full = file;
    if (file.type === 'video/quicktime') full = new Blob([file], { type: 'video/mp4' });
    let preview = null;
    if (file.size <= 1.5 * 1024 * 1024) preview = full; // ya es liviano
    else { onStep('Creando preview (dura lo mismo que el video, hasta 8 s)…'); preview = await recordPreview(video).catch(() => null); }
    return { type: 'video', full, thumb, preview, w, h, color };
  } finally { URL.revokeObjectURL(url); video.removeAttribute('src'); video.load(); }
}

export const prepare = (file, onStep) =>
  file.type.startsWith('video/') ? prepareVideo(file, onStep)
  : file.type.startsWith('image/') ? prepareImage(file)
  : Promise.reject(new Error('Formato no soportado.'));

export const extOf = blob => ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' })[blob.type];
