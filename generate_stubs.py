#!/usr/bin/env python3
"""Generate stub entries for curated.json for all Primary/Secondary/Melee weapons missing from it."""

import json
import urllib.request
import sys

VALID_TYPES = {"Primary", "Secondary", "Melee"}

CURATED_PATH = "curated.json"
API_URL = "https://api.warframestat.us/weapons/?language=en"

# Tags that map to acquisition types (checked in order)
SYNDICATE_FACTIONS = {
    "Steel Meridian", "Arbiters of Hexis", "Cephalon Suda",
    "The Perrin Sequence", "Red Veil", "New Loka",
    "Ostron", "Solaris United", "Entrati", "Necraloid",
    "Zariman", "Kahl's Garrison", "Holdfasts",
    "Scaldra",  # Scaldra are a faction in 1999 update
}

def get_tags(weapon):
    tags = weapon.get("tags") or []
    return [t.lower() for t in tags]

def resolve_weapon_type(w):
    t = w.get("type", "")
    c = w.get("category", "")
    if t in VALID_TYPES:
        return t
    if c in VALID_TYPES:
        return c
    return None

def classify_acquisition(weapon):
    """Return (acquisition_type, difficulty) tuple."""
    tags_raw = weapon.get("tags") or []
    tags = {t.lower() for t in tags_raw}
    tags_original = set(tags_raw)

    unique_name = (weapon.get("uniqueName") or "").lower()
    drops = weapon.get("drops") or []
    drop_text = " ".join(d.get("location", "") for d in drops).lower()
    components = weapon.get("components") or []

    # --- Special / named checks first ---
    if "kuva lich" in tags or any("kuva lich" in t.lower() for t in tags_raw):
        return ("lich", 4)
    if "tenet" in tags or any("tenet" in t.lower() for t in tags_raw):
        return ("sister", 4)
    if "wraith" in tags_original or "Wraith" in tags_raw:
        return ("event", 5)
    if "vandal" in tags or any("vandal" in t.lower() for t in tags_raw):
        return ("event", 5)
    if "prisma" in tags or "baro" in tags:
        return ("event", 5)

    # Stalker weapons
    if "stalker" in tags or "stalker" in drop_text:
        return ("boss", 5)

    # Syndicate / faction tags
    for faction in SYNDICATE_FACTIONS:
        if faction.lower() in tags:
            return ("syndicate", 4)

    # Prime weapons → Void Relics
    if "prime" in tags:
        return ("relic", 5)

    # Syndicate drops in drop text
    if "simaris" in drop_text:
        return ("syndicate", 4)

    # Railjack
    if "railjack" in drop_text or "archwing" in unique_name:
        return ("railjack", 5)

    # Incarnon (Duviri) — before market check
    if "duviri" in tags or "incarnon" in tags:
        return ("market", 3)

    # Market vs blueprint
    market_cost = weapon.get("marketCost")
    bp_cost = weapon.get("bpCost")
    if market_cost and not bp_cost:
        return ("market", 1)
    if bp_cost:
        return ("blueprint", 2)

    # Check components for blueprint purchase
    if components:
        has_bp = any("blueprint" in (c.get("name") or "").lower() for c in components)
        if has_bp:
            return ("blueprint", 2)

    # Dojo research
    if "dojo" in tags or "clan" in tags:
        return ("dojo", 3)

    # Quest detection — no drops, not tradeable, not market
    tradable = weapon.get("tradable", True)
    if not tradable and not drops and not market_cost and not bp_cost:
        return ("quest", 4)

    # Fallback
    return ("blueprint", 2)

def estimate_tier(weapon, acquisition):
    """Estimate tier from riven disposition, with tag-based overrides."""
    disposition = weapon.get("disposition") or 3
    tags_raw = weapon.get("tags") or []
    tags = {t.lower() for t in tags_raw}

    # Disposition mapping (inverse of meta strength)
    if disposition == 1:
        base_tier = "endgame"
    elif disposition == 2:
        base_tier = "good"
    elif disposition == 3:
        base_tier = "average"
    elif disposition == 4:
        base_tier = "average"
    else:  # 5
        base_tier = "fodder"

    # Tag-based overrides
    is_kuva_tenet = "kuva lich" in tags or "tenet" in tags
    is_prime = "prime" in tags

    if is_kuva_tenet:
        # Kuva/Tenet weapons are never fodder, at least good
        if base_tier == "fodder" or base_tier == "average":
            return "good"
        return base_tier

    if is_prime:
        # Prime weapons never fodder, at least average
        if base_tier == "fodder":
            return "average"
        return base_tier

    return base_tier

def estimate_keep_sell(tier, acquisition):
    """Estimate keep/sell based on tier and acquisition difficulty."""
    hard_acquisitions = {"lich", "sister", "relic", "boss", "event", "quest", "railjack"}
    if tier == "fodder":
        return "sell"
    if acquisition in hard_acquisitions:
        return "keep"
    return "situational"

def main():
    # Load curated.json
    with open(CURATED_PATH, "r") as f:
        curated = json.load(f)

    existing_names = set(curated.keys())
    print(f"Existing curated entries: {len(existing_names)}")

    # Fetch API — use cached file if available (fetch with curl beforehand)
    import os
    cache = "/tmp/weapons.json"
    if os.path.exists(cache):
        print(f"Loading from cache: {cache}")
        with open(cache, "r") as f:
            weapons = json.load(f)
    else:
        print(f"Fetching {API_URL}...")
        req = urllib.request.Request(API_URL, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                weapons = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"ERROR fetching API: {e}")
            sys.exit(1)

    print(f"API returned {len(weapons)} total items")

    # Filter to valid weapons
    valid = []
    for w in weapons:
        wtype = resolve_weapon_type(w)
        if wtype is None:
            continue
        if w.get("excludeFromCodex"):
            continue
        if w.get("type") == "Zaw Component":
            continue
        valid.append(w)

    print(f"Valid Primary/Secondary/Melee (after filtering): {len(valid)}")

    # Find missing
    missing = [w for w in valid if w.get("name") not in existing_names]
    print(f"Missing from curated.json: {len(missing)}")

    # Generate stubs
    added = {}
    for w in missing:
        name = w.get("name")
        if not name:
            continue

        acq_type, acq_diff = classify_acquisition(w)
        tier = estimate_tier(w, acq_type)
        keep_sell = estimate_keep_sell(tier, acq_type)

        stub = {
            "tier": tier,
            "acquisition": acq_type,
            "acquisitionDifficulty": acq_diff,
            "keepSell": keep_sell,
            "tierNote": "",
            "reviewed": False
        }
        added[name] = stub

    # Merge into curated
    curated.update(added)

    # Write back
    with open(CURATED_PATH, "w") as f:
        # Write manually formatted JSON to match existing style
        lines = ["{"]
        all_keys = list(curated.keys())
        for i, key in enumerate(all_keys):
            entry = curated[key]
            comma = "," if i < len(all_keys) - 1 else ""
            # Format entry as compact JSON
            entry_json = json.dumps(entry, ensure_ascii=False, separators=(", ", ": "))
            # Fix boolean formatting
            entry_json = entry_json.replace(": true", ": true").replace(": false", ": false")
            lines.append(f'  {json.dumps(key)}: {entry_json}{comma}')
        lines.append("}")
        f.write("\n".join(lines) + "\n")

    print(f"\nDone! Added {len(added)} stub entries.")
    print("\nBreakdown by type:")
    type_counts = {}
    for w in missing:
        wtype = resolve_weapon_type(w)
        type_counts[wtype] = type_counts.get(wtype, 0) + 1
    for t, c in sorted(type_counts.items()):
        print(f"  {t}: {c}")

    print("\nBreakdown by acquisition:")
    acq_counts = {}
    for v in added.values():
        a = v["acquisition"]
        acq_counts[a] = acq_counts.get(a, 0) + 1
    for a, c in sorted(acq_counts.items()):
        print(f"  {a}: {c}")

    print("\nBreakdown by tier:")
    tier_counts = {}
    for v in added.values():
        t = v["tier"]
        tier_counts[t] = tier_counts.get(t, 0) + 1
    for t, c in sorted(tier_counts.items()):
        print(f"  {t}: {c}")

if __name__ == "__main__":
    main()
