'use strict';

const STORAGE_KEY = 'tea-menu.v1';
const PREFS_KEY = 'tea-menu.prefs';

const TYPES = [
  { id: 'vert',     label: 'Thé vert',   color: '#7fa65a', temp: 75, time: 2 },
  { id: 'noir',     label: 'Thé noir',   color: '#8b4a2b', temp: 95, time: 4 },
  { id: 'oolong',   label: 'Oolong',     color: '#c08a3e', temp: 90, time: 3 },
  { id: 'blanc',    label: 'Thé blanc',  color: '#d9c9a3', temp: 80, time: 4 },
  { id: 'puerh',    label: 'Pu-erh',     color: '#4e3426', temp: 95, time: 4 },
  { id: 'matcha',   label: 'Matcha',     color: '#5b9a3c', temp: 75, time: 0 },
  { id: 'rooibos',  label: 'Rooibos',    color: '#b4532a', temp: 100, time: 6 },
  { id: 'infusion', label: 'Infusion',   color: '#c46c8e', temp: 100, time: 6 },
  { id: 'autre',    label: 'Autre',      color: '#9a9385', temp: null, time: null },
];
const typeById = Object.fromEntries(TYPES.map(t => [t.id, t]));

/* ---------- Stockage ---------- */
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(teas)); }
  catch { toast('Impossible d’enregistrer sur cet appareil'); }
}
function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

let teas = load(STORAGE_KEY, []);
let prefs = Object.assign({ showOut: false }, load(PREFS_KEY, {}));
let filter = 'tous';
let query = '';
let editingId = null;

// Demande au navigateur de ne pas effacer les données en cas de manque de place
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c);
  return n;
}
function fmtTime(min) {
  if (min == null || min === '') return null;
  const m = Number(min);
  if (m === 0) return null;
  const whole = Math.floor(m), sec = Math.round((m - whole) * 60);
  return sec ? `${whole} min ${sec}` : `${whole} min`;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Rendu ---------- */
function visibleTeas() {
  const q = norm(query);
  return teas.filter(t =>
    (prefs.showOut || t.inStock || filter === 'epuises') &&
    (filter === 'tous' ? true
      : filter === 'favoris' ? t.favorite
      : filter === 'epuises' ? !t.inStock
      : t.type === filter) &&
    (!q || norm(`${t.name} ${t.origin} ${t.notes} ${typeById[t.type]?.label}`).includes(q))
  );
}

function renderChips() {
  const counts = {};
  for (const t of teas) if (prefs.showOut || t.inStock) counts[t.type] = (counts[t.type] || 0) + 1;
  const chips = [{ id: 'tous', label: 'Tous' }];
  if (teas.some(t => t.favorite)) chips.push({ id: 'favoris', label: '★ Favoris' });
  for (const ty of TYPES) if (counts[ty.id]) chips.push(ty);
  if (teas.some(t => !t.inStock)) chips.push({ id: 'epuises', label: 'Épuisés' });
  if (!chips.some(c => c.id === filter)) filter = 'tous';

  $('#chips').replaceChildren(...chips.map(c =>
    el('button', {
      class: 'chip', role: 'tab', 'aria-selected': String(c.id === filter),
      onclick: () => { filter = c.id; render(); },
    },
      c.color ? el('span', { class: 'dot', style: `background:${c.color}` }) : null,
      c.label)
  ));
}

function card(t) {
  const ty = typeById[t.type] || typeById.autre;
  const meta = [];
  if (t.temp) meta.push(el('span', { class: 'pill' }, `${t.temp} °C`));
  const time = fmtTime(t.time);
  if (time) meta.push(el('span', { class: 'pill' }, time));
  if (!t.inStock) meta.push(el('span', { class: 'pill warn' }, 'Épuisé'));

  return el('article', { class: 'card' + (t.inStock ? '' : ' out'), tabindex: '0',
      onclick: () => openForm(t.id),
      onkeydown: e => { if (e.key === 'Enter') openForm(t.id); } },
    el('button', {
      class: 'fav' + (t.favorite ? ' on' : ''), 'aria-label': t.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
      onclick: e => { e.stopPropagation(); t.favorite = !t.favorite; save(); render(); },
    }, t.favorite ? '★' : '☆'),
    el('div', { class: 'card-name' }, t.name),
    t.origin ? el('div', { class: 'card-origin' }, t.origin) : null,
    meta.length ? el('div', { class: 'card-meta' }, meta) : null,
    t.notes ? el('div', { class: 'card-notes' }, t.notes) : null,
  );
}

function render() {
  renderChips();
  const list = $('#list');
  const items = visibleTeas();

  if (!teas.length) {
    list.replaceChildren(el('div', { class: 'empty' },
      el('div', { class: 'big' }, '🍵'),
      el('p', {}, 'Aucun thé pour l’instant.'),
      el('p', {}, 'Touchez + pour ajouter le premier.')));
    return;
  }
  if (!items.length) {
    list.replaceChildren(el('div', { class: 'empty' }, el('p', {}, 'Aucun thé ne correspond.')));
    return;
  }

  const sorted = items.slice().sort((a, b) =>
    (b.favorite - a.favorite) || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  const groups = TYPES.map(ty => ({ ty, items: sorted.filter(t => (typeById[t.type] ? t.type : 'autre') === ty.id) }))
    .filter(g => g.items.length);

  list.replaceChildren(...groups.flatMap(g => [
    el('h2', { class: 'group-title' },
      el('span', { class: 'dot', style: `background:${g.ty.color}` }),
      `${g.ty.label} · ${g.items.length}`),
    ...g.items.map(card),
  ]));
}

/* ---------- Formulaire ---------- */
const form = $('#teaForm');
const dlg = $('#teaDialog');

$('#typeSelect').replaceChildren(...TYPES.map(t => el('option', { value: t.id }, t.label)));

function applyTypeHints() {
  const ty = typeById[form.type.value];
  form.temp.placeholder = ty?.temp ?? '';
  form.time.placeholder = ty?.time ?? '';
}
form.type.addEventListener('change', applyTypeHints);

function openForm(id = null) {
  editingId = id;
  const t = id ? teas.find(x => x.id === id) : null;
  form.reset();
  $('#formTitle').textContent = t ? 'Modifier' : 'Nouveau thé';
  $('#deleteBtn').hidden = !t;
  if (t) {
    form.name.value = t.name;
    form.type.value = typeById[t.type] ? t.type : 'autre';
    form.origin.value = t.origin || '';
    form.temp.value = t.temp ?? '';
    form.time.value = t.time ?? '';
    form.notes.value = t.notes || '';
    form.inStock.checked = !!t.inStock;
  } else {
    form.type.value = filter in typeById ? filter : 'vert';
    form.inStock.checked = true;
  }
  applyTypeHints();
  dlg.showModal();
  if (!t) setTimeout(() => form.name.focus(), 50);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const name = form.name.value.trim();
  if (!name) { form.name.focus(); return; }
  const num = v => (v === '' ? null : Number(v));
  const data = {
    name,
    type: form.type.value,
    origin: form.origin.value.trim(),
    temp: num(form.temp.value),
    time: num(form.time.value),
    notes: form.notes.value.trim(),
    inStock: form.inStock.checked,
  };
  if (editingId) {
    Object.assign(teas.find(t => t.id === editingId), data, { updatedAt: Date.now() });
    toast('Thé modifié');
  } else {
    teas.push({ id: uid(), favorite: false, createdAt: Date.now(), ...data });
    toast('Thé ajouté');
  }
  save();
  dlg.close();
  render();
});

$('#deleteBtn').addEventListener('click', () => {
  const t = teas.find(x => x.id === editingId);
  if (!t || !confirm(`Supprimer « ${t.name} » ?`)) return;
  teas = teas.filter(x => x.id !== editingId);
  save();
  dlg.close();
  render();
  toast('Thé supprimé');
});

/* ---------- Réglages / sauvegarde ---------- */
const sdlg = $('#settingsDialog');
$('#settingsBtn').addEventListener('click', () => {
  $('#showOut').checked = prefs.showOut;
  const out = teas.filter(t => !t.inStock).length;
  $('#countInfo').textContent = `${teas.length} thé(s) enregistré(s), dont ${out} épuisé(s).`;
  sdlg.showModal();
});
$('#showOut').addEventListener('change', e => { prefs.showOut = e.target.checked; savePrefs(); render(); });

$('#exportBtn').addEventListener('click', async () => {
  const json = JSON.stringify({ app: 'tea-menu', version: 1, exportedAt: new Date().toISOString(), teas }, null, 2);
  const name = `thes-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  // Sur téléphone, la feuille de partage permet d'enregistrer dans Fichiers / Drive / mail
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Menu des thés' }); return; }
    catch (err) { if (err.name === 'AbortError') return; }
  }
  const a = el('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#importInput').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const incoming = Array.isArray(data) ? data : data.teas;
    if (!Array.isArray(incoming)) throw new Error('format');
    const clean = incoming
      .filter(t => t && typeof t.name === 'string' && t.name.trim())
      .map(t => ({
        id: typeof t.id === 'string' ? t.id : uid(),
        name: t.name.trim().slice(0, 80),
        type: typeById[t.type] ? t.type : 'autre',
        origin: String(t.origin || '').slice(0, 80),
        temp: Number.isFinite(+t.temp) && t.temp !== null && t.temp !== '' ? +t.temp : null,
        time: Number.isFinite(+t.time) && t.time !== null && t.time !== '' ? +t.time : null,
        notes: String(t.notes || '').slice(0, 500),
        inStock: t.inStock !== false,
        favorite: !!t.favorite,
        createdAt: +t.createdAt || Date.now(),
      }));
    const known = new Set(teas.map(t => t.id));
    const added = clean.filter(t => !known.has(t.id));
    if (!confirm(`Ajouter ${added.length} thé(s) à la liste ? (${clean.length - added.length} déjà présent(s) ignoré(s))`)) return;
    teas.push(...added);
    save();
    render();
    toast(`${added.length} thé(s) importé(s)`);
  } catch {
    toast('Fichier non reconnu');
  }
});

/* ---------- Divers ---------- */
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
// Fermer une feuille en touchant le fond
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

$('#addBtn').addEventListener('click', () => openForm());
$('#search').addEventListener('input', e => { query = e.target.value; render(); });

// Synchronise si l'app est ouverte dans deux onglets
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { teas = load(STORAGE_KEY, []); render(); } });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
