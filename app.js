(() => {
'use strict';

const CFG = window.CONFIG || {};
const DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;
const BUCKET = 'metas';
const LOGIN_DOMAIN = CFG.LOGIN_DOMAIN || 'crew.local';
const TITULO = CFG.TITULO || 'Sala de Metas CREW';
// "Sala de Metas CREW" -> "Sala de Metas <b>CREW</b>" (última palavra em destaque)
const brandHtml = () => {
  const t = esc(TITULO).split(' ');
  const last = t.pop();
  return `<span class="mark" aria-hidden="true"></span><span class="brand-t">${t.join(' ')} <b>${last}</b></span>`;
};

const CARGOS = [
  { key: 'gerencia', label: 'Gerência' },
  { key: 'soldado',  label: 'Soldados' },
  { key: 'membro',   label: 'Membros' },
  { key: 'morador',  label: 'Moradores' },
];
const CARGO_LABEL = { gerencia: 'Gerência', soldado: 'Soldado', membro: 'Membro', morador: 'Morador' };

// Situação geral da sala -> cor da linha
const STATUS = {
  paga:          { label: 'Meta paga',             color: 'green'  },
  adiantada:     { label: 'Meta adiantada',        color: 'green'  },
  atrasada:      { label: 'Meta atrasada',         color: 'yellow' },
  off:           { label: 'Off',                   color: 'yellow' },
  atrasada_mais: { label: 'Atrasada há +1 semana', color: 'red'    },
};
const WEEK_STATUS = {
  entregue:     { label: 'Entregou',     cls: 'ok'   },
  nao_entregue: { label: 'Não entregou', cls: 'bad'  },
  pendente:     { label: 'Pendente',     cls: 'pend' },
};

// ---------------------------------------------------------------- utilidades
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const byName = (a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });

let toastTimer;
function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = isErr ? 'err' : '';
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isErr ? 5000 : 2500);
}
function fail(e) {
  console.error(e);
  toast('Erro: ' + (e && e.message ? e.message : e), true);
}

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const currentWeek = () => iso(mondayOf(new Date()));
function weekLabel(s) {
  const a = parseIso(s), b = addDays(a, 6);
  const f = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return `${f(a)} – ${f(b)}`;
}

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('arquivo não é uma imagem válida')); };
    img.src = url;
  });
}
// Reduz e converte para JPEG para economizar espaço (sem perder a leitura dos itens)
async function compressImage(file, maxSide, quality) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('falha ao processar imagem'))), 'image/jpeg', quality));
}
const blobToDataUrl = blob => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

// ---------------------------------------------------------------- dados: Supabase
function supabaseApi() {
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    imgMax: 2000, imgQuality: 0.85,
    async session() { return ok(await sb.auth.getSession()).session; },
    async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
    async signUp(email, password, meta) {
      const data = ok(await sb.auth.signUp({ email, password, options: { data: meta } }));
      // Sem sessão = o Supabase está pedindo confirmação por e-mail (precisa desligar, veja o LEIA-ME)
      if (!data.session) throw new Error('acesso criado, mas o Supabase está exigindo confirmação por e-mail. Desligue "Confirm email" no Supabase (LEIA-ME, passo 2).');
    },
    async signOut() { await sb.auth.signOut(); },
    onSignedOut(cb) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') cb(); }); },

    async listMembers() { return ok(await sb.from('members').select('*')).sort(byName); },
    async addMembers(list) { return ok(await sb.from('members').insert(list).select()); },
    async updateMember(id, patch) { return ok(await sb.from('members').update(patch).eq('id', id).select().single()); },
    async deleteMember(id) {
      const imgs = ok(await sb.from('images').select('path').eq('member_id', id));
      if (imgs.length) await sb.storage.from(BUCKET).remove(imgs.map(i => i.path));
      ok(await sb.from('members').delete().eq('id', id));
    },

    async listWeeks(memberId) { return ok(await sb.from('weeks').select('*').eq('member_id', memberId)); },
    async listWeekAll(week) { return ok(await sb.from('weeks').select('member_id,status').eq('week_start', week)); },
    async setWeek(memberId, week, patch) {
      ok(await sb.from('weeks').upsert({ member_id: memberId, week_start: week, ...patch, updated_at: new Date().toISOString() }));
    },

    async listImages(memberId) {
      const rows = ok(await sb.from('images').select('*').eq('member_id', memberId).order('created_at'));
      if (!rows.length) return [];
      const signed = ok(await sb.storage.from(BUCKET).createSignedUrls(rows.map(r => r.path), 60 * 60 * 6));
      const map = new Map(signed.map(s => [s.path, s.signedUrl]));
      return rows.map(r => ({ ...r, url: map.get(r.path) }));
    },
    async uploadImage(memberId, week, blob) {
      const path = `${memberId}/${week}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      ok(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' }));
      ok(await sb.from('images').insert({ member_id: memberId, week_start: week, path }));
    },
    async deleteImage(img) {
      ok(await sb.storage.from(BUCKET).remove([img.path]));
      ok(await sb.from('images').delete().eq('id', img.id));
    },
  };
}

// ---------------------------------------------------------------- dados: modo demonstração (navegador)
function demoApi() {
  const KEY = 'salas-farm-demo';
  let db = null;
  try { db = JSON.parse(ls.get(KEY)); } catch { db = null; }
  if (!db) {
    db = {
      members: (window.MEMBROS_INICIAIS || []).map(([game_id, name, cargo]) => ({
        id: uid(), game_id, name, cargo, status: 'paga', meta: '', notes: '', created_at: new Date().toISOString(),
      })),
      weeks: [], images: [],
    };
    ls.set(KEY, JSON.stringify(db));
  }
  const save = () => { if (!ls.set(KEY, JSON.stringify(db))) throw new Error('armazenamento do navegador cheio (modo demonstração)'); };
  return {
    imgMax: 1100, imgQuality: 0.6,
    // Contas de teste ficam só neste navegador
    async session() {
      const e = ls.get(KEY + '-login');
      if (!e) return null;
      const u = (db.users || []).find(x => x.email === e);
      return { user: { email: e, user_metadata: u ? u.meta : {} } };
    },
    async signIn(email) {
      if (!(db.users || []).some(x => x.email === email)) throw new Error('Invalid login credentials');
      ls.set(KEY + '-login', email);
    },
    async signUp(email, password, meta) {
      db.users = db.users || [];
      if (db.users.some(x => x.email === email)) throw new Error('User already registered');
      db.users.push({ email, meta });
      save();
      ls.set(KEY + '-login', email);
    },
    async signOut() { ls.del(KEY + '-login'); },
    onSignedOut() {},

    async listMembers() { return db.members.map(m => ({ ...m })).sort(byName); },
    async addMembers(list) {
      const rows = list.map(m => ({ id: uid(), status: 'paga', meta: '', notes: '', created_at: new Date().toISOString(), ...m }));
      db.members.push(...rows); save(); return rows;
    },
    async updateMember(id, patch) { const r = db.members.find(x => x.id === id); Object.assign(r, patch); save(); return { ...r }; },
    async deleteMember(id) {
      db.members = db.members.filter(x => x.id !== id);
      db.weeks = db.weeks.filter(x => x.member_id !== id);
      db.images = db.images.filter(x => x.member_id !== id);
      save();
    },

    async listWeeks(memberId) { return db.weeks.filter(w => w.member_id === memberId).map(w => ({ ...w })); },
    async listWeekAll(week) { return db.weeks.filter(w => w.week_start === week).map(w => ({ ...w })); },
    async setWeek(memberId, week, patch) {
      let r = db.weeks.find(w => w.member_id === memberId && w.week_start === week);
      if (!r) { r = { member_id: memberId, week_start: week, status: 'pendente', note: '' }; db.weeks.push(r); }
      Object.assign(r, patch); save();
    },

    async listImages(memberId) { return db.images.filter(i => i.member_id === memberId).map(i => ({ ...i, url: i.data })); },
    async uploadImage(memberId, week, blob) {
      const data = await blobToDataUrl(blob);
      db.images.push({ id: uid(), member_id: memberId, week_start: week, data, created_at: new Date().toISOString() });
      try { save(); } catch (e) { db.images.pop(); throw e; }
    },
    async deleteImage(img) { db.images = db.images.filter(i => i.id !== img.id); save(); },
  };
}

const api = DEMO ? demoApi() : supabaseApi();
const app = $('#app');
document.title = TITULO;

const state = {
  session: null, loginMode: 'entrar',
  members: [], weekNow: {}, search: '', cargo: 'todos',
  member: null, weeks: {}, images: [], extraWeeks: 0, activeWeek: null, uploading: false,
};

// ---------------------------------------------------------------- login / criar acesso
// O login é só pelo nome. O Supabase exige e-mail e senha, então os dois são gerados a partir
// do nome: "Victor Oliveira" -> victor-oliveira@dominio (nenhum e-mail é enviado).
// Maiúsculas, acentos e espaços não importam na hora de entrar.
const nameKey = nome => String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nameToEmail = nome => `${nameKey(nome)}@${LOGIN_DOMAIN}`;
const nameToPass = nome => `crew-acesso-${nameKey(nome)}`;

function renderLogin(msg) {
  const criar = state.loginMode === 'criar';
  app.innerHTML = `
    <div class="login">
      <div class="sun" aria-hidden="true"></div>
      <form id="form-login" novalidate>
        <div class="login-brand">${brandHtml()}</div>
        <p class="muted">Acesso restrito à gerência.${DEMO ? ' <span class="tag demo">Modo demonstração</span>' : ''}</p>
        <div class="login-tabs">
          <button type="button" class="${criar ? '' : 'on'}" data-action="login-mode" data-mode="entrar">Entrar</button>
          <button type="button" class="${criar ? 'on' : ''}" data-action="login-mode" data-mode="criar">Criar acesso</button>
        </div>
        <label>Nome<input name="nome" autocomplete="username" maxlength="40"></label>
        ${criar ? '<label>ID<input name="gid" inputmode="numeric" autocomplete="off" maxlength="12"></label>' : ''}
        <div class="err">${esc(msg || '')}</div>
        <button class="btn primary" type="submit">${criar ? 'Criar acesso' : 'Entrar'}</button>
        ${DEMO ? '<p class="muted" style="margin:14px 0 0;font-size:13px">No modo demonstração os dados ficam só neste navegador. Configure o <b>config.js</b> para usar de verdade.</p>' : ''}
      </form>
    </div>`;
  $('[name=nome]').focus();
}

function loginError(e) {
  const m = (e && e.message) || String(e);
  if (/invalid login credentials|invalid_credentials/i.test(m)) return 'Nenhum acesso com esse nome. Confira o nome ou use a aba Criar acesso.';
  if (/already registered|already exists|user_already_exists/i.test(m)) return 'Já existe um acesso com esse nome. Use a aba Entrar.';
  return 'Não foi possível continuar: ' + m;
}

async function doLogin(form) {
  const btn = form.querySelector('button[type=submit]');
  const errEl = form.querySelector('.err');
  const criar = state.loginMode === 'criar';
  const nome = form.nome.value.trim().replace(/\s+/g, ' ');
  const gid = criar ? form.gid.value.trim() : '';
  let erro = '';
  if (!nameKey(nome)) erro = 'Digite seu nome.';
  else if (criar && !/^\d+$/.test(gid)) erro = 'O ID deve ter só números.';
  if (erro) { errEl.textContent = erro; return; }

  btn.disabled = true;
  try {
    if (criar) {
      await api.signUp(nameToEmail(nome), nameToPass(nome), { nome, game_id: gid });
    } else {
      await api.signIn(nameToEmail(nome), nameToPass(nome));
    }
    state.session = await api.session();
    if (!state.session) throw new Error('sessão não iniciada');
    state.loginMode = 'entrar';
    route();
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    errEl.textContent = loginError(e);
  }
}

function topBar() {
  const u = state.session?.user || {};
  const meta = u.user_metadata || {};
  const who = meta.nome ? `${meta.nome} · ${meta.game_id || ''}` : (u.email || '');
  return `
    <header class="top">
      <a href="#/" class="brand">${brandHtml()}</a>
      ${DEMO ? '<span class="tag demo">DEMO</span>' : ''}
      <span class="sp"></span>
      <span class="who">${esc(who)}</span>
      <button class="btn sm ghost" data-action="logout">Sair</button>
    </header>`;
}

// ---------------------------------------------------------------- painel inicial
async function openHome() {
  state.member = null;
  app.innerHTML = topBar() + '<div class="loading">Carregando salas…</div>';
  try {
    const [members, wk] = await Promise.all([api.listMembers(), api.listWeekAll(currentWeek())]);
    state.members = members;
    state.weekNow = Object.fromEntries(wk.map(w => [w.member_id, w.status]));
  } catch (e) { return fail(e); }
  app.innerHTML = topBar() + `
    <main class="wrap">
      <div class="toolbar">
        <input class="search" id="search" type="search" placeholder="Buscar por nome ou ID…" value="${esc(state.search)}">
        ${state.session ? '<button class="btn primary" data-action="new-member">+ Nova sala</button>' : ''}
      </div>
      <div class="toolbar">
        <div class="chips" id="chips"></div>
      </div>
      <div class="summary" id="summary"></div>
      <div id="sections"></div>
    </main>`;
  renderHomeBody();
}

function renderHomeBody() {
  const counts = { green: 0, yellow: 0, red: 0 };
  state.members.forEach(m => { counts[(STATUS[m.status] || STATUS.paga).color]++; });
  $('#summary').innerHTML = `
    <div class="sum"><b>${state.members.length}</b> salas</div>
    <div class="sum"><span class="dot green"></span><b>${counts.green}</b> em dia</div>
    <div class="sum"><span class="dot yellow"></span><b>${counts.yellow}</b> atrasada / off</div>
    <div class="sum"><span class="dot red"></span><b>${counts.red}</b> atrasada +1 semana</div>
    <div class="sum">Semana atual <b>${weekLabel(currentWeek())}</b></div>`;

  const chips = [{ key: 'todos', label: 'Todos' }, ...CARGOS];
  $('#chips').innerHTML = chips.map(c => {
    const n = c.key === 'todos' ? state.members.length : state.members.filter(m => m.cargo === c.key).length;
    return `<button class="chip ${state.cargo === c.key ? 'on' : ''}" data-action="cargo" data-cargo="${c.key}">${c.label} · ${n}</button>`;
  }).join('');

  const q = state.search.trim().toLowerCase();
  const list = state.members.filter(m => !q || m.name.toLowerCase().includes(q) || String(m.game_id).includes(q));
  const sections = CARGOS.filter(c => state.cargo === 'todos' || state.cargo === c.key);
  $('#sections').innerHTML = sections.map(c => {
    const items = list.filter(m => m.cargo === c.key);
    if (q && !items.length) return '';
    return `
      <section class="section">
        <div class="section-h"><h2>${c.label}</h2><span class="muted">${items.length}</span></div>
        ${items.length ? `<div class="grid">${items.map(card).join('')}</div>` : '<div class="empty">Nenhuma sala nesse cargo ainda.</div>'}
      </section>`;
  }).join('') || '<div class="empty">Nenhuma sala encontrada.</div>';
}

function card(m) {
  const st = STATUS[m.status] || STATUS.paga;
  const ws = WEEK_STATUS[state.weekNow[m.id] || 'pendente'];
  return `
    <a class="card" href="#/m/${encodeURIComponent(m.id)}">
      <div class="card-body">
        <div class="gid">ID ${esc(m.game_id)}</div>
        <div class="name" title="${esc(m.name)}">${esc(m.name)}</div>
        <div class="wk">Esta semana: <span class="${ws.cls}">${ws.label}</span></div>
      </div>
      <div class="bar ${st.color}"><span class="dot ${st.color}"></span>${st.label}</div>
    </a>`;
}

// ---------------------------------------------------------------- sala de farm
async function openMember(id) {
  if (state.member?.id !== id) { state.extraWeeks = 0; state.activeWeek = currentWeek(); }
  app.innerHTML = topBar() + '<div class="loading">Carregando sala…</div>';
  try {
    const members = await api.listMembers();
    state.members = members;
    const m = members.find(x => x.id === id);
    if (!m) { app.innerHTML = topBar() + '<main class="wrap"><a href="#/" class="back">← Voltar</a><div class="empty">Sala não encontrada.</div></main>'; return; }
    state.member = m;
    const [weeks, images] = await Promise.all([api.listWeeks(id), api.listImages(id)]);
    state.weeks = Object.fromEntries(weeks.map(w => [w.week_start, w]));
    state.images = images;
  } catch (e) { return fail(e); }
  renderMember();
}

function weekList() {
  const cw = mondayOf(new Date());
  let start = addDays(cw, -7 * (4 + state.extraWeeks));
  const dataWeeks = [...Object.keys(state.weeks), ...state.images.map(i => i.week_start)];
  dataWeeks.forEach(w => { const d = mondayOf(parseIso(w)); if (d < start) start = d; });
  const out = [];
  for (let d = addDays(cw, 7); d >= start; d = addDays(d, -7)) out.push(iso(d));
  return out;
}

function renderMember() {
  const m = state.member;
  const st = STATUS[m.status] || STATUS.paga;
  const cw = currentWeek();
  const A = !!state.session; // todo mundo logado pode editar

  const picks = Object.entries(STATUS).map(([k, s]) => A
    ? `<button class="pick ${s.color} ${m.status === k ? 'on' : ''}" data-action="status" data-status="${k}"><span class="dot ${s.color}"></span>${s.label}</button>`
    : '').join('');

  const weeks = weekList().map(w => {
    const row = state.weeks[w] || { status: 'pendente', note: '' };
    const imgs = state.images.filter(i => i.week_start === w);
    const isCur = w === cw;
    const isNext = w > cw;
    const seg = A
      ? `<div class="seg">${Object.entries(WEEK_STATUS).map(([k, s]) =>
          `<button class="${s.cls} ${row.status === k ? 'on' : ''}" data-action="week" data-week="${w}" data-ws="${k}">${s.label}</button>`).join('')}</div>`
      : `<span class="ws ${WEEK_STATUS[row.status].cls}">${WEEK_STATUS[row.status].label}</span>`;
    const thumbs = imgs.map(i => `
      <div class="thumb" data-action="view" data-img="${esc(i.id)}" role="button" tabindex="0">
        <img src="${esc(i.url)}" alt="Meta ${weekLabel(w)}" loading="lazy">
        ${A ? `<button class="x" data-action="del-img" data-img="${esc(i.id)}" title="Remover imagem">✕</button>` : ''}
      </div>`).join('');
    return `
      <div class="week ${isCur ? 'current' : ''} ${A && state.activeWeek === w ? 'active' : ''}" data-week-row="${w}">
        <div class="week-head">
          <div class="week-label">Semana ${weekLabel(w)}
            ${isCur ? '<span class="tag">semana atual</span>' : ''}${isNext ? '<span class="tag">próxima (adiantada)</span>' : ''}
            ${imgs.length ? `<span class="muted" style="font-weight:500;font-size:13px">${imgs.length} imagem${imgs.length > 1 ? 's' : ''}</span>` : ''}
          </div>
          ${seg}
        </div>
        ${(imgs.length || A) ? `<div class="thumbs">${thumbs}
          ${A ? `<label class="add-img">+ Anexar<br>imagem<input type="file" accept="image/*" multiple data-upload="${w}"></label>` : ''}
        </div>` : ''}
        ${A ? `<input class="note" data-note="${w}" placeholder="Observação da semana (opcional)" value="${esc(row.note)}">`
            : (row.note ? `<div class="note-ro">${esc(row.note)}</div>` : '')}
      </div>`;
  }).join('');

  app.innerHTML = topBar() + `
    <main class="wrap">
      <a href="#/" class="back">← Voltar para as salas</a>

      <section class="panel room-head">
        <div class="panel-in">
          <div class="muted">Sala de farm · ${CARGO_LABEL[m.cargo] || m.cargo}</div>
          <h1>${esc(m.name)} <span class="gid">#${esc(m.game_id)}</span></h1>
          ${m.meta ? `<div style="margin-top:6px">Meta semanal: <b>${esc(m.meta)}</b></div>` : ''}
          ${m.notes ? `<div class="muted" style="margin-top:4px">${esc(m.notes)}</div>` : ''}
        </div>
        <div class="bar ${st.color}"><span class="dot ${st.color}"></span>${st.label}</div>
      </section>

      ${A ? `<section class="panel"><div class="panel-in">
        <h2>Situação da meta</h2>
        <div class="status-picks">${picks}</div>
      </div></section>` : ''}

      <section class="panel"><div class="panel-in">
        <h2>Calendário de metas</h2>
        ${A ? '<p class="tip">Clique numa semana para selecioná-la e cole a imagem com <b>Ctrl+V</b>, arraste a imagem para a semana, ou use “+ Anexar”.</p>' : ''}
        ${weeks}
        <button class="btn ghost more" data-action="more-weeks">Mostrar semanas anteriores</button>
      </div></section>

      ${A ? `<section class="panel"><div class="panel-in">
        <h2>Dados da sala</h2>
        <form id="form-edit">
          <div class="row2">
            <label>ID<input name="game_id" value="${esc(m.game_id)}" required></label>
            <label>Nome<input name="name" value="${esc(m.name)}" required></label>
          </div>
          <label>Cargo<select name="cargo">${CARGOS.map(c => `<option value="${c.key}" ${m.cargo === c.key ? 'selected' : ''}>${CARGO_LABEL[c.key]}</option>`).join('')}</select></label>
          <label>Meta semanal<input name="meta" value="${esc(m.meta)}" placeholder="ex.: 150 peças de arma"></label>
          <label>Observações<textarea name="notes" rows="2">${esc(m.notes)}</textarea></label>
          <div class="form-actions">
            <button type="button" class="btn danger" data-action="delete-member">Excluir sala</button>
            <button type="submit" class="btn primary">Salvar alterações</button>
          </div>
        </form>
      </div></section>` : ''}
    </main>`;
}

async function uploadFiles(week, files) {
  files = [...files].filter(f => f.type.startsWith('image/'));
  if (!files.length || !state.session) return;
  if (state.uploading) return toast('Aguarde o envio anterior terminar…');
  state.uploading = true;
  const m = state.member;
  try {
    for (let i = 0; i < files.length; i++) {
      toast(`Enviando imagem ${i + 1} de ${files.length}…`);
      const blob = await compressImage(files[i], api.imgMax, api.imgQuality);
      await api.uploadImage(m.id, week, blob);
    }
    state.images = await api.listImages(m.id);
    state.activeWeek = week;
    renderMember();
    toast(files.length > 1 ? 'Imagens anexadas!' : 'Imagem anexada!');
  } catch (e) { fail(e); } finally { state.uploading = false; }
}

// ---------------------------------------------------------------- rotas
async function route() {
  if (!state.session) return renderLogin();
  const m = location.hash.match(/^#\/m\/(.+)$/);
  if (m) await openMember(decodeURIComponent(m[1]));
  else await openHome();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- eventos
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  const row = e.target.closest('[data-week-row]');
  if (row && state.session && state.activeWeek !== row.dataset.weekRow && !e.target.closest('input,label')) {
    state.activeWeek = row.dataset.weekRow;
    document.querySelectorAll('.week.active').forEach(x => x.classList.remove('active'));
    row.classList.add('active');
  }
  if (!el) return;
  const a = el.dataset.action;
  const m = state.member;
  try {
    if (a === 'logout') {
      await api.signOut();
      state.session = null;
      location.hash = '';
      renderLogin();
    } else if (a === 'login-mode') {
      state.loginMode = el.dataset.mode; renderLogin();
    } else if (a === 'cargo') {
      state.cargo = el.dataset.cargo; renderHomeBody();
    } else if (a === 'new-member') {
      const f = $('#form-new'); f.reset();
      if (state.cargo !== 'todos') f.cargo.value = state.cargo;
      $('#dlg-new').showModal(); f.game_id.focus();
    } else if (a === 'status') {
      state.member = await api.updateMember(m.id, { status: el.dataset.status });
      renderMember(); toast('Situação atualizada: ' + STATUS[el.dataset.status].label);
    } else if (a === 'week') {
      const w = el.dataset.week, ws = el.dataset.ws;
      await api.setWeek(m.id, w, { status: ws });
      state.weeks[w] = { ...(state.weeks[w] || { note: '' }), member_id: m.id, week_start: w, status: ws };
      renderMember();
    } else if (a === 'view') {
      if (e.target.closest('.x')) return;
      const img = state.images.find(i => i.id === el.dataset.img);
      if (img) { const lb = $('#lightbox'); lb.querySelector('img').src = img.url; lb.hidden = false; }
    } else if (a === 'del-img') {
      e.stopPropagation();
      if (!confirm('Remover esta imagem? Isso não pode ser desfeito.')) return;
      const img = state.images.find(i => i.id === el.dataset.img);
      await api.deleteImage(img);
      state.images = state.images.filter(i => i.id !== img.id);
      renderMember(); toast('Imagem removida.');
    } else if (a === 'more-weeks') {
      state.extraWeeks += 8; renderMember();
    } else if (a === 'delete-member') {
      if (!confirm(`Excluir a sala de ${m.name}? Todas as semanas e imagens dela serão apagadas.`)) return;
      await api.deleteMember(m.id);
      toast('Sala excluída.');
      location.hash = '#/';
    }
  } catch (err) { fail(err); }
});

document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'form-login') { e.preventDefault(); return doLogin(f); }
  if (f.id === 'form-edit') {
    e.preventDefault();
    try {
      state.member = await api.updateMember(state.member.id, {
        game_id: f.game_id.value.trim(), name: f.name.value.trim(), cargo: f.cargo.value,
        meta: f.meta.value.trim(), notes: f.notes.value.trim(),
      });
      renderMember(); toast('Sala salva!');
    } catch (err) { fail(err); }
  }
  if (f.id === 'form-new') {
    e.preventDefault();
    const cargo = f.cargo.value, meta = f.meta.value.trim();
    const list = [];
    f.bulk.value.split('\n').forEach(line => {
      const mt = line.trim().match(/^(\d+)\s*[-–:,]?\s*(.+)$/);
      if (mt) list.push({ game_id: mt[1], name: mt[2].trim(), cargo, meta });
    });
    if (f.game_id.value.trim() && f.name.value.trim()) list.unshift({ game_id: f.game_id.value.trim(), name: f.name.value.trim(), cargo, meta });
    if (!list.length) return toast('Preencha ID e nome (ou a lista de vários).', true);
    try {
      await api.addMembers(list);
      $('#dlg-new').close();
      toast(list.length > 1 ? `${list.length} salas criadas!` : 'Sala criada!');
      openHome();
    } catch (err) { fail(err); }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'search') { state.search = e.target.value; renderHomeBody(); }
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.upload) { await uploadFiles(t.dataset.upload, t.files); t.value = ''; }
  if (t.dataset.note !== undefined && state.member) {
    const w = t.dataset.note;
    try {
      await api.setWeek(state.member.id, w, { note: t.value.trim() });
      state.weeks[w] = { status: 'pendente', ...(state.weeks[w] || {}), member_id: state.member.id, week_start: w, note: t.value.trim() };
      toast('Observação salva.');
    } catch (err) { fail(err); }
  }
});

// colar imagem (Ctrl+V) na semana selecionada
document.addEventListener('paste', e => {
  if (!state.member || !state.session) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  uploadFiles(state.activeWeek || currentWeek(), files);
});

// arrastar e soltar imagens numa semana
document.addEventListener('dragover', e => {
  const row = e.target.closest?.('[data-week-row]');
  if (!row || !state.session) return;
  e.preventDefault();
  document.querySelectorAll('.week.drag').forEach(x => x !== row && x.classList.remove('drag'));
  row.classList.add('drag');
});
document.addEventListener('dragleave', e => {
  const row = e.target.closest?.('[data-week-row]');
  if (row && !row.contains(e.relatedTarget)) row.classList.remove('drag');
});
document.addEventListener('drop', e => {
  const row = e.target.closest?.('[data-week-row]');
  if (!row || !state.session) return;
  e.preventDefault();
  row.classList.remove('drag');
  uploadFiles(row.dataset.weekRow, e.dataTransfer.files);
});

$('#lightbox').addEventListener('click', () => { $('#lightbox').hidden = true; });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $('#lightbox').hidden = true;
  if (e.key === 'Enter' && e.target.matches?.('.thumb')) e.target.click();
});
$('#dlg-new [data-close]').addEventListener('click', () => $('#dlg-new').close());
window.addEventListener('hashchange', route);

api.onSignedOut(() => { state.session = null; renderLogin('Sua sessão expirou. Entre novamente.'); });

// ---------------------------------------------------------------- início
(async () => {
  try { state.session = await api.session(); } catch (e) { console.error(e); }
  route();
})();

})();
