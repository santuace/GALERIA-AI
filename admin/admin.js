import { prepare, extOf } from '/admin/media.js';

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
// Rutas "imagenes/…" son de la web; las subidas ya son absolutas
const asset = u => /^(https:|\/)/.test(u) ? u : '/' + u;

let saved = null, etag = null, uploadsMode = 'blob';
let data = null;            // lo que se está editando
let section = 'all';        // all | exploraciones | ocultas | id de serie
let selected = new Set();
let busyUploads = 0, saving = false;
let drag = null;            // { kind:'piece'|'series', ids }

// ── API ──
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: opts.body ? { 'content-type': 'application/json' } : undefined });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Error ${res.status}`), { status: res.status });
  return body;
}
function status(msg, bad = false) { $('status').textContent = msg; $('status').classList.toggle('bad', bad); }
function show(view) { for (const v of ['loading', 'login', 'app']) $(v).hidden = v !== view; }

function ask(text, { input, ok = 'Aceptar' } = {}) {
  const d = $('dialog'), i = $('dialogInput');
  $('dialogText').textContent = text; $('dialogOk').textContent = ok;
  i.hidden = input === undefined; i.required = input !== undefined; i.value = input ?? '';
  d.returnValue = 'cancel'; d.showModal();
  if (!i.hidden) i.focus();
  return new Promise(r => d.addEventListener('close', () =>
    r(d.returnValue === 'ok' ? (input === undefined ? true : i.value.trim()) : null), { once: true }));
}
// Enter dentro del cuadro confirma (por defecto el navegador usa el primer botón, Cancelar)
$('dialogInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) $('dialog').close('ok'); } });

// ── Estado ──
const dirty = () => data && JSON.stringify(data) !== JSON.stringify(saved);
const inSection = (p, s = section) => s === 'all' ? true : s === 'ocultas' ? p.hidden : s === 'exploraciones' ? !p.series : p.series === s;
const visible = () => data.pieces.filter(p => inSection(p));
const picked = () => data.pieces.filter(p => selected.has(p.id));
const seriesOf = id => data.series.find(s => s.id === id);

function load(body) {
  saved = clone(body.content); data = clone(body.content); etag = body.etag;
  if (!['all', 'exploraciones', 'ocultas'].includes(section) && !seriesOf(section)) section = 'all';
  selected = new Set([...selected].filter(id => data.pieces.some(p => p.id === id)));
}
async function start() {
  try {
    const s = await api('/api/session'); uploadsMode = s.uploads;
    if (!s.authed) {
      show('login');
      if (!s.configured) $('loginError').textContent = 'Falta configurar la contraseña (ADMIN_PASSWORD, 12 caracteres o más) en Vercel.';
      else $('password').focus();
      return;
    }
    // Si la sesión venció con cambios sin guardar, se conserva lo editado
    if (!data) load(await api('/api/content?admin=1'));
    show('app'); render();
  } catch (e) { show('loading'); $('loading').firstElementChild.textContent = e.message; }
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginError').textContent = '';
  const btn = e.submitter || e.target.querySelector('button'); btn.disabled = true;
  try { await api('/api/session', { method: 'POST', body: JSON.stringify({ password: $('password').value }) }); $('password').value = ''; await start(); }
  catch (err) { $('loginError').textContent = err.message; }
  finally { btn.disabled = false; }
});
$('logout').addEventListener('click', async () => {
  if (busyUploads) return status('Espera a que terminen las subidas.', true);
  if (dirty() && !await ask('Hay cambios sin guardar. ¿Salir igual?', { ok: 'Salir' })) return;
  await api('/api/session', { method: 'DELETE' }).catch(() => {});
  data = saved = null; location.reload();
});

$('save').addEventListener('click', async () => {
  if (saving || busyUploads) return;
  const snapshot = clone(data); saving = true; renderTop(); status('Guardando…');
  try {
    const r = await api('/api/content', { method: 'PUT', body: JSON.stringify({ content: snapshot, etag }) });
    // Si seguiste editando mientras guardaba, esos cambios quedan pendientes
    const edited = JSON.stringify(data) !== JSON.stringify(snapshot);
    etag = r.etag; saved = clone(r.content); if (!edited) data = clone(r.content);
    saving = false; render();
    status(r.warnings?.length ? r.warnings.join(' ') : edited ? 'Publicado. Hay cambios nuevos sin guardar.' : 'Publicado. Ya está en la web.', !!r.warnings?.length);
  } catch (e) {
    saving = false; renderTop(); status(e.message, true);
    if (e.status === 401) { show('login'); $('loginError').textContent = 'La sesión venció. Entra de nuevo: tus cambios siguen acá.'; }
  }
});
$('discard').addEventListener('click', async () => {
  if (!await ask('¿Descartar todos los cambios sin guardar?', { ok: 'Descartar' })) return;
  data = clone(saved); selected.clear();
  if (!['all', 'exploraciones', 'ocultas'].includes(section) && !seriesOf(section)) section = 'all';
  render(); status('Cambios descartados.');
});
window.addEventListener('beforeunload', e => { if (dirty() || busyUploads) e.preventDefault(); });

// ── Dibujar ──
function render() { renderTop(); renderSide(); renderWork(); renderEditor(); }
function renderTop() {
  const d = dirty();
  $('save').disabled = !d || saving || busyUploads > 0; $('discard').disabled = !d || saving || busyUploads > 0;
  if (saving) return;
  if (busyUploads) status(`Subiendo ${busyUploads} ${busyUploads === 1 ? 'archivo' : 'archivos'}… espera para guardar.`);
  else status(d ? 'Cambios sin guardar.' : '');
}

function navButton(id, name) {
  const b = el('button', { type: 'button', className: 'nav' + (section === id ? ' on' : '') },
    el('span', { textContent: name }), el('span', { textContent: data.pieces.filter(p => inSection(p, id)).length }));
  if (section === id) b.setAttribute('aria-current', 'true');
  b.addEventListener('click', () => { section = id; selected.clear(); render(); });
  // soltar piezas encima = cambiar de serie
  if (id !== 'all' && id !== 'ocultas') {
    b.addEventListener('dragover', e => { if (drag?.kind === 'piece') { e.preventDefault(); e.stopPropagation(); b.classList.add('over'); } });
    b.addEventListener('dragleave', () => b.classList.remove('over'));
    b.addEventListener('drop', e => {
      if (drag?.kind !== 'piece') return;
      e.preventDefault(); e.stopPropagation();
      const ids = new Set(drag.ids); drag = null;
      data.pieces.forEach(p => { if (ids.has(p.id)) p.series = id === 'exploraciones' ? null : id; });
      selected.clear(); render();
    });
  }
  return b;
}
function renderSide() {
  $('sections').replaceChildren(navButton('all', 'Todo'), navButton('exploraciones', 'Exploraciones'), navButton('ocultas', 'Ocultas'));
  $('series').replaceChildren(...data.series.map(s => {
    const li = el('li', { draggable: true }, navButton(s.id, s.name));
    li.addEventListener('dragstart', e => { drag = { kind: 'series', ids: [s.id] }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); });
    li.addEventListener('dragend', () => { drag = null; });
    li.addEventListener('dragover', e => { if (drag?.kind === 'series') { e.preventDefault(); li.classList.add('before'); } });
    li.addEventListener('dragleave', () => li.classList.remove('before'));
    li.addEventListener('drop', e => {
      if (drag?.kind !== 'series') return; e.preventDefault();
      const from = data.series.findIndex(x => x.id === drag.ids[0]); drag = null;
      if (data.series[from] === s) return renderSide();
      const [m] = data.series.splice(from, 1); data.series.splice(data.series.indexOf(s), 0, m); render();
    });
    return li;
  }));
}

function renderWork() {
  const ser = seriesOf(section), list = visible();
  $('seriesForm').hidden = !ser;
  if (ser) { $('seriesName').value = ser.name; $('seriesDesc').value = ser.description; }
  $('title').textContent = ser ? ser.name : { all: 'Todo', exploraciones: 'Exploraciones', ocultas: 'Ocultas' }[section];
  $('count').textContent = `${list.length} ${list.length === 1 ? 'pieza' : 'piezas'}`;
  $('dropHint').textContent = ser ? `Se agregan al principio de "${ser.name}"` : 'Se agregan al principio de Exploraciones';
  $('empty').hidden = list.length > 0; $('selectAll').hidden = !list.length;
  $('grid').replaceChildren(...list.map(card));
  renderSelection();
}
function label(p) { return `${p.type === 'video' ? 'Video' : 'Imagen'} ${p.id}`; }
function card(p) {
  const img = el('img', { src: asset(p.thumb), alt: '', loading: 'lazy', decoding: 'async' });
  const pick = el('input', { type: 'checkbox', className: 'pick' }); pick.setAttribute('aria-label', `Seleccionar ${label(p)}`);
  const c = el('div', { className: 'card', draggable: true, tabIndex: 0 }, img, pick);
  c.dataset.id = p.id; c.setAttribute('role', 'button'); c.setAttribute('aria-label', `Editar ${label(p)}`);
  c.style.background = p.color;
  if (p.hidden) c.append(el('span', { className: 'tag', textContent: 'Oculta' }));
  if (p.type === 'video') c.append(el('span', { className: 'tag tr', textContent: 'Video' }));
  c.classList.toggle('hid', p.hidden);

  pick.addEventListener('click', e => e.stopPropagation());
  pick.addEventListener('change', () => { pick.checked ? selected.add(p.id) : selected.delete(p.id); renderSelection(); renderEditor(); });
  const open = e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) { selected.has(p.id) ? selected.delete(p.id) : selected.add(p.id); }
    else selected = new Set([p.id]);
    renderSelection(); renderEditor();
  };
  c.addEventListener('click', open);
  c.addEventListener('keydown', e => { if (e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(e); } });
  c.addEventListener('dragstart', e => {
    if (!selected.has(p.id)) { selected = new Set([p.id]); renderSelection(); renderEditor(); }
    drag = { kind: 'piece', ids: [...selected] }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); c.classList.add('drag');
  });
  c.addEventListener('dragend', () => { drag = null; c.classList.remove('drag'); });
  c.addEventListener('dragover', e => { if (drag?.kind === 'piece') { e.preventDefault(); c.classList.add('before'); } });
  c.addEventListener('dragleave', () => c.classList.remove('before'));
  c.addEventListener('drop', e => {
    if (drag?.kind !== 'piece') return; e.preventDefault(); c.classList.remove('before');
    const ids = new Set(drag.ids); drag = null;
    if (!ids.has(p.id)) { moveBefore(ids, p.id); render(); }
  });
  return c;
}
function renderSelection() {
  document.querySelectorAll('.card').forEach(c => {
    const on = selected.has(c.dataset.id); c.classList.toggle('sel', on); c.querySelector('.pick').checked = on;
  });
  $('selectNone').hidden = !selected.size;
}

// ── Ordenar ──
// Mueve las piezas `ids` justo antes de `targetId` (null = al final de la sección)
function moveBefore(ids, targetId) {
  const moving = data.pieces.filter(p => ids.has(p.id)), rest = data.pieces.filter(p => !ids.has(p.id));
  let at;
  if (targetId) at = rest.findIndex(p => p.id === targetId);
  else { const last = rest.findLastIndex(p => inSection(p)); at = last < 0 ? rest.length : last + 1; }
  rest.splice(at, 0, ...moving); data.pieces = rest;
}
function nudge(where) {
  const ids = new Set(selected), list = visible(), others = list.filter(p => !ids.has(p.id));
  if (!others.length) return;
  const first = list.findIndex(p => ids.has(p.id));
  const before = list.slice(0, first).length; // cuántas no seleccionadas hay antes de la primera
  if (where === 'first') moveBefore(ids, others[0].id);
  if (where === 'last') moveBefore(ids, null);
  if (where === 'prev' && before > 0) moveBefore(ids, others[before - 1].id);
  if (where === 'next') moveBefore(ids, others[before + 1]?.id ?? null);
  render();
}
$('toFirst').addEventListener('click', () => nudge('first'));
$('toLast').addEventListener('click', () => nudge('last'));
$('movePrev').addEventListener('click', () => nudge('prev'));
$('moveNext').addEventListener('click', () => nudge('next'));
$('selectAll').addEventListener('click', () => { selected = new Set(visible().map(p => p.id)); renderSelection(); renderEditor(); });
$('selectNone').addEventListener('click', () => { selected.clear(); renderSelection(); renderEditor(); });

// ── Editor ──
const same = (list, k) => list.every(p => p[k] === list[0][k]) ? list[0][k] : undefined;
function renderEditor() {
  const list = picked(), one = list.length === 1 ? list[0] : null;
  $('editor').hidden = !list.length; if (!list.length) { $('editorMedia').replaceChildren(); return; }
  $('editorTitle').textContent = one ? (one.type === 'video' ? 'Video' : 'Imagen') : `${list.length} piezas`;
  if (one) {
    const key = one.id;
    if ($('editorMedia').dataset.key !== key || !$('editorMedia').firstChild) {
      $('editorMedia').dataset.key = key;
      $('editorMedia').replaceChildren(one.type === 'video'
        ? el('video', { src: asset(one.src), poster: asset(one.thumb), controls: true, preload: 'none' })
        : el('img', { src: asset(one.thumb), alt: '' }));
    }
  } else { $('editorMedia').replaceChildren(); $('editorMedia').dataset.key = ''; }
  $('mixedHint').hidden = !!one; $('singleFields').hidden = !one;
  const ser = same(list, 'series');
  $('fSeries').replaceChildren(
    ...(ser === undefined ? [new Option('— varias —', '__mixed')] : []),
    new Option('Exploración (sin serie)', ''), ...data.series.map(s => new Option(s.name, s.id)));
  $('fSeries').value = ser === undefined ? '__mixed' : ser || '';
  $('tools').replaceChildren(...[...new Set(data.pieces.map(p => p.tool).filter(Boolean))].sort().map(t => new Option(t, t)));
  $('fTool').value = same(list, 'tool') ?? ''; $('fYear').value = same(list, 'year') ?? '';
  $('fNote').value = one?.note ?? ''; $('fPrompt').value = one?.prompt ?? '';
  $('toggleHidden').textContent = list.every(p => p.hidden) ? 'Mostrar en la web' : 'Ocultar de la web';
}
const set = fn => { picked().forEach(fn); renderTop(); };
$('fSeries').addEventListener('change', e => {
  const v = e.target.value; if (v === '__mixed') return;
  set(p => { p.series = v || null; }); render();
});
$('fTool').addEventListener('input', e => { const v = e.target.value.trim(); if (v || selected.size === 1) set(p => { p.tool = v; }); });
$('fYear').addEventListener('input', e => {
  const n = e.target.value ? Number(e.target.value) : null;
  if (n !== null && (!Number.isInteger(n) || n < 1990 || n > 2100)) return;
  if (n !== null || selected.size === 1) set(p => { p.year = n; });
});
$('fNote').addEventListener('input', e => set(p => { p.note = e.target.value; }));
$('fPrompt').addEventListener('input', e => set(p => { p.prompt = e.target.value; }));
$('toggleHidden').addEventListener('click', () => { const h = !picked().every(p => p.hidden); set(p => { p.hidden = h; }); render(); });
$('deletePieces').addEventListener('click', async () => {
  const n = selected.size;
  if (!await ask(`¿Eliminar ${n === 1 ? 'esta pieza' : `estas ${n} piezas`}? Al guardar, los archivos subidos desde el panel se borran para siempre. Si solo no quieres mostrarla, usa Ocultar.`, { ok: 'Eliminar' })) return;
  data.pieces = data.pieces.filter(p => !selected.has(p.id)); selected.clear(); render();
});
$('closeEditor').addEventListener('click', () => { selected.clear(); renderSelection(); renderEditor(); });

// ── Series ──
$('addSeries').addEventListener('click', async () => {
  const name = await ask('Nombre de la serie nueva', { input: '', ok: 'Crear' }); if (!name) return;
  const base = slug(name) || 'serie'; let id = base, i = 2;
  while (seriesOf(id) || ['all', 'exploraciones', 'ocultas'].includes(id)) id = `${base}-${i++}`;
  data.series.unshift({ id, name, description: '' }); section = id; selected.clear(); render();
});
$('seriesName').addEventListener('input', e => { seriesOf(section).name = e.target.value; $('title').textContent = e.target.value; renderTop(); renderSide(); });
$('seriesDesc').addEventListener('input', e => { seriesOf(section).description = e.target.value; renderTop(); });
const shiftSeries = d => {
  const i = data.series.findIndex(s => s.id === section), j = i + d; if (j < 0 || j >= data.series.length) return;
  [data.series[i], data.series[j]] = [data.series[j], data.series[i]]; renderTop(); renderSide();
};
$('seriesUp').addEventListener('click', () => shiftSeries(-1));
$('seriesDown').addEventListener('click', () => shiftSeries(1));
$('seriesDelete').addEventListener('click', async () => {
  const s = seriesOf(section), n = data.pieces.filter(p => p.series === s.id).length;
  if (!await ask(`¿Eliminar la serie "${s.name}"?${n ? ` Sus ${n} piezas pasan a Exploraciones; no se borra ninguna.` : ''}`, { ok: 'Eliminar serie' })) return;
  data.pieces.forEach(p => { if (p.series === s.id) p.series = null; });
  data.series = data.series.filter(x => x !== s); section = n ? 'exploraciones' : 'all'; selected.clear(); render();
});

// ── Subidas ──
let blobClient;
async function send(pathname, blob, onProgress) {
  if (uploadsMode === 'local') {
    const r = await fetch('/api/local-upload?path=' + encodeURIComponent(pathname), { method: 'PUT', body: blob });
    if (!r.ok) throw new Error('No se pudo subir.'); return (await r.json()).url;
  }
  blobClient ||= await import('/admin/blob-client.js');
  const r = await blobClient.upload(pathname, blob, {
    access: 'public', handleUploadUrl: '/api/upload', contentType: blob.type, multipart: blob.size > 20 * 1024 * 1024,
    onUploadProgress: p => onProgress(p.percentage),
  });
  return r.url;
}
let queue = Promise.resolve();
function addFiles(files) {
  const target = seriesOf(section) ? section : null;
  const startedIn = section, added = new Set();
  const list = [...files].filter(f => f.size);
  busyUploads += list.length; renderTop();
  // De atrás para adelante: como cada una entra primera, quedan en el orden en que las elegiste
  for (const file of list.reverse()) {
    const state = el('span', { textContent: 'En espera' });
    const row = el('li', {}, el('span', { textContent: file.name }), state);
    $('uploads').prepend(row);
    const step = t => { state.textContent = t; };
    queue = queue.then(async () => {
      try {
        step('Preparando…');
        const m = await prepare(file, step);
        const id = `${slug(file.name.replace(/\.[^.]+$/, '')).slice(0, 40) || 'pieza'}-${crypto.randomUUID().slice(0, 8)}`.replace(/^-+/, '');
        const up = (dir, blob, name) => send(`media/${dir}/${id}.${extOf(blob)}`, blob, pct => step(`${name} ${Math.round(pct)}%`));
        step('Subiendo…');
        const thumb = await up('thumbs', m.thumb, 'Miniatura');
        const src = await up('full', m.full, 'Archivo');
        const preview = !m.preview ? '' : m.preview === m.full ? src : await up('previews', m.preview, 'Preview');
        data.pieces.unshift({
          id, type: m.type, series: seriesOf(target) ? target : null, tool: '', year: new Date().getFullYear(),
          note: '', prompt: '', hidden: false, src, thumb, preview, w: m.w, h: m.h, color: m.color,
        });
        added.add(id);
        step(m.type === 'video' && !preview ? 'Listo (sin preview: en la grilla se ve quieto)' : 'Listo');
        setTimeout(() => row.remove(), 6000);
      } catch (e) { state.className = 'bad'; step(e.message || 'No se pudo subir.'); console.error(e); }
      finally { busyUploads--; render(); }
    });
  }
  // Al terminar quedan seleccionadas, para ponerles herramienta, serie o año de una vez
  queue = queue.then(() => {
    if (!added.size || section !== startedIn) return;
    selected = new Set(added); renderSelection(); renderEditor();
  });
}
$('files').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('drop');
drop.addEventListener('dragover', e => { if (!drag) { e.preventDefault(); drop.classList.add('over'); } });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (!drag && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
// Soltar un archivo fuera de la zona no debe abrirlo y sacarte del panel
for (const t of ['dragover', 'drop']) window.addEventListener(t, e => { if (!drag) e.preventDefault(); });

start();
