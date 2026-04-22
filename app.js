// ============================================================
// WARFRAME ARSENAL TRACKER - app.js
// ============================================================

// --- Firebase Config ---
// Replace with your own Firebase project config if you want multi-user sync.
// Without Firebase, the app uses localStorage (single-device persistence).
const FIREBASE_CONFIG = null; // Set to your Firebase config object to enable cloud sync

const WFCD_IMG_BASE = 'https://cdn.warframestat.us/img/';
const WIKI_IMG_FALLBACK = 'https://wiki.warframe.com/images/';

// --- State ---
let allWeapons = [];
let userState = {}; // { weaponId: { mastery: bool, owned: bool } }
let activeFilters = {
  type: 'all',
  subtype: 'all',
  tier: 'all',
  search: '',
  showOwned: false,
  showUnmastered: false,
};
let currentUser = null;

// --- DB abstraction ---
const db = {
  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch(e) { console.warn('Storage error', e); }
  }
};

// --- Init ---
async function init() {
  showLoader(true);
  await loadWeapons();
  await loadUserState();
  renderFilterBar();
  renderGrid();
  setupEventListeners();
  showLoader(false);
}

async function loadWeapons() {
  try {
    const res = await fetch('./data/weapons.json');
    allWeapons = await res.json();
  } catch(e) {
    console.error('Failed to load weapons.json', e);
    allWeapons = [];
  }
}

async function loadUserState() {
  const username = await db.get('wf_username');
  if (username) {
    currentUser = username;
    document.getElementById('username-display').textContent = username;
  }
  const saved = await db.get('wf_user_state_' + (currentUser || 'guest'));
  userState = saved || {};
}

async function saveUserState() {
  await db.set('wf_user_state_' + (currentUser || 'guest'), userState);
}

// --- Filter Bar ---
function renderFilterBar() {
  const types = ['all', 'Primary', 'Secondary', 'Melee'];
  const subtypes = getAvailableSubtypes();
  const tiers = ['all', 'fodder', 'good', 'endgame'];

  document.getElementById('filter-type').innerHTML = types.map(t =>
    `<button class="filter-btn ${activeFilters.type === t ? 'active' : ''}" data-filter="type" data-value="${t}">
      ${t === 'all' ? 'All Types' : t}
    </button>`
  ).join('');

  document.getElementById('filter-subtype').innerHTML = ['all', ...subtypes].map(s =>
    `<button class="filter-btn ${activeFilters.subtype === s ? 'active' : ''}" data-filter="subtype" data-value="${s}">
      ${s === 'all' ? 'All Subtypes' : s}
    </button>`
  ).join('');

  document.getElementById('filter-tier').innerHTML = tiers.map(t =>
    `<button class="filter-btn tier-btn tier-${t} ${activeFilters.tier === t ? 'active' : ''}" data-filter="tier" data-value="${t}">
      ${t === 'all' ? 'All Tiers' : tierLabel(t)}
    </button>`
  ).join('');
}

function getAvailableSubtypes() {
  const filtered = activeFilters.type === 'all'
    ? allWeapons
    : allWeapons.filter(w => w.type === activeFilters.type);
  return [...new Set(filtered.map(w => w.subtype))].sort();
}

// --- Grid Render ---
function renderGrid() {
  const weapons = getFilteredWeapons();
  const grid = document.getElementById('weapon-grid');
  const countEl = document.getElementById('result-count');

  const masteredCount = weapons.filter(w => userState[w.id]?.mastery).length;
  countEl.textContent = `${weapons.length} weapons · ${masteredCount} mastered`;

  if (weapons.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⚔</div>
      <p>No weapons match your filters.</p>
      <button onclick="clearFilters()">Clear Filters</button>
    </div>`;
    return;
  }

  grid.innerHTML = weapons.map(w => renderCard(w)).join('');
}

function renderCard(w) {
  const state = userState[w.id] || {};
  const imgUrl = `${WFCD_IMG_BASE}${w.imageName}`;
  const fallbackImg = `https://wiki.warframe.com/images/${encodeURIComponent(w.name.replace(/ /g,''))}.png`;

  const difficultyDots = Array.from({length: 5}, (_, i) =>
    `<span class="diff-dot ${i < w.acquisitionDifficulty ? 'filled' : ''}"></span>`
  ).join('');

  const questBadge = w.questReward
    ? `<div class="badge badge-quest" title="Reward from: ${w.questReward}">📜 ${w.questReward}</div>`
    : '';

  const acqBadge = `<div class="badge badge-acq badge-${w.acquisition}">${acqLabel(w.acquisition)}</div>`;

  const tierClass = `tier-${w.tier}`;
  const tierText = tierLabel(w.tier);

  const componentsHtml = w.components.length > 0
    ? `<div class="components-section">
        <div class="components-toggle" onclick="toggleComponents('${w.id}')">▶ Components (${w.components.length})</div>
        <div class="components-list" id="comp-${w.id}" style="display:none">
          ${w.components.map(c => `
            <div class="component-row">
              <span class="comp-name">${c.name}</span>
              ${c.qty ? `<span class="comp-qty">×${c.qty.toLocaleString()}</span>` : ''}
              ${c.source ? `<span class="comp-source">${c.source}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  return `
    <div class="weapon-card ${state.mastery ? 'is-mastered' : ''} ${state.owned ? 'is-owned' : ''}" data-id="${w.id}">
      <div class="card-tier-stripe ${tierClass}"></div>

      <div class="card-header">
        <div class="weapon-img-wrap">
          <img
            src="${imgUrl}"
            alt="${w.name}"
            class="weapon-img"
            onerror="this.onerror=null; this.src='${fallbackImg}'; this.onerror=function(){this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'80\\' height=\\'80\\'><rect width=\\'80\\' height=\\'80\\' fill=\\'%23222\\'/>  <text x=\\'50%\\' y=\\'55%\\' text-anchor=\\'middle\\' fill=\\'%23666\\' font-size=\\'28\\'>⚔</text></svg>'}"
            loading="lazy"
          />
        </div>
        <div class="card-title-block">
          <h3 class="weapon-name">${w.name}</h3>
          <div class="weapon-meta">
            <span class="type-tag">${w.type}</span>
            <span class="subtype-tag">${w.subtype}</span>
            ${w.masteryReq > 0 ? `<span class="mr-tag">MR${w.masteryReq}</span>` : ''}
          </div>
          <div class="tier-label ${tierClass}">${tierText}</div>
        </div>
      </div>

      <div class="card-body">
        ${questBadge}
        ${acqBadge}

        <div class="difficulty-row">
          <span class="diff-label">Obtain:</span>
          <div class="diff-dots">${difficultyDots}</div>
        </div>

        <p class="acq-detail">${w.acquisitionDetail}</p>

        <p class="tier-note">${w.tierNote}</p>

        ${componentsHtml}
      </div>

      <div class="card-footer">
        <div class="toggle-row">
          <button
            class="toggle-btn ${state.owned ? 'on' : ''}"
            onclick="toggleOwned('${w.id}')"
            title="Toggle Owned">
            <span class="toggle-icon">${state.owned ? '✓' : '+'}</span>
            <span>${state.owned ? 'Owned' : 'Not Owned'}</span>
          </button>
          <button
            class="toggle-btn mastery-btn ${state.mastery ? 'on' : ''}"
            onclick="toggleMastery('${w.id}')"
            title="Toggle Mastery (reached level 30)">
            <span class="toggle-icon">${state.mastery ? '★' : '☆'}</span>
            <span>${state.mastery ? 'Mastered' : 'Mastery'}</span>
          </button>
        </div>
        <a href="${w.wikiUrl}" target="_blank" rel="noopener" class="wiki-link">Wiki ↗</a>
      </div>
    </div>
  `;
}

// --- Toggles ---
function toggleOwned(id) {
  if (!userState[id]) userState[id] = {};
  userState[id].owned = !userState[id].owned;
  saveUserState();
  updateCard(id);
}

function toggleMastery(id) {
  if (!userState[id]) userState[id] = {};
  userState[id].mastery = !userState[id].mastery;
  if (userState[id].mastery) userState[id].owned = true; // If mastered, must have owned it
  saveUserState();
  updateCard(id);
  updateResultCount();
}

function updateCard(id) {
  const weapon = allWeapons.find(w => w.id === id);
  if (!weapon) return;
  const existing = document.querySelector(`.weapon-card[data-id="${id}"]`);
  if (!existing) return;
  const newCard = document.createElement('div');
  newCard.innerHTML = renderCard(weapon);
  const newEl = newCard.firstElementChild;
  existing.replaceWith(newEl);
}

function updateResultCount() {
  const weapons = getFilteredWeapons();
  const masteredCount = weapons.filter(w => userState[w.id]?.mastery).length;
  document.getElementById('result-count').textContent =
    `${weapons.length} weapons · ${masteredCount} mastered`;
}

function toggleComponents(id) {
  const el = document.getElementById(`comp-${id}`);
  const toggle = el.previousElementSibling;
  if (el.style.display === 'none') {
    el.style.display = 'block';
    toggle.textContent = toggle.textContent.replace('▶', '▼');
  } else {
    el.style.display = 'none';
    toggle.textContent = toggle.textContent.replace('▼', '▶');
  }
}

// --- Filtering ---
function getFilteredWeapons() {
  return allWeapons.filter(w => {
    if (activeFilters.type !== 'all' && w.type !== activeFilters.type) return false;
    if (activeFilters.subtype !== 'all' && w.subtype !== activeFilters.subtype) return false;
    if (activeFilters.tier !== 'all' && w.tier !== activeFilters.tier) return false;
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      if (!w.name.toLowerCase().includes(q) &&
          !w.subtype.toLowerCase().includes(q) &&
          !(w.questReward || '').toLowerCase().includes(q)) return false;
    }
    if (activeFilters.showOwned && !userState[w.id]?.owned) return false;
    if (activeFilters.showUnmastered && userState[w.id]?.mastery) return false;
    return true;
  });
}

function clearFilters() {
  activeFilters = { type: 'all', subtype: 'all', tier: 'all', search: '', showOwned: false, showUnmastered: false };
  document.getElementById('search-input').value = '';
  document.getElementById('toggle-owned').classList.remove('active');
  document.getElementById('toggle-unmastered').classList.remove('active');
  renderFilterBar();
  renderGrid();
}

// --- Event Listeners ---
function setupEventListeners() {
  // Filter buttons (delegated)
  document.getElementById('filter-type').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeFilters.type = btn.dataset.value;
    activeFilters.subtype = 'all'; // reset subtype when type changes
    renderFilterBar();
    renderGrid();
  });

  document.getElementById('filter-subtype').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeFilters.subtype = btn.dataset.value;
    renderFilterBar();
    renderGrid();
  });

  document.getElementById('filter-tier').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeFilters.tier = btn.dataset.value;
    renderFilterBar();
    renderGrid();
  });

  // Search
  let searchDebounce;
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      activeFilters.search = e.target.value.trim();
      renderGrid();
    }, 200);
  });

  // Quick filters
  document.getElementById('toggle-owned').addEventListener('click', e => {
    activeFilters.showOwned = !activeFilters.showOwned;
    e.currentTarget.classList.toggle('active', activeFilters.showOwned);
    renderGrid();
  });

  document.getElementById('toggle-unmastered').addEventListener('click', e => {
    activeFilters.showUnmastered = !activeFilters.showUnmastered;
    e.currentTarget.classList.toggle('active', activeFilters.showUnmastered);
    renderGrid();
  });

  // Username
  document.getElementById('set-username').addEventListener('click', () => {
    const modal = document.getElementById('username-modal');
    modal.style.display = 'flex';
    document.getElementById('username-input').focus();
  });

  document.getElementById('save-username').addEventListener('click', async () => {
    const val = document.getElementById('username-input').value.trim();
    if (!val) return;
    // Migrate state to new username
    const oldState = userState;
    currentUser = val;
    userState = oldState;
    await db.set('wf_username', val);
    await saveUserState();
    document.getElementById('username-display').textContent = val;
    document.getElementById('username-modal').style.display = 'none';
    showToast(`Profile saved as "${val}"`);
  });

  document.getElementById('cancel-username').addEventListener('click', () => {
    document.getElementById('username-modal').style.display = 'none';
  });

  document.getElementById('username-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('username-modal'))
      document.getElementById('username-modal').style.display = 'none';
  });
}

// --- Helpers ---
function showLoader(show) {
  document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function tierLabel(tier) {
  return { fodder: '🗑 Mastery Fodder', good: '👍 Good', endgame: '🔥 Endgame', all: 'All Tiers' }[tier] || tier;
}

function acqLabel(acq) {
  const map = {
    market_credits: '🛒 Market',
    blueprint: '📋 Blueprint',
    blueprint_farm: '⚒ Blueprint + Farm',
    quest: '📜 Quest Reward',
    boss_farm: '💀 Boss Farm',
    lich: '👁 Kuva Lich',
    sister: '👁 Sister of Parvos',
    syndicate: '🔮 Syndicate',
    dojo: '🏯 Clan Dojo',
    railjack: '🚀 Railjack',
    clan_trade: '🤝 Clan/Trade',
    crafted: '🔧 Crafted (Kitgun/Zaw)',
    warframe_unlock: '🦾 Warframe Unlock',
  };
  return map[acq] || acq;
}

// --- Start ---
document.addEventListener('DOMContentLoaded', init);
