// ============================================================
//  Dieters Boardgames – app.js
//  Neue Spalten: autor, gruppe, jahrgang, spiel_des_jahres, typ
// ============================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let games = [];
let activeViewFilter = 'alle';
let activeGenre = '';
let activeTyp = '';
let activeVerlag = '';
let activeSdj = '';
let layout = 'grid'; // Standard: Kacheln
let currentGameId = null;
let editingId = null;

// ── Icons für Kachel-Cover ───────────────────────────────────
const COVER_ICONS = ['♟', '🎲', '♜', '♞', '🃏', '♛', '🎯', '♙'];
function coverIcon(id) { return COVER_ICONS[id % COVER_ICONS.length]; }

function setSyncStatus(state) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  dot.className = 'sync-dot' + (state==='syncing'?' syncing':state==='error'?' error':'');
  lbl.textContent = state==='syncing'?'Speichert…':state==='error'?'Fehler':'Verbunden';
}

async function loadGames() {
  setSyncStatus('syncing');
  const { data, error } = await sb.from('spiele').select('*').order('name');
  if (error) { setSyncStatus('error'); toast('Fehler: '+error.message, true); return; }
  games = data || [];
  setSyncStatus('ok');
  applyFilters();
}

// ── FILTER ────────────────────────────────────────────────────
function getFiltered() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  return games.filter(g => {
    if (activeViewFilter==='favoriten' && !g.favorit) return false;
    if (activeViewFilter==='gespielt'  && !g.gespielt) return false;
    if (activeViewFilter==='ungespielt'&& g.gespielt)  return false;
    if (activeGenre  && g.genre   !== activeGenre)  return false;
    if (activeTyp    && g.typ     !== activeTyp)     return false;
    if (activeVerlag && g.verlag  !== activeVerlag)  return false;
    if (activeSdj === 'ausgezeichnet' && !g.spiel_des_jahres) return false;
    if (q && !g.name?.toLowerCase().includes(q)
          && !g.verlag?.toLowerCase().includes(q)
          && !(g.gruppe||'').toLowerCase().includes(q)
          && !(g.autor||'').toLowerCase().includes(q)) return false;
    return true;
  });
}

function getSorted(data) {
  const s = document.getElementById('sort').value;
  return [...data].sort((a,b) => {
    if (s==='az')    return (a.name||'').localeCompare(b.name||'','de');
    if (s==='za')    return (b.name||'').localeCompare(a.name||'','de');
    if (s==='bgg')   return (parseFloat(b.bgg_rating)||0)-(parseFloat(a.bgg_rating)||0);
    if (s==='serie') return (a.gruppe||'zzz').localeCompare(b.gruppe||'zzz','de');
    if (s==='autor') return (a.autor||'').localeCompare(b.autor||'','de');
    if (s==='verlag')return (a.verlag||'').localeCompare(b.verlag||'','de');
    if (s==='jahr')  return (parseInt(b.jahrgang)||0)-(parseInt(a.jahrgang)||0);
    if (s==='neu')   return new Date(b.created_at||0)-new Date(a.created_at||0);
    return 0;
  });
}

function setViewFilter(f, btn) {
  activeViewFilter = f;
  document.querySelectorAll('[id^="vf-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function setLayout(l, btn) {
  layout = l;
  document.querySelectorAll('.view-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const data = getSorted(getFiltered());
  updateSidebar();
  updateCounts();
  renderGames(data);
}

function updateCounts() {
  document.getElementById('stat-total').textContent = `${games.length} Spiele`;
  document.getElementById('cnt-alle').textContent   = games.length;
  document.getElementById('cnt-fav').textContent    = games.filter(g=>g.favorit).length;
  document.getElementById('cnt-played').textContent = games.filter(g=>g.gespielt).length;
  document.getElementById('cnt-unplayed').textContent = games.filter(g=>!g.gespielt).length;
}

function updateSidebar() {
  function countMap(key) {
    const m={};
    games.forEach(g=>{ const v=g[key]; if(v) m[v]=(m[v]||0)+1; });
    return m;
  }
  function renderGroup(containerId, map, activeVal, setter) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn' + (!activeVal?' active':'');
    allBtn.innerHTML = `Alle <span class="count">${games.length}</span>`;
    allBtn.onclick = () => { setter(''); applyFilters(); };
    el.appendChild(allBtn);
    Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([k,v])=>{
      const b = document.createElement('button');
      b.className = 'filter-btn' + (activeVal===k?' active':'');
      b.innerHTML = `${k} <span class="count">${v}</span>`;
      b.onclick = () => { setter(k); applyFilters(); };
      el.appendChild(b);
    });
  }
  renderGroup('genre-filters',  countMap('genre'),  activeGenre,  v=>activeGenre=v);
  renderGroup('typ-filters',    countMap('typ'),     activeTyp,    v=>activeTyp=v);
  renderGroup('verlag-filters', countMap('verlag'),  activeVerlag, v=>activeVerlag=v);

  // SdJ filter
  const sdjEl = document.getElementById('sdj-filters');
  sdjEl.innerHTML = '';
  const allSdj = document.createElement('button');
  allSdj.className = 'filter-btn' + (!activeSdj?' active':'');
  allSdj.innerHTML = `Alle <span class="count">${games.length}</span>`;
  allSdj.onclick = () => { activeSdj=''; applyFilters(); };
  sdjEl.appendChild(allSdj);
  const awardCount = games.filter(g=>g.spiel_des_jahres).length;
  const awardBtn = document.createElement('button');
  awardBtn.className = 'filter-btn' + (activeSdj==='ausgezeichnet'?' active':'');
  awardBtn.innerHTML = `🏆 Ausgezeichnet <span class="count">${awardCount}</span>`;
  awardBtn.onclick = () => { activeSdj='ausgezeichnet'; applyFilters(); };
  sdjEl.appendChild(awardBtn);
}

// ── BADGES ────────────────────────────────────────────────────
function genreBadge(genre) {
  if (!genre) return '';
  let cls = 'genre-tag';
  if (genre.includes('Kinder'))  cls = 'kind-tag';
  else if (genre.includes('Experten') || genre.includes('Kenner')) cls = 'expert-tag';
  else if (genre.includes('Party') || genre.includes('Quiz'))      cls = 'party-tag';
  return `<span class="tag ${cls}">${genre}</span>`;
}

function typBadge(typ) {
  if (!typ || typ==='Grundspiel') return '';
  return `<span class="tag erw-tag">${typ}</span>`;
}

function sdjBadge(sdj) {
  if (!sdj) return '';
  // Shorten for display
  const short = sdj
    .replace('Spiel des Jahres','SdJ')
    .replace('Kennerspiel des Jahres','KdJ')
    .replace('Kinderspiel des Jahres','KiJ')
    .replace(' (Gewinner)','★')
    .replace(' (Nominiert)','◆')
    .replace(' (Empfehlungsliste)','◇');
  return `<span class="tag sdj-tag" title="${sdj}">🏆 ${short}</span>`;
}

// ── GRID CARD ─────────────────────────────────────────────────
function cardHTML(g) {
  const bgg = g.bgg_rating ? `<div class="card-bgg">★ ${parseFloat(g.bgg_rating).toFixed(1)}</div>` : '';
  return `<div class="game-card${g.favorit?' favorit':''}" onclick="openPanel(${g.id})">
    <div class="card-cover">
      <span class="card-cover-icon">${coverIcon(g.id)}</span>
    </div>
    <div class="card-icons">
      <button class="icon-btn${g.favorit?' active-fav':''}" onclick="event.stopPropagation();toggleFav(${g.id})" title="Favorit">★</button>
      <button class="icon-btn${g.gespielt?' active-played':''}" onclick="event.stopPropagation();togglePlayed(${g.id})" title="Gespielt">✓</button>
    </div>
    <div class="card-body">
      <div class="card-title">${g.name}</div>
      <div class="card-meta">${genreBadge(g.genre)}${typBadge(g.typ)}</div>
      <div class="card-sub">${[g.verlag, g.jahrgang ? g.jahrgang : ''].filter(Boolean).join(' · ')}</div>
      ${bgg}
    </div>
  </div>`;
}

// ── LIST ROW ──────────────────────────────────────────────────
function rowHTML(g) {
  const bgg = g.bgg_rating ? `<span class="row-bgg">★ ${parseFloat(g.bgg_rating).toFixed(1)}</span>` : '';
  return `<div class="game-row${g.favorit?' favorit':''}" onclick="openPanel(${g.id})">
    <div class="row-avatar">
      <span class="row-avatar-icon">${coverIcon(g.id)}</span>
    </div>
    <div class="row-info">
      <div class="row-title">${g.name}</div>
      <div class="row-sub">
        <span>${g.verlag||''}</span>
        ${g.autor?`<span class="dot">·</span><span>${g.autor.split(',')[0].trim()}</span>`:''}
        ${g.gruppe?`<span class="dot">·</span><span>${g.gruppe}</span>`:''}
        ${g.jahrgang?`<span class="dot">·</span><span>${g.jahrgang}</span>`:''}
      </div>
    </div>
    <div class="row-tags">${genreBadge(g.genre)}${typBadge(g.typ)}</div>
    ${g.spiel_des_jahres?`<span class="tag sdj-tag" title="${g.spiel_des_jahres}" style="font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis">🏆</span>`:''}
    ${bgg}
    <div class="row-icons">
      <button class="icon-btn${g.favorit?' active-fav':''}" onclick="event.stopPropagation();toggleFav(${g.id})" title="Favorit">★</button>
      <button class="icon-btn${g.gespielt?' active-played':''}" onclick="event.stopPropagation();togglePlayed(${g.id})" title="Gespielt">✓</button>
    </div>
  </div>`;
}

// ── RENDER ────────────────────────────────────────────────────
function renderGames(data) {
  const el = document.getElementById('game-container');
  document.getElementById('view-label').textContent = `${data.length} Spiel${data.length!==1?'e':''}`;
  if (!data.length) { el.innerHTML = `<div class="empty">Keine Spiele gefunden.</div>`; return; }

  if (layout==='list') {
    el.innerHTML = `<div class="game-list">${data.map(rowHTML).join('')}</div>`;
  } else if (layout==='grid') {
    el.innerHTML = `<div class="game-grid">${data.map(cardHTML).join('')}</div>`;
  } else {
    // GROUP by Gruppe/Serie
    const groups = {};
    data.forEach(g => {
      const k = g.gruppe || '__';
      if (!groups[k]) groups[k] = [];
      groups[k].push(g);
    });
    const serieKeys = Object.keys(groups).filter(k=>k!=='__').sort((a,b)=>a.localeCompare(b,'de'));
    const einzel = groups['__'] || [];
    let html = '';
    serieKeys.forEach(k => {
      html += `<div class="group-section">
        <div class="group-heading">${k} <span class="gh-count">${groups[k].length} Titel</span></div>
        <div class="game-list">${groups[k].map(rowHTML).join('')}</div>
      </div>`;
    });
    if (einzel.length) {
      html += `<div class="group-section">
        <div class="group-heading">Einzeltitel <span class="gh-count">${einzel.length} Spiele</span></div>
        <div class="game-list">${einzel.map(rowHTML).join('')}</div>
      </div>`;
    }
    el.innerHTML = html;
  }
}

// ── DETAIL PANEL ──────────────────────────────────────────────
function openPanel(id) {
  currentGameId = id;
  const g = games.find(x=>x.id===id);
  if (!g) return;

  // Cover — neutral grid pattern (no color/letter)
  document.getElementById('dp-cover-wrap').innerHTML = '';

  document.getElementById('dp-title').textContent = g.name;
  document.getElementById('dp-fav-btn').innerHTML = g.favorit ? '★ Favorit entfernen' : '☆ Als Favorit';
  document.getElementById('dp-played-btn').innerHTML = g.gespielt ? '✓ Als ungespielt' : '○ Als gespielt';
  document.getElementById('dp-bgg').value = g.bgg_rating || '';
  document.getElementById('dp-notes').value = g.notizen || '';

  const rows = [
    ['Verlag',        g.verlag       || '–'],
    ['Autor',         g.autor        || '–'],
    ['Gruppe / Serie',g.gruppe       || '–'],
    ['Jahrgang',      g.jahrgang     || '–'],
    ['Genre',         g.genre        || '–'],
    ['Typ',           g.typ          || '–'],
    ['Auszeichnung',  g.spiel_des_jahres || '–'],
    ['Spieleranzahl', g.spieleranzahl|| '–'],
  ];

  document.getElementById('dp-rows').innerHTML = rows.map(([l,v]) =>
    `<div class="panel-row"><span class="pr-label">${l}</span><span class="pr-val">${v}</span></div>`
  ).join('');

  document.getElementById('panel-overlay').classList.add('open');
  document.getElementById('detail-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('panel-overlay').classList.remove('open');
  document.getElementById('detail-panel').classList.remove('open');
  currentGameId = null;
}

async function toggleFavPanel()    { if(currentGameId){await toggleFav(currentGameId);   openPanel(currentGameId);} }
async function togglePlayedPanel() { if(currentGameId){await togglePlayed(currentGameId);openPanel(currentGameId);} }

async function toggleFav(id) {
  const g = games.find(x=>x.id===id);
  const v = !g.favorit;
  setSyncStatus('syncing');
  const {error} = await sb.from('spiele').update({favorit:v}).eq('id',id);
  if(error){setSyncStatus('error');toast('Fehler: '+error.message,true);return;}
  g.favorit = v; setSyncStatus('ok'); applyFilters();
  toast(v?'★ Favorit hinzugefügt':'Aus Favoriten entfernt');
}

async function togglePlayed(id) {
  const g = games.find(x=>x.id===id);
  const v = !g.gespielt;
  setSyncStatus('syncing');
  const {error} = await sb.from('spiele').update({gespielt:v}).eq('id',id);
  if(error){setSyncStatus('error');toast('Fehler: '+error.message,true);return;}
  g.gespielt = v; setSyncStatus('ok'); applyFilters();
  toast(v?'✓ Als gespielt markiert':'Als ungespielt markiert');
}

async function saveBGGNotes() {
  if(!currentGameId) return;
  const bgg   = document.getElementById('dp-bgg').value;
  const notes = document.getElementById('dp-notes').value;
  setSyncStatus('syncing');
  const {error} = await sb.from('spiele').update({bgg_rating:bgg||null,notizen:notes}).eq('id',currentGameId);
  if(error){setSyncStatus('error');toast('Fehler: '+error.message,true);return;}
  const g = games.find(x=>x.id===currentGameId);
  if(g){g.bgg_rating=bgg;g.notizen=notes;}
  setSyncStatus('ok'); applyFilters(); toast('Gespeichert ✓');
}

// ── MODAL ADD/EDIT ────────────────────────────────────────────
function openAdd() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Spiel hinzufügen';
  ['f-name','f-verlag','f-autor','f-gruppe','f-jahrgang','f-sdj','f-spieler','f-bgg','f-notes'].forEach(id=>{
    document.getElementById(id).value='';
  });
  document.getElementById('f-genre').value = 'Familienspiel';
  document.getElementById('f-typ').value   = 'Grundspiel';
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('modal-overlay').classList.add('open');
}

function openEdit() {
  if(!currentGameId) return;
  const g = games.find(x=>x.id===currentGameId);
  editingId = currentGameId;
  document.getElementById('modal-title').textContent = 'Spiel bearbeiten';
  document.getElementById('f-name').value     = g.name            || '';
  document.getElementById('f-verlag').value   = g.verlag          || '';
  document.getElementById('f-autor').value    = g.autor           || '';
  document.getElementById('f-gruppe').value   = g.gruppe          || '';
  document.getElementById('f-jahrgang').value = g.jahrgang        || '';
  document.getElementById('f-sdj').value      = g.spiel_des_jahres|| '';
  document.getElementById('f-spieler').value  = g.spieleranzahl   || '';
  document.getElementById('f-genre').value    = g.genre           || 'Familienspiel';
  document.getElementById('f-typ').value      = g.typ             || 'Grundspiel';
  document.getElementById('f-bgg').value      = g.bgg_rating      || '';
  document.getElementById('f-notes').value    = g.notizen         || '';
  document.getElementById('delete-btn').style.display = '';
  closePanel();
  document.getElementById('modal-overlay').classList.add('open');
}

async function saveGame() {
  const name = document.getElementById('f-name').value.trim();
  if(!name){toast('Bitte Spielname eingeben',true);return;}
  const payload = {
    name,
    verlag:          document.getElementById('f-verlag').value.trim()   || null,
    autor:           document.getElementById('f-autor').value.trim()    || null,
    gruppe:          document.getElementById('f-gruppe').value.trim()   || null,
    jahrgang:        document.getElementById('f-jahrgang').value.trim() || null,
    spiel_des_jahres:document.getElementById('f-sdj').value.trim()      || null,
    spieleranzahl:   document.getElementById('f-spieler').value.trim()  || null,
    genre:           document.getElementById('f-genre').value,
    typ:             document.getElementById('f-typ').value,
    bgg_rating:      document.getElementById('f-bgg').value             || null,
    notizen:         document.getElementById('f-notes').value           || null,
  };
  const btn = document.getElementById('save-btn');
  btn.disabled = true; setSyncStatus('syncing');
  if(editingId) {
    const {error} = await sb.from('spiele').update(payload).eq('id',editingId);
    if(error){setSyncStatus('error');toast('Fehler: '+error.message,true);btn.disabled=false;return;}
    Object.assign(games.find(x=>x.id===editingId), payload);
    toast('Spiel aktualisiert ✓');
  } else {
    const {data,error} = await sb.from('spiele').insert([payload]).select().single();
    if(error){setSyncStatus('error');toast('Fehler: '+error.message,true);btn.disabled=false;return;}
    games.push(data); toast('Spiel hinzugefügt ✓');
  }
  setSyncStatus('ok'); btn.disabled=false; closeModal(null); applyFilters();
}

async function deleteGame() {
  if(!editingId) return;
  if(!confirm('Spiel wirklich löschen?')) return;
  setSyncStatus('syncing');
  const {error} = await sb.from('spiele').delete().eq('id',editingId);
  if(error){setSyncStatus('error');toast('Fehler: '+error.message,true);return;}
  games = games.filter(x=>x.id!==editingId);
  setSyncStatus('ok'); closeModal(null); applyFilters(); toast('Spiel gelöscht');
}

function closeModal(e) {
  if(e && e.target!==document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

function toast(msg, isError=false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (isError?' error':'');
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2400);
}

loadGames();
