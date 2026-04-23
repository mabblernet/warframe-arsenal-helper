# Warframe Arsenal Tracker

A mobile-friendly web app for tracking your Warframe weapon collection across all Primary, Secondary and Melee weapons in the game.

## Features

- 🌐 **Live data** — weapon list fetched from the community Warframe API on every load, always current
- 🔍 Filter by type, subtype, name search, tier, owned status
- ⭐ Track mastery (Level 30+) and ownership per weapon, saved per profile
- 🔥 Community tier ratings (Mastery Fodder → Endgame) where available
- 💀 Acquisition difficulty scale (1–5) auto-derived from API data
- ✅ Keep / Sell / Situational recommendation per weapon
- 📜 Quest reward labels with quest name (links to wiki)
- ⚒ Component lists with farming locations (from API)
- 🖼 Weapon images from WFCD community CDN
- ⚠ "Unreviewed" badge on weapons without human-verified evaluations
- 📢 Update banner when a significant portion of weapons lack curated data
- 💾 Persistent local storage per named profile
- 📱 Fully responsive for iOS Safari and desktop

---

## How it works — data architecture

The app uses a **two-layer hybrid approach**:

### Layer 1 — Live API (automatic, always current)
Fetched at page load from `https://api.warframestat.us/weapons?language=en` (community-maintained, free, no key required):
- Weapon name, type, subtype
- Mastery requirement
- Components and drop locations
- Images (via `cdn.warframestat.us`)
- Wiki URL

This means **new weapons added by DE appear automatically** the next time someone opens the app.

### Layer 2 — Curated judgement data (`curated.json`)
Stored in `curated.json` (loaded in parallel with the API at runtime). Contains fields that **cannot be derived from stats alone** and require experienced player knowledge:

| Field | What it means |
|---|---|
| `tier` | `"endgame"` / `"good"` / `"average"` / `"fodder"` |
| `acquisitionDifficulty` | 1 (trivial) → 5 (extremely hard) |
| `acquisition` | Acquisition method category |
| `keepSell` | `"keep"` / `"sell"` / `"situational"` |
| `tierNote` | Short community verdict |
| `questReward` | Quest name if applicable |
| `reviewed` | `true` = human-verified, `false` = auto-stub |

Weapons with `reviewed: false` have auto-estimated values: tier is derived from the weapon's **riven disposition** (DE sets disposition inversely to usage/strength — disposition 1 = meta, disposition 5 = underperformer), and acquisition type is classified from API tags. These are marked with an **⚠ Unreviewed** badge and should be treated as rough guidance only. Unreviewed weapons hide the Keep/Sell badge and obtainability dots — they show "Obtainability: not yet evaluated" instead. See **Updating Curated Data** below for the full methodology.

> **Important:** Tier ratings and keep/sell recommendations reflect the community meta at the time of last update. The Warframe meta shifts with major updates. An "endgame" weapon today may be outclassed after a balance patch.

---

## Deploying to GitHub Pages

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Name it `warframe-arsenal` (or anything you like)
4. Set to **Public** (required for free GitHub Pages)
5. Click **Create repository**

### Step 2 — Upload the files

**Via GitHub web interface:**
1. On your new repo page, click **Add file** → **Upload files**
2. Upload both `index.html` and `curated.json`
3. Click **Commit changes**

**Via Git:**
```bash
git init
git add index.html curated.json README.md
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/warframe-arsenal.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repository → **Settings**
2. Click **Pages** in the left sidebar
3. Under **Source**, select **Deploy from a branch**
4. Set branch to **main**, folder to **/ (root)**
5. Click **Save**

Your app will be live at:
`https://YOUR_USERNAME.github.io/warframe-arsenal/`

(Takes 1–2 minutes to go live. Share this URL with friends — no install needed.)

> **Note:** Both `index.html` and `curated.json` must be served from the same origin for the fetch to work. GitHub Pages handles this automatically. Opening `index.html` directly as a local file (`file://`) will fail the `curated.json` fetch — use a local web server for local testing (e.g. `python3 -m http.server`).

---

## Updating the app

### When DE releases a new Warframe update

New weapons appear **automatically** — the live API is updated by the community within hours of each patch.

What you may need to manually update:
- Curated tier/difficulty/keep-sell data for any new weapons (edit `curated.json`)
- Accuracy of existing entries if balance patches change the meta

The app will show an **⚠ update banner** if more than 25% of loaded weapons are missing curated evaluations.

---

## Updating Curated Data (Claude Code workflow)

Curated judgement data lives in **`curated.json`** — a standalone JSON file separate from `index.html`. This means Claude Code sessions only need to read and write the small data file rather than the entire HTML file, dramatically reducing token usage.

### How auto-estimated stubs work

When a weapon has no curated entry (or `reviewed: false`), the app shows an **⚠ Unreviewed** badge and hides the Keep/Sell recommendation. The auto-estimated values are generated using this methodology:

**Tier — Riven Disposition Proxy**

DE's riven disposition (1–5) is inversely correlated with weapon usage and meta strength. Disposition 1 = most popular/strongest; disposition 5 = weakest/least used.

| Disposition | Estimated Tier |
|---|---|
| 1 | `endgame` |
| 2 | `good` |
| 3 | `average` |
| 4 | `average` |
| 5 | `fodder` |

Tag-based overrides applied on top:
- Kuva Lich / Tenet weapons → never below `good` (DE sets these dispositions conservatively)
- Prime weapons → never `fodder`

**Acquisition — API Tag Classification**

| API tag / field | Acquisition type | Difficulty |
|---|---|---|
| Tag: Kuva Lich | `lich` | 4 |
| Tag: Tenet | `sister` | 4 |
| Tag: Prime | `relic` | 5 |
| Tag: Wraith / Vandal / Prisma / Baro | `event` | 5 |
| Tag: Syndicate faction (Steel Meridian, Red Veil, etc.) | `syndicate` | 4 |
| Tag: Zariman / Entrati | `syndicate` | 4 |
| Tag: Stalker / drop text contains "Stalker" | `boss` | 5 |
| Tag: Duviri / Incarnon | `market` | 3 |
| Tag: Scaldra | `market` | 2 |
| Has `marketCost`, no `bpCost` | `market` | 1 |
| Has `bpCost` | `blueprint` | 2 |
| Drop text: "Simaris" | `syndicate` | 4 |
| Railjack drop text | `railjack` | 5 |
| Not tradable, no drops, no market/bp | `quest` | 4 |

**keepSell estimation:**
- `lich`, `sister`, `relic`, `boss`, `event`, `quest`, `railjack` → `keep`
- `fodder` tier → `sell`
- everything else → `situational`

> **Important:** These are rough estimates, not community verdicts. Always override with `reviewed: true` and accurate values when you have real knowledge of a weapon's performance.

---

### Full update (after a major patch with new weapons)

Fetch the API and run the stub generator:

```bash
# 1. Fetch API data (curl required — API blocks Python's default UA)
curl -s -A "Mozilla/5.0" "https://api.warframestat.us/weapons/?language=en" -o /tmp/weapons.json

# 2. Run the generator (already in the repo)
python3 generate_stubs.py
```

The script applies the full methodology above (disposition proxy + tag classification) and writes only missing entries into `curated.json`.

Alternatively, open Claude Code and paste:

```
A cached API response is at /tmp/weapons.json (fetch it fresh first with:
  curl -s -A "Mozilla/5.0" "https://api.warframestat.us/weapons/?language=en" -o /tmp/weapons.json
)

Compare weapon names against keys in curated.json. For every Primary, Secondary,
or non-modular Melee weapon not already present, add a stub entry with:
  - reviewed: false
  - tier: derived from riven disposition (1→endgame, 2→good, 3–4→average, 5→fodder),
    with Kuva/Tenet weapons upgraded to at least "good" and Prime to at least "average"
  - acquisition: classified from API tags (Kuva Lich→lich, Tenet→sister, Prime→relic,
    Wraith/Vandal/Prisma/Baro→event, Stalker→boss, syndicate faction tags→syndicate,
    Zariman/Entrati→syndicate, Duviri→market, marketCost only→market, bpCost→blueprint)
  - acquisitionDifficulty: per acquisition type (market=1, blueprint=2, clan/dojo=3,
    syndicate/lich/sister/quest=4, relic/boss/event/railjack=5)
  - keepSell: "keep" for hard-to-get types, "sell" for fodder, otherwise "situational"
  - tierNote: ""

Apply the same weapon filter as index.html: VALID_TYPES = {Primary, Secondary, Melee},
exclude excludeFromCodex=true, exclude type="Zaw Component".
Write only into curated.json. Print a summary.
```

### Evaluating specific weapons (human review)

After a patch you want to properly rate specific weapons, use **[overframe.gg tier lists](https://overframe.gg/tier-list/primary-weapons/)** as your primary reference — also check secondary and melee tabs. Note: overframe.gg is client-side rendered and **cannot be fetched by script** — open it in a browser.

Then paste into Claude Code:

```
I want to add curated evaluations for these weapons in curated.json:
[list weapon names]

For each one, look up community opinions on:
- Reddit (r/Warframe) — search "[weapon name] steel path"
- The Warframe wiki
- overframe.gg tier lists (browser required — client-side rendered)

Write entries with reviewed: true and accurate tier, acquisitionDifficulty,
keepSell, and tierNote fields. Do NOT touch index.html.
```

### Fixing stale tier ratings after a balance patch

```
The following weapons were changed in the latest Warframe update: [list them].
Update their entries in curated.json based on current community consensus.
Reference overframe.gg and r/Warframe for updated opinions.
Set reviewed: true on any entry you update.
```

---

## Adding curated data manually

Open `curated.json` in a text editor and add entries following this template:

```json
"Weapon Name": {
  "tier": "endgame",
  "acquisition": "lich",
  "acquisitionDifficulty": 4,
  "keepSell": "keep",
  "tierNote": "Short community verdict goes here.",
  "questReward": null,
  "reviewed": true
}
```

### Acquisition types

| Code | Meaning |
|---|---|
| `market` | Buy directly already built from the Market for Credits |
| `blueprint` | Buy blueprint from Market, craft with common resources |
| `relic` | Farm Void Relics, crack for Prime parts |
| `quest` | Quest reward (often impossible to re-obtain) |
| `boss` | Rare drop from specific boss (e.g. Stalker) |
| `lich` | Kuva Lich weapon (random element/bonus) |
| `sister` | Sister of Parvos weapon |
| `syndicate` | Requires Syndicate standing |
| `dojo` | Clan Dojo research required |
| `clan` | Clan research or trade with clanmates |
| `railjack` | Railjack mission drops |
| `crafted` | Kitgun or Zaw — built from vendor parts |
| `warframe` | Comes with / is part of a specific Warframe |
| `event` | Limited-time event or Baro Ki'Teer |

### Tier guide

| Tier | Meaning |
|---|---|
| `endgame` | Excellent in Steel Path, Arbitrations, Archon Hunts at any level |
| `good` | Solid and viable for most content, not the absolute best |
| `average` | Works in normal missions, struggles in Steel Path without heavy investment |
| `fodder` | Build for Mastery Rank and sell or vault |

### Obtainability score (1–5)

| Score | Meaning | Acquisition types |
|---|---|---|
| 1 | Very easy — buy already built from the Market for Credits | `market` |
| 2 | Easy — buy Blueprint and craft with common resources | `blueprint` |
| 3 | Medium — Clan Research or built from vendor parts | `clan`, `dojo`, `crafted`, `warframe` |
| 4 | Hard — Syndicate standing, Lich/Sister farming, or quest progression | `syndicate`, `lich`, `sister`, `quest` |
| 5 | Very hard — not always available, resource-consuming attempts, or highly randomized drops | `relic`, `boss`, `railjack`, `event` |

---

## Finding image names

Weapon images come from `https://cdn.warframestat.us/img/` and are loaded automatically from the API's `imageName` field. No manual image work needed.

---

## Multi-user / cross-device sync

Currently, owned/mastered data is saved in browser `localStorage` per named profile. This means:
- ✅ Persists on the same device and browser
- ❌ Does not sync between your devices automatically

**To sync across devices:** Use the same profile name on both devices and you'll have consistent data once you've set it up on both. For real-time cloud sync, Firebase Firestore can be added — ask Claude to implement it (free tier, ~15 min setup).

---

## Technical notes

- Weapon data: `https://api.warframestat.us/weapons?language=en` (WFCD — Warframe Community Developers)
- Images: `https://cdn.warframestat.us/img/` (WFCD CDN, uses DE's Public Export assets)
- No server, no build step — two files (`index.html` + `curated.json`)
- Works in Safari on iOS, Chrome, Firefox, Edge
- ZAW component parts (strikes, grips, links) are filtered from the weapon list — only complete weapons are shown

---

## License

Fan-made tool. Warframe and all associated content are property of Digital Extremes.  
Weapon data and images are sourced from community APIs and DE's Public Export — used for informational purposes only.
