# Warframe Arsenal Tracker

A mobile-friendly web app for tracking your Warframe weapon collection across all Primary, Secondary and Melee weapons in the game.

## Features

- 🌐 **Live data** — weapon list fetched from the community Warframe API on every load, always current
- 🔍 Filter by type, subtype, name search, tier, owned status
- ⭐ Track mastery (Level 30+) and ownership per weapon, saved per profile
- 🔥 Community tier ratings (Mastery Fodder → Endgame) where available
- 💀 Acquisition difficulty scale (1–5) auto-derived from API data
- ✅ Keep / Sell / Situational recommendation per weapon
- 📜 Quest reward labels with quest name
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

### Layer 2 — Curated judgement data (maintained manually)
Embedded directly in the HTML as the `CURATED` JavaScript object. Contains fields that **cannot be derived from stats alone** and require experienced player knowledge:

| Field | What it means |
|---|---|
| `tier` | `"endgame"` / `"good"` / `"average"` / `"fodder"` |
| `acquisitionDifficulty` | 1 (trivial) → 5 (extremely hard) |
| `acquisition` | Acquisition method category |
| `keepSell` | `"keep"` / `"sell"` / `"situational"` |
| `tierNote` | Short community verdict |
| `questReward` | Quest name if applicable |
| `reviewed` | `true` = human-verified, `false` = auto-stub |

Weapons **not** in the curated object get auto-estimated values derived from their API data (drop location text, tradability, name patterns). These are marked with an **⚠ Unreviewed** badge and should be treated as rough guidance only.

> **Important:** Tier ratings and keep/sell recommendations reflect the community meta at the time of last update. The Warframe meta shifts with major updates. An "endgame" weapon today may be outclassed after a balance patch.

---

## Deploying to GitHub Pages

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Name it `warframe-arsenal` (or anything you like)
4. Set to **Public** (required for free GitHub Pages)
5. Click **Create repository**

### Step 2 — Upload the file

**Via GitHub web interface:**
1. On your new repo page, click **Add file** → **Upload files**
2. Upload `warframe-arsenal.html`
3. Rename it to `index.html` before committing (or rename it locally first)
4. Click **Commit changes**

**Via Git:**
```bash
git init
git add index.html README.md
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

---

## Updating the app

### When DE releases a new Warframe update

New weapons appear **automatically** — the live API is updated by the community within hours of each patch.

What you may need to manually update:
- Curated tier/difficulty/keep-sell data for any new weapons
- Accuracy of existing entries if balance patches change the meta

The app will show an **⚠ update banner** if more than 25% of loaded weapons are missing curated evaluations.

---

## Updating Curated Data (Claude Code workflow)

This is the recommended way to keep the curated judgement data current. It requires [Claude Code](https://claude.ai/code) installed on your Mac.

### Full update (after a major patch with new weapons)

Open Claude Code in your repo directory and paste:

```
Fetch all weapons from https://api.warframestat.us/weapons?language=en
and compare the weapon names against the CURATED object in index.html.

For every weapon not already present in CURATED, add a stub entry with:
  - reviewed: false
  - tier: "average"
  - acquisition: auto-derived from the weapon's drop locations
  - acquisitionDifficulty: auto-derived from acquisition type
  - keepSell: "situational"
  - tierNote: ""

Write the updated CURATED object back into index.html.
Print a summary of how many entries were added.
```

### Evaluating specific new weapons

After a patch adds weapons you want to properly rate, paste this into Claude Code:

```
I want to add curated evaluations for these weapons in index.html:
[list weapon names]

For each one, look up community opinions on:
- Reddit (r/Warframe)
- The Warframe wiki
- Overframe tier lists

Then write CURATED entries with reviewed: true and accurate tier,
acquisitionDifficulty, keepSell, and tierNote fields.
```

### Fixing stale tier ratings after a balance patch

```
The following weapons were changed in the latest Warframe update: [list them].
Update their entries in the CURATED object in index.html based on current
community consensus. Set reviewed: true on any entry you update.
```

---

## Adding curated data manually

Open `index.html` (or `warframe-arsenal.html`) in a text editor and find the `const CURATED = {` section near the top of the `<script>` block.

Add entries following this template:

```javascript
"Weapon Name": {
  tier: "endgame",          // endgame | good | average | fodder
  acquisition: "lich",      // see acquisition types below
  acquisitionDifficulty: 4, // 1–5
  keepSell: "keep",         // keep | sell | situational
  tierNote: "Short community verdict goes here.",
  questReward: null,        // or "Quest Name" if applicable
  reviewed: true,           // set true when a human has verified this
},
```

### Acquisition types

| Code | Meaning |
|---|---|
| `market` | Buy directly for Credits from the Market |
| `blueprint` | Buy blueprint, craft with common resources |
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
- No server, no build step, no dependencies — single HTML file
- Works in Safari on iOS, Chrome, Firefox, Edge

---

## License

Fan-made tool. Warframe and all associated content are property of Digital Extremes.  
Weapon data and images are sourced from community APIs and DE's Public Export — used for informational purposes only.
