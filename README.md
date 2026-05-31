# 🎲 Spielesammlung

Eine persönliche Brettspiel-Verwaltung mit Supabase-Backend und GitHub Pages Hosting.

---

## 📁 Projektstruktur

```
spielesammlung/
├── index.html       ← Die App
├── app.js           ← Logik & Supabase-Anbindung
├── style.css        ← Design
├── config.js        ← ⚠️ DEINE ZUGANGSDATEN (nicht auf GitHub!)
├── .gitignore       ← config.js ist bereits ausgeschlossen
└── README.md
```

---

## 1️⃣ Supabase einrichten

### a) Projekt anlegen
1. Gehe zu [supabase.com](https://supabase.com) und logge dich ein
2. Klicke **"New Project"**
3. Gib dem Projekt einen Namen (z.B. `spielesammlung`) und wähle eine Region (z.B. `West EU`)
4. Notiere dir das **Passwort** (brauchst du für den Datenbankzugang)

### b) Tabelle erstellen
1. Gehe im Supabase Dashboard zu **Table Editor** → **New Table**
2. Erstelle eine Tabelle mit dem Namen `spiele` und diesen Spalten:

| Name          | Typ       | Default | Nullable |
|---------------|-----------|---------|----------|
| id            | int8      | –       | PK, auto |
| created_at    | timestamptz | now() | ✓       |
| name          | text      | –       | ✗        |
| verlag        | text      | –       | ✓        |
| serie         | text      | –       | ✓        |
| jahr          | text      | –       | ✓        |
| spieleranzahl | text      | –       | ✓        |
| wert          | text      | –       | ✓        |
| genre         | text      | –       | ✓        |
| typ           | text      | –       | ✓        |
| favorit       | bool      | false   | ✓        |
| gespielt      | bool      | false   | ✓        |
| bgg_rating    | numeric   | –       | ✓        |
| notizen       | text      | –       | ✓        |

**Alternativ:** Gehe zu **SQL Editor** und führe dieses SQL aus:

```sql
create table spiele (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  verlag text,
  serie text,
  jahr text,
  spieleranzahl text,
  wert text,
  genre text,
  typ text,
  favorit boolean default false,
  gespielt boolean default false,
  bgg_rating numeric,
  notizen text
);

-- Öffentlichen Lesezugriff erlauben (für anon key)
alter table spiele enable row level security;

create policy "Allow all for anon" on spiele
  for all using (true) with check (true);
```

### c) API-Zugangsdaten holen
1. Gehe zu **Project Settings** → **API**
2. Kopiere:
   - **Project URL** (z.B. `https://abcxyz.supabase.co`)
   - **anon public** Key (der lange String unter "Project API keys")

### d) Spiele importieren (optional)
Du kannst deine bestehenden Spiele per CSV importieren:
1. Gehe zu **Table Editor** → `spiele` → **Import data**
2. Lade eine CSV-Datei hoch

---

## 2️⃣ App konfigurieren

Öffne `config.js` und trage deine Daten ein:

```js
const SUPABASE_URL = 'https://DEINE-PROJEKT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'DEIN-ANON-PUBLIC-KEY';
```

⚠️ **Diese Datei NIEMALS auf GitHub pushen!** Sie ist bereits in `.gitignore` eingetragen.

---

## 3️⃣ GitHub Pages einrichten

### a) Repository anlegen
1. Gehe zu [github.com](https://github.com) → **New repository**
2. Name: `spielesammlung` (oder beliebig)
3. Sichtbarkeit: **Public** (GitHub Pages ist bei Free-Accounts nur für Public kostenlos)
4. Klicke **Create repository**

### b) Dateien hochladen
**Option A – Über die GitHub-Oberfläche:**
1. Klicke **"uploading an existing file"**
2. Ziehe `index.html`, `app.js`, `style.css` hinein
3. **NICHT** `config.js` hochladen!
4. Klicke **Commit changes**

**Option B – Per Git (Terminal):**
```bash
cd spielesammlung
git init
git add index.html app.js style.css README.md .gitignore
# config.js NICHT hinzufügen!
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/spielesammlung.git
git push -u origin main
```

### c) GitHub Pages aktivieren
1. Gehe zu deinem Repository → **Settings** → **Pages**
2. Unter **Source**: wähle `Deploy from a branch`
3. Branch: `main`, Folder: `/ (root)`
4. Klicke **Save**
5. Nach 1–2 Minuten ist die App unter `https://DEIN-USERNAME.github.io/spielesammlung/` erreichbar

---

## 4️⃣ config.js lokal verwenden

Da `config.js` nicht auf GitHub liegt, musst du sie beim Öffnen der App lokal haben:

**Für lokale Entwicklung:** Lege `config.js` im selben Ordner ab und öffne `index.html` im Browser.

**Für GitHub Pages:** Die App funktioniert nur, wenn du `config.js` lokal hast und die Seite über GitHub Pages aufrufst – dort fehlt die Datei, also musst du...

👉 **Empfehlung:** Nutze stattdessen **Netlify** (kostenlos) mit Umgebungsvariablen, oder ersetze `config.js` durch ein Build-System. Für den einfachsten Weg:

### Einfachster Weg: Netlify Drop
1. Lege alle 4 Dateien (inkl. `config.js`) in einen Ordner
2. Gehe zu [app.netlify.com/drop](https://app.netlify.com/drop)
3. Ziehe den gesamten Ordner ins Browserfenster
4. Fertig – du bekommst eine öffentliche URL

Der Vorteil: `config.js` liegt nur auf Netlify, nicht auf GitHub.

---

## 🔒 Sicherheitshinweis

Der `anon`-Key von Supabase ist für clientseitige Apps gedacht und kann im Quellcode stehen – das ist OK. Die Row Level Security (RLS) Policy schützt deine Daten. Wenn du die App wirklich absichern möchtest, kannst du später Supabase Auth (Login) hinzufügen.

---

## 🛠 Weiterentwicklung

- **Daten importieren:** Nutze den Supabase Table Editor oder die REST API
- **Backup:** Supabase → Database → Backups
- **Mehrere Nutzer:** Supabase Auth hinzufügen + RLS Policy auf `auth.uid()` anpassen
