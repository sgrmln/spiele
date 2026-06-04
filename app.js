// ============================================================
//  Dieters Boardgames — app.js
//  Tabelle: spiele
//  Spalten: id, name, verlag, autor, gruppe, genre, jahr,
//           spiel_des_jahres, typ, favorit, gespielt,
//           spieleranzahl, bgg_rating, notizen, created_at
// ============================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let games      = [];
let layout     = 'grid';
let currentId  = null;
let editingId  = null;
let filterView = 'alle';
let filterGenre  = '';
let filterTyp    = '';
let filterVerlag = '';
let filterSdj    = false;

const ICONS = ['♟','♜','♞','♛','♙','♚','🎲','🎯'];
const icon  = id => ICONS[Math.abs(id) % ICONS.length];

function sync(state) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  dot.className = 'sync-dot' + (state==='syncing'?' syncing':state==='error'?' error':'');
  lbl.textContent = state==='syncing'?'Speichert…':state==='error'?'Fehler':'Verbunden';
}

function toast(msg, err=false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast'+(err?' error':'')+' show';
  setTimeout(()=>el.classList.remove('show'), 2500);
}

// ── Daten laden ──────────────────────────────────────────────
async function loadGames() {
  sync('syncing');
  try {
    const { data, error } = await sb.from('spiele').select('*').order('name');
    if (error) throw error;
    games = data || [];
    sync('ok');
    render(); // render NUR hier aufrufen, nach erfolgreichem Laden
  } catch(e) {
    sync('error');
    toast('Fehler beim Laden: ' + e.message, true);
    document.getElementById('game-container').innerHTML =
      '<div class="empty">Fehler beim Laden der Daten.<br>' + e.message + '</div>';
  }
}

// ── Filter ────────────────────────────────────────────────────
function filtered() {
  const q = (document.getElementById('search').value||'').toLowerCase().trim();
  return games.filter(g => {
    if (filterView==='favoriten'  && !g.favorit)  return false;
    if (filterView==='gespielt'   && !g.gespielt)  return false;
    if (filterView==='ungespielt' &&  g.gespielt)  return false;
    if (filterGenre  && g.genre  !==filterGenre)  return false;
    if (filterTyp    && g.typ    !==filterTyp)    return false;
    if (filterVerlag && g.verlag !==filterVerlag) return false;
    if (filterSdj    && !g.spiel_des_jahres)      return false;
    if (q && ![g.name,g.verlag,g.autor,g.gruppe].some(v=>(v||'').toLowerCase().includes(q))) return false;
    return true;
  });
}

function sorted(data) {
  const s = document.getElementById('sort').value;
  return [...data].sort((a,b)=>{
    if (s==='az')    return (a.name||'').localeCompare(b.name||'','de');
    if (s==='za')    return (b.name||'').localeCompare(a.name||'','de');
    if (s==='jahr')  return (parseInt(b.jahr)||0)-(parseInt(a.jahr)||0);
    if (s==='bgg')   return (parseFloat(b.bgg_rating)||0)-(parseFloat(a.bgg_rating)||0);
    if (s==='serie') return (a.gruppe||'zzz').localeCompare(b.gruppe||'zzz','de');
    if (s==='autor') return (a.autor||'').localeCompare(b.autor||'','de');
    if (s==='verlag')return (a.verlag||'').localeCompare(b.verlag||'','de');
    if (s==='neu')   return new Date(b.created_at||0)-new Date(a.created_at||0);
    return 0;
  });
}

function setViewFilter(f,btn) {
  filterView=f;
  document.querySelectorAll('[id^="vf-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function setLayout(l,btn) {
  layout=l;
  document.querySelectorAll('.view-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function applyFilters() { render(); }

// ── Sidebar ───────────────────────────────────────────────────
function buildSidebar() {
  function countMap(key) {
    const m={};
    games.forEach(g=>{ if(g[key]) m[g[key]]=(m[g[key]]||0)+1; });
    return m;
  }
  function renderGroup(id,map,active,setter) {
    const el=document.getElementById(id);
    el.innerHTML='';
    const all=document.createElement('button');
    all.className='filter-btn'+(!active?' active':'');
    all.innerHTML=`Alle <span class="count">${games.length}</span>`;
    all.onclick=()=>{ setter(''); render(); };
    el.appendChild(all);
    Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([k,v])=>{
      const b=document.createElement('button');
      b.className='filter-btn'+(active===k?' active':'');
      b.innerHTML=`${k} <span class="count">${v}</span>`;
      b.onclick=()=>{ setter(k); render(); };
      el.appendChild(b);
    });
  }
  renderGroup('genre-filters', countMap('genre'), filterGenre, v=>filterGenre=v);
  renderGroup('typ-filters',   countMap('typ'),   filterTyp,   v=>filterTyp=v);
  renderGroup('verlag-filters',countMap('verlag'),filterVerlag,v=>filterVerlag=v);

  const sdjEl=document.getElementById('sdj-filters');
  sdjEl.innerHTML='';
  const allSdj=document.createElement('button');
  allSdj.className='filter-btn'+(!filterSdj?' active':'');
  allSdj.innerHTML=`Alle <span class="count">${games.length}</span>`;
  allSdj.onclick=()=>{ filterSdj=false; render(); };
  sdjEl.appendChild(allSdj);
  const awarded=games.filter(g=>g.spiel_des_jahres).length;
  const aBtn=document.createElement('button');
  aBtn.className='filter-btn'+(filterSdj?' active':'');
  aBtn.innerHTML=`🏆 Ausgezeichnet <span class="count">${awarded}</span>`;
  aBtn.onclick=()=>{ filterSdj=true; render(); };
  sdjEl.appendChild(aBtn);

  document.getElementById('cnt-alle').textContent     = games.length;
  document.getElementById('cnt-fav').textContent      = games.filter(g=>g.favorit).length;
  document.getElementById('cnt-played').textContent   = games.filter(g=>g.gespielt).length;
  document.getElementById('cnt-unplayed').textContent = games.filter(g=>!g.gespielt).length;
  document.getElementById('stat-total').textContent   = games.length+' Spiele';
}

// ── Badges ────────────────────────────────────────────────────
function genreBadge(genre) {
  if (!genre) return '';
  let cls='tag-genre';
  if (genre.includes('Kinder')) cls='tag-kind';
  else if (genre.includes('Experten')||genre.includes('Kenner')) cls='tag-expert';
  else if (genre.includes('Party')||genre.includes('Quiz')) cls='tag-party';
  return `<span class="tag ${cls}">${genre}</span>`;
}
function typBadge(typ) {
  if (!typ||typ==='Grundspiel') return '';
  return `<span class="tag tag-erw">${typ}</span>`;
}

// ── Kachel ────────────────────────────────────────────────────
function cardHTML(g) {
  const bgg=g.bgg_rating?`<div class="card-bgg">★ ${parseFloat(g.bgg_rating).toFixed(1)}</div>`:'';
  return `<div class="game-card${g.favorit?' favorit':''}" onclick="openPanel(${g.id})">
    <div class="card-cover"><span class="card-icon">${icon(g.id)}</span></div>
    <div class="card-btns">
      <button class="icon-btn${g.favorit?' fav':''}" onclick="event.stopPropagation();toggleFav(${g.id})">★</button>
      <button class="icon-btn${g.gespielt?' played':''}" onclick="event.stopPropagation();togglePlayed(${g.id})">✓</button>
    </div>
    <div class="card-body">
      <div class="card-title">${g.name}</div>
      <div class="card-tags">${genreBadge(g.genre)}${typBadge(g.typ)}</div>
      <div class="card-sub">${[g.verlag,g.jahr].filter(Boolean).join(' · ')}</div>
      ${bgg}
    </div>
  </div>`;
}

// ── Zeile ─────────────────────────────────────────────────────
function rowHTML(g) {
  const bgg=g.bgg_rating?`<span class="row-bgg">★ ${parseFloat(g.bgg_rating).toFixed(1)}</span>`:'';
  const sub=[g.verlag,g.autor?g.autor.split(',')[0].trim():'',g.gruppe,g.jahr].filter(Boolean).join(' · ');
  return `<div class="game-row${g.favorit?' favorit':''}" onclick="openPanel(${g.id})">
    <div class="row-icon">${icon(g.id)}</div>
    <div class="row-info">
      <div class="row-title">${g.name}</div>
      <div class="row-sub">${sub}</div>
    </div>
    <div class="row-tags">${genreBadge(g.genre)}${typBadge(g.typ)}</div>
    ${g.spiel_des_jahres?`<span class="tag tag-sdj" title="${g.spiel_des_jahres}">🏆</span>`:''}
    ${bgg}
    <div class="row-btns">
      <button class="icon-btn${g.favorit?' fav':''}" onclick="event.stopPropagation();toggleFav(${g.id})">★</button>
      <button class="icon-btn${g.gespielt?' played':''}" onclick="event.stopPropagation();togglePlayed(${g.id})">✓</button>
    </div>
  </div>`;
}

// ── Render ────────────────────────────────────────────────────
function render() {
  buildSidebar();
  const data=sorted(filtered());
  const el=document.getElementById('game-container');
  document.getElementById('view-label').textContent=`${data.length} Spiel${data.length!==1?'e':''}`;

  if (!data.length) { el.innerHTML='<div class="empty">Keine Spiele gefunden.</div>'; return; }

  if (layout==='list') {
    el.innerHTML=`<div class="game-list">${data.map(rowHTML).join('')}</div>`;
  } else if (layout==='grid') {
    el.innerHTML=`<div class="game-grid">${data.map(cardHTML).join('')}</div>`;
  } else {
    const groups={};
    data.forEach(g=>{ const k=g.gruppe||'__'; if(!groups[k]) groups[k]=[]; groups[k].push(g); });
    const keys=Object.keys(groups).filter(k=>k!=='__').sort((a,b)=>a.localeCompare(b,'de'));
    const einzel=groups['__']||[];
    let html='';
    keys.forEach(k=>{
      html+=`<div class="group-block"><div class="group-title">${k} <span class="group-count">${groups[k].length} Titel</span></div><div class="game-list">${groups[k].map(rowHTML).join('')}</div></div>`;
    });
    if (einzel.length) {
      html+=`<div class="group-block"><div class="group-title">Einzeltitel <span class="group-count">${einzel.length}</span></div><div class="game-list">${einzel.map(rowHTML).join('')}</div></div>`;
    }
    el.innerHTML=html;
  }
}

// ── Detail Panel ──────────────────────────────────────────────
function openPanel(id) {
  currentId=id;
  const g=games.find(x=>x.id===id);
  if (!g) return;
  document.getElementById('dp-title').textContent     =g.name||'–';
  document.getElementById('dp-fav-btn').textContent   =g.favorit ?'★ Favorit entfernen':'☆ Als Favorit';
  document.getElementById('dp-played-btn').textContent=g.gespielt?'✓ Als ungespielt'   :'○ Als gespielt';
  document.getElementById('dp-bgg').value  =g.bgg_rating||'';
  document.getElementById('dp-notes').value=g.notizen||'';
  const rows=[
    ['Verlag',        g.verlag||'–'],
    ['Autor',         g.autor||'–'],
    ['Gruppe / Serie',g.gruppe||'–'],
    ['Jahr',          g.jahr||'–'],
    ['Genre',         g.genre||'–'],
    ['Typ',           g.typ||'–'],
    ['Auszeichnung',  g.spiel_des_jahres||'–'],
    ['Spieleranzahl', g.spieleranzahl||'–'],
  ];
  document.getElementById('dp-rows').innerHTML=rows.map(([l,v])=>
    `<div class="panel-row"><span class="pr-label">${l}</span><span class="pr-val">${v}</span></div>`
  ).join('');
  document.getElementById('panel-overlay').classList.add('open');
  document.getElementById('detail-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('panel-overlay').classList.remove('open');
  document.getElementById('detail-panel').classList.remove('open');
  currentId=null;
}

async function toggleFavPanel()    { if(currentId){await toggleFav(currentId);    openPanel(currentId);} }
async function togglePlayedPanel() { if(currentId){await togglePlayed(currentId); openPanel(currentId);} }

async function toggleFav(id) {
  const g=games.find(x=>x.id===id); const v=!g.favorit;
  sync('syncing');
  const {error}=await sb.from('spiele').update({favorit:v}).eq('id',id);
  if(error){sync('error');toast('Fehler: '+error.message,true);return;}
  g.favorit=v; sync('ok'); render(); toast(v?'★ Favorit hinzugefügt':'Aus Favoriten entfernt');
}

async function togglePlayed(id) {
  const g=games.find(x=>x.id===id); const v=!g.gespielt;
  sync('syncing');
  const {error}=await sb.from('spiele').update({gespielt:v}).eq('id',id);
  if(error){sync('error');toast('Fehler: '+error.message,true);return;}
  g.gespielt=v; sync('ok'); render(); toast(v?'✓ Als gespielt markiert':'Als ungespielt markiert');
}

async function saveBGGNotes() {
  if(!currentId) return;
  const bgg=document.getElementById('dp-bgg').value;
  const notes=document.getElementById('dp-notes').value;
  sync('syncing');
  const {error}=await sb.from('spiele').update({bgg_rating:bgg||null,notizen:notes}).eq('id',currentId);
  if(error){sync('error');toast('Fehler: '+error.message,true);return;}
  const g=games.find(x=>x.id===currentId);
  if(g){g.bgg_rating=bgg;g.notizen=notes;}
  sync('ok'); render(); toast('Gespeichert ✓');
}

// ── Modal ─────────────────────────────────────────────────────
function openAdd() {
  editingId=null;
  document.getElementById('modal-title').textContent='Spiel hinzufügen';
  ['f-name','f-verlag','f-autor','f-gruppe','f-jahr','f-sdj','f-spieler','f-bgg','f-notes']
    .forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-genre').value='Familienspiel';
  document.getElementById('f-typ').value='Grundspiel';
  document.getElementById('delete-btn').style.display='none';
  document.getElementById('modal-overlay').classList.add('open');
}

function openEdit() {
  if(!currentId) return;
  const g=games.find(x=>x.id===currentId);
  editingId=currentId;
  document.getElementById('modal-title').textContent='Spiel bearbeiten';
  document.getElementById('f-name').value   =g.name||'';
  document.getElementById('f-verlag').value =g.verlag||'';
  document.getElementById('f-autor').value  =g.autor||'';
  document.getElementById('f-gruppe').value =g.gruppe||'';
  document.getElementById('f-jahr').value   =g.jahr||'';
  document.getElementById('f-sdj').value    =g.spiel_des_jahres||'';
  document.getElementById('f-spieler').value=g.spieleranzahl||'';
  document.getElementById('f-genre').value  =g.genre||'Familienspiel';
  document.getElementById('f-typ').value    =g.typ||'Grundspiel';
  document.getElementById('f-bgg').value    =g.bgg_rating||'';
  document.getElementById('f-notes').value  =g.notizen||'';
  document.getElementById('delete-btn').style.display='';
  closePanel();
  document.getElementById('modal-overlay').classList.add('open');
}

async function saveGame() {
  const name=document.getElementById('f-name').value.trim();
  if(!name){toast('Bitte Spielname eingeben',true);return;}
  const payload={
    name,
    verlag:          document.getElementById('f-verlag').value.trim()||null,
    autor:           document.getElementById('f-autor').value.trim()||null,
    gruppe:          document.getElementById('f-gruppe').value.trim()||null,
    jahr:            document.getElementById('f-jahr').value.trim()||null,
    spiel_des_jahres:document.getElementById('f-sdj').value.trim()||null,
    spieleranzahl:   document.getElementById('f-spieler').value.trim()||null,
    genre:           document.getElementById('f-genre').value,
    typ:             document.getElementById('f-typ').value,
    bgg_rating:      document.getElementById('f-bgg').value||null,
    notizen:         document.getElementById('f-notes').value||null,
  };
  const btn=document.getElementById('save-btn');
  btn.disabled=true; sync('syncing');
  if(editingId) {
    const {error}=await sb.from('spiele').update(payload).eq('id',editingId);
    if(error){sync('error');toast('Fehler: '+error.message,true);btn.disabled=false;return;}
    Object.assign(games.find(x=>x.id===editingId),payload);
    toast('Aktualisiert ✓');
  } else {
    const {data,error}=await sb.from('spiele').insert([payload]).select().single();
    if(error){sync('error');toast('Fehler: '+error.message,true);btn.disabled=false;return;}
    games.push(data); toast('Hinzugefügt ✓');
  }
  sync('ok'); btn.disabled=false; closeModal(null); render();
}

async function deleteGame() {
  if(!editingId) return;
  if(!confirm('Spiel wirklich löschen?')) return;
  sync('syncing');
  const {error}=await sb.from('spiele').delete().eq('id',editingId);
  if(error){sync('error');toast('Fehler: '+error.message,true);return;}
  games=games.filter(x=>x.id!==editingId);
  sync('ok'); closeModal(null); render(); toast('Gelöscht');
}

function closeModal(e) {
  if(e&&e.target!==document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  editingId=null;
}

// ── Start ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', loadGames);
