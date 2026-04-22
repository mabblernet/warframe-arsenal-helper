# Warframe Arsenal Tracker

A mobile-friendly web app for tracking your Warframe weapon collection — mastery status, ownership, acquisition difficulty, community tier ratings, and more.

## Features

- 🔍 Filter by weapon type, subtype, name search
- ⭐ Track mastery (Level 30+) and ownership per weapon
- 🔥 Community tier ratings (Mastery Fodder → Endgame)
- 💀 Acquisition difficulty scale (1–5)
- 📜 Quest reward labels with quest name
- ⚒ Component lists with farming locations
- 🖼 Weapon images from WFCD community CDN
- 💾 Persistent local storage per named profile
- 📱 Fully responsive for iOS/Safari

---

## Deploying to GitHub Pages (Step-by-Step)

### Step 1 — Create a GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click the **+** button → **New repository**
3. Name it: `warframe-arsenal` (or anything you like)
4. Set to **Public** (required for free GitHub Pages)
5. Click **Create repository**

### Step 2 — Upload the Files

**Option A — Via GitHub web interface (easiest):**

1. On your new repo page, click **Add file** → **Upload files**
2. Upload ALL files from this project, keeping the folder structure:
   ```
   index.html
   css/styles.css
   js/app.js
   data/weapons.json
   README.md
   ```
3. Click **Commit changes**

**Option B — Via Git (if you have Git installed):**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/warframe-arsenal.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Under **Branch**, select **main** and **/ (root)**
6. Click **Save**

Your site will be live at:
`https://YOUR_USERNAME.github.io/warframe-arsenal/`

It takes about 1–2 minutes to go live. Share this URL with friends!

---

## Adding More Weapons

The weapon data lives entirely in `data/weapons.json`. Each weapon entry looks like this:

```json
{
  "id": "boltor",
  "name": "Boltor",
  "type": "Primary",
  "subtype": "Rifle",
  "imageName": "boltor-2d24c9a8b4.png",
  "masteryReq": 2,
  "acquisition": "blueprint",
  "acquisitionDifficulty": 2,
  "acquisitionDetail": "Blueprint from Market (25,000 Credits). Easy to craft.",
  "questReward": null,
  "tier": "good",
  "tierNote": "Strong with Incarnon Genesis adapter — one of the best primary Incarnons",
  "components": [
    { "name": "Alloy Plate", "qty": 500, "source": "Venus, Ceres, Phobos" }
  ],
  "wikiUrl": "https://wiki.warframe.com/w/Boltor"
}
```

### Field Reference

| Field | Values |
|---|---|
| `type` | `"Primary"`, `"Secondary"`, `"Melee"` |
| `subtype` | Any string: `"Rifle"`, `"Bow"`, `"Sword"`, etc. |
| `imageName` | From WFCD CDN — use `item.imageName` from https://github.com/WFCD/warframe-items |
| `acquisition` | See table below |
| `acquisitionDifficulty` | `1` (trivial) → `5` (extremely hard) |
| `questReward` | Quest name string or `null` |
| `tier` | `"fodder"`, `"good"`, `"endgame"` |

### Acquisition Types

| Code | Meaning |
|---|---|
| `market_credits` | Buy direct for Credits |
| `blueprint` | Buy blueprint, easy resources |
| `blueprint_farm` | Blueprint + hard-to-farm resources |
| `quest` | Quest reward (cannot be re-obtained easily) |
| `boss_farm` | Rare drop from specific boss |
| `lich` | Kuva Lich weapon |
| `sister` | Sister of Parvos weapon |
| `syndicate` | Requires syndicate standing |
| `dojo` | Clan Dojo research |
| `railjack` | Railjack mission drop |
| `clan_trade` | Trade from other players |
| `crafted` | Kitgun / Zaw crafted |
| `warframe_unlock` | Comes with a Warframe |

---

## Finding Image Names

Weapon images are pulled from `https://cdn.warframestat.us/img/`. To find the correct `imageName` for a weapon:

1. Browse the WFCD items repo: https://github.com/WFCD/warframe-items/blob/master/data/json/
2. Open `Primary.json`, `Secondary.json`, or `Melee.json`
3. Find your weapon and copy the `imageName` field
4. If an image fails to load, the app falls back to the Warframe wiki image, then a placeholder icon

---

## Updating for New Warframe Updates

When DE releases a major update with new weapons:

1. Open [this prompt in Claude](https://claude.ai) and paste:
   > "A new Warframe update added the following weapons: [list them]. Please add them to my weapons.json using the same format. Include imageName from the WFCD API, acquisition type, difficulty, tier rating based on current community consensus, components, and wiki URL."

2. Copy the new weapon entries into `data/weapons.json`
3. Commit and push to GitHub — the site updates automatically

---

## Multi-User / Cross-Device Sync (Optional)

Currently, data is saved in your browser's `localStorage` under your profile name. This means:
- ✅ Data persists on the same device/browser
- ❌ Data does NOT sync between devices automatically

**To sync across your iPhone + Mac:**
- Use the same profile name on both devices
- Periodically export/import your state (feature can be added on request)

**Firebase cloud sync** (syncs across all devices in real-time) can be added. Ask Claude to add Firebase Firestore integration — it takes about 15 minutes to set up and is free for personal use.

---

## License

This is a personal fan tool. Warframe and all associated images are property of Digital Extremes.
Weapon images are sourced from the WFCD community CDN (https://cdn.warframestat.us) which uses publicly available assets from the game's Public Export API.
