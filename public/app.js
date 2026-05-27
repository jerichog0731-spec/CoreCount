/* CoreCount Dashboard — SPA Controller */
'use strict';

const API = 'http://localhost:5000/api/v1';

// ── Navigation ─────────────────────────────────────────────────────────────
const navBtns = document.querySelectorAll('.nav-item');
const views   = document.querySelectorAll('.view');

function navigateTo(viewName) {
  views.forEach(v => v.classList.remove('active'));
  navBtns.forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`view-${viewName}`);
  const btn    = document.getElementById(`nav-${viewName}`);
  if (target) target.classList.add('active');
  if (btn)    btn.classList.add('active');

  document.getElementById('topbar-title').textContent =
    btn ? btn.textContent.trim() : 'Dashboard';

  // Load view data
  if (viewName === 'dashboard')  loadDashboard();
  if (viewName === 'inventory')  loadInventory();
  if (viewName === 'volunteers') loadVolunteers();
  if (viewName === 'drafts')     loadDrafts();
  if (viewName === 'eventlog')   loadEventLog();
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.view));
});

// Sidebar toggle (mobile)
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('refresh-btn').addEventListener('click', () => {
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '') ?? 'dashboard';
  navigateTo(activeView);
});

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'default') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show toast--${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3500);
}

// ── API helpers ────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json();
    throw new Error(j.error ?? res.statusText);
  }
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  return res.json();
}

// ── Health check ───────────────────────────────────────────────────────────
async function checkHealth() {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const ai   = document.getElementById('ai-badge');
  try {
    const data = await (await fetch('http://localhost:5000/api/health')).json();
    dot.className = 'status-dot online';
    text.textContent = 'Server Online';
    ai.textContent = `🤖 AI: ${data.aiProvider ?? 'placeholder'}`;
  } catch {
    dot.className = 'status-dot offline';
    text.textContent = 'Server Offline';
  }
}
checkHealth();
setInterval(checkHealth, 30000);

// ── Utility ────────────────────────────────────────────────────────────────
function catPill(cat) {
  const map = { Hygiene: 'hygiene', Laundry: 'laundry', Cleaning: 'cleaning', Special: 'special' };
  return `<span class="cat-pill cat-pill--${map[cat] ?? 'hygiene'}">${cat}</span>`;
}

function mclBadge(state) {
  if (state === 'COMMITTED')    return `<span class="mcl-committed">✅ COMMITTED</span>`;
  if (state === 'HOLD_FOR_REVIEW') return `<span class="mcl-hold">⚠️ HOLD</span>`;
  return `<span class="mcl-pending">⏳ PENDING</span>`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString();
}

// ── Dashboard ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [supData, drafData] = await Promise.all([
      apiGet('/supplies'),
      apiGet('/drafts?status=pending'),
    ]);

    const supplies = supData.supplies ?? [];
    const lowStock = supplies.filter(s => s.lowStock);

    document.getElementById('stat-total-items').textContent = supplies.length;
    document.getElementById('stat-low-stock').textContent   = lowStock.length;
    document.getElementById('stat-drafts').textContent      = drafData.total ?? 0;

    // Client count (count transaction rows as proxy)
    try {
      const evLog = await (await fetch('http://localhost:5000/api/v1/event-log')).json();
      document.getElementById('stat-clients').textContent = evLog.logs?.length ?? '—';
    } catch { document.getElementById('stat-clients').textContent = '—'; }

    // Inventory by category
    const byCat = {};
    supplies.forEach(s => {
      const cat = s.material_category ?? 'Unknown';
      if (!byCat[cat]) byCat[cat] = { total: 0, items: 0 };
      byCat[cat].total += s.current_stock_on_hand;
      byCat[cat].items++;
    });

    const sumEl = document.getElementById('inventory-summary');
    if (Object.keys(byCat).length === 0) {
      sumEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div>No inventory items yet.</div>';
    } else {
      sumEl.innerHTML = Object.entries(byCat).map(([cat, d]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${catPill(cat)}
          <div style="text-align:right;">
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${d.total} units</div>
            <div style="font-size:11px;color:var(--text-muted);">${d.items} item type${d.items !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `).join('');
    }

    // Low stock list
    const lsEl = document.getElementById('low-stock-list');
    if (lowStock.length === 0) {
      lsEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div>All items above threshold.</div>';
    } else {
      lsEl.innerHTML = lowStock.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <div>
            <div style="font-size:13.5px;font-weight:500;color:var(--text-primary);">${s.item_name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${s.item_brand ?? ''} · ${s.material_category}</div>
          </div>
          <span class="badge badge--red">${s.current_stock_on_hand} left</span>
        </div>
      `).join('');
    }

  } catch (err) {
    showToast('Dashboard load failed: ' + err.message, 'error');
  }
}

// ── Inventory ──────────────────────────────────────────────────────────────
async function loadInventory() {
  try {
    const data = await apiGet('/supplies');
    const tbody = document.getElementById('supplies-tbody');
    const supplies = data.supplies ?? [];

    if (supplies.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No supply items yet. Add one above.</td></tr>`;
      return;
    }

    tbody.innerHTML = supplies.map(s => `
      <tr>
        <td style="font-family:monospace;color:var(--text-muted);">#${s.item_id}</td>
        <td style="font-weight:500;color:var(--text-primary);">${s.item_name}</td>
        <td>${s.item_brand ?? '—'}</td>
        <td>${catPill(s.material_category)}</td>
        <td><strong style="color:${s.lowStock ? 'var(--red-400)' : 'var(--text-primary)'};">${s.current_stock_on_hand}</strong></td>
        <td>${s.min_threshold}</td>
        <td>${s.lowStock ? '<span class="badge badge--red">Low Stock</span>' : '<span class="badge badge--green">OK</span>'}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-success btn-sm" onclick="adjustStock(${s.item_id}, 1)">+1</button>
            <button class="btn btn-danger btn-sm" onclick="adjustStock(${s.item_id}, -1)">−1</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Inventory load failed: ' + err.message, 'error');
  }
}

async function adjustStock(itemId, adj) {
  try {
    await apiPatch(`/supplies/${itemId}`, { adjustment: adj, reason: 'Manual dashboard adjustment' });
    showToast(`Stock adjusted by ${adj > 0 ? '+' : ''}${adj}`, 'success');
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Add supply form toggle
document.getElementById('toggle-add-supply').addEventListener('click', () => {
  const wrap = document.getElementById('add-supply-form-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('add-supply-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await apiPost('/supplies', {
      itemName:            document.getElementById('supply-name').value,
      itemBrand:           document.getElementById('supply-brand').value || undefined,
      materialCategory:    document.getElementById('supply-cat').value,
      unitConversionFactor: parseFloat(document.getElementById('supply-yield-oz').value) || 0,
      unitFairMarketValue:  parseFloat(document.getElementById('supply-fmv').value) || 0,
      minThreshold:         parseInt(document.getElementById('supply-threshold').value) || 5,
    });
    showToast('Supply item added!', 'success');
    e.target.reset();
    document.getElementById('add-supply-form-wrap').style.display = 'none';
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── Clients ────────────────────────────────────────────────────────────────
document.getElementById('client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await apiPost('/clients', {
      firstName:  document.getElementById('client-firstname').value,
      familySize: parseInt(document.getElementById('client-familysize').value),
    });
    const card = document.getElementById('new-client-card');
    const body = document.getElementById('new-client-card-body');
    card.style.display = 'block';
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="font-family:monospace;font-size:22px;font-weight:700;color:var(--indigo-400);letter-spacing:0.1em;">${data.client.client_id}</div>
        <div style="font-size:13px;color:var(--text-secondary);">👤 <strong>${data.client.first_name}</strong> · Family of ${data.client.family_size}</div>
        <div style="font-size:12px;color:var(--text-muted);">Registered: ${timeAgo(data.client.created_at)}</div>
        <div class="eligibility-grid">
          ${['Hygiene','Laundry','Cleaning','Special'].map(cat => `
            <div class="eligibility-item">
              <div class="traffic-light traffic-light--green"></div>
              <span style="font-size:13px;">${cat} <span style="color:var(--green-400);font-size:11px;">Eligible</span></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    showToast(`Client ${data.client.client_id} registered!`, 'success');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('client-lookup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const clientId = document.getElementById('client-id-input').value.trim();
  const resultEl = document.getElementById('client-result');
  if (!clientId) return;
  try {
    const data = await apiGet(`/clients/${clientId}`);
    const { client, eligibility } = data;
    resultEl.innerHTML = `
      <div style="font-family:monospace;font-size:18px;font-weight:700;color:var(--indigo-400);">${client.client_id}</div>
      <div style="font-size:13px;color:var(--text-secondary);margin:8px 0;">👤 ${client.first_name} · Family of ${client.family_size}</div>
      <div class="eligibility-grid" style="margin-top:12px;">
        ${Object.entries(eligibility).map(([cat, elig]) => `
          <div class="eligibility-item">
            <div class="traffic-light ${elig.eligible ? 'traffic-light--green' : 'traffic-light--red'}"></div>
            <div>
              <div style="font-size:12.5px;font-weight:500;">${cat}</div>
              <div style="font-size:11px;color:var(--text-muted);">${elig.eligible ? '🟢 Eligible' : `🔴 ${elig.daysRemaining}d remaining`}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    resultEl.innerHTML = `<span style="color:var(--red-400);font-size:13px;">${err.message}</span>`;
  }
});

// ── AI Intake ──────────────────────────────────────────────────────────────
document.getElementById('intake-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rawText = document.getElementById('intake-raw-text').value;
  const operatorName = document.getElementById('intake-operator').value || 'Dashboard User';
  const resultEl = document.getElementById('intake-result');
  const bodyEl   = document.getElementById('intake-result-body');

  try {
    const data = await apiPost('/intake/parse', { rawText, operatorName });
    resultEl.style.display = 'block';
    bodyEl.textContent = JSON.stringify(data, null, 2);
    showToast('Intake submitted to Event Bus ✅', 'success');
    e.target.reset();
  } catch (err) {
    resultEl.style.display = 'block';
    bodyEl.textContent = `Error: ${err.message}`;
    showToast(err.message, 'error');
  }
});

// ── Volunteers ─────────────────────────────────────────────────────────────
async function loadVolunteers() {
  try {
    const data = await apiGet('/volunteers');
    const tbody = document.getElementById('vol-tbody');
    const vols = data.submissions ?? [];
    if (vols.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No volunteer submissions yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = vols.map(v => `
      <tr>
        <td style="color:var(--text-muted);">#${v.id}</td>
        <td style="font-weight:500;color:var(--text-primary);">${v.volunteer_name}</td>
        <td>${v.emergency_contact} (${v.relationship})</td>
        <td style="font-family:monospace;">${v.emergency_phone}</td>
        <td>${v.is_minor ? '<span class="badge badge--amber">Minor</span>' : '—'}</td>
        <td style="font-size:12px;color:var(--text-muted);">${timeAgo(v.submission_date)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Volunteer load failed: ' + err.message, 'error');
  }
}

document.getElementById('toggle-vol-form').addEventListener('click', () => {
  const wrap = document.getElementById('vol-form-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('vol-minor').addEventListener('change', (e) => {
  document.getElementById('parent-sig-wrap').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('volunteer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const isMinor = document.getElementById('vol-minor').checked;
  try {
    await apiPost('/volunteers', {
      volunteerName:    document.getElementById('vol-name').value,
      emergencyContact: document.getElementById('vol-ec').value,
      emergencyPhone:   document.getElementById('vol-phone').value,
      relationship:     document.getElementById('vol-rel').value,
      signatureCapture: document.getElementById('vol-sig').value,
      isMinor,
      parentSignature:  isMinor ? document.getElementById('vol-parent-sig').value : undefined,
    });
    showToast('Volunteer submission saved!', 'success');
    e.target.reset();
    document.getElementById('vol-form-wrap').style.display = 'none';
    document.getElementById('parent-sig-wrap').style.display = 'none';
    loadVolunteers();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── Drafts ─────────────────────────────────────────────────────────────────
async function loadDrafts() {
  try {
    const data = await apiGet('/drafts?status=pending');
    const listEl = document.getElementById('drafts-list');
    const drafts = data.drafts ?? [];
    if (drafts.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div>No pending drafts.</div>';
      return;
    }
    listEl.innerHTML = drafts.map(d => `
      <div class="draft-card">
        <div class="draft-meta">
          <span class="badge badge--purple">${d.draft_type}</span>
          ${d.subject ? `<span style="font-size:13px;font-weight:600;color:var(--text-primary);">${d.subject}</span>` : ''}
          <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${timeAgo(d.created_at)}</span>
        </div>
        <div class="draft-body">${d.body}</div>
        <div class="draft-actions">
          <button class="btn btn-success btn-sm" onclick="updateDraft(${d.id}, 'approved')">✅ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="updateDraft(${d.id}, 'dismissed')">✕ Dismiss</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Drafts load failed: ' + err.message, 'error');
  }
}

async function updateDraft(id, status) {
  try {
    await apiPatch(`/drafts/${id}`, { status });
    showToast(`Draft ${status}`, 'success');
    loadDrafts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('draft-gen-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const itemId    = parseInt(document.getElementById('draft-item-id').value);
  const draftType = document.getElementById('draft-type').value;
  if (!itemId) { showToast('Item ID is required', 'error'); return; }
  try {
    await apiPost('/drafts/generate', { itemId, draftType });
    showToast('Draft generated!', 'success');
    loadDrafts();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── Event Log ──────────────────────────────────────────────────────────────
async function loadEventLog() {
  try {
    const data = await (await fetch('http://localhost:5000/api/v1/event-log')).json();
    const tbody = document.getElementById('event-log-tbody');
    const logs  = data.logs ?? [];
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No transactions yet. Submit an intake to trigger the pipeline.</td></tr>`;
      return;
    }
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-family:monospace;font-size:11px;color:var(--indigo-400);">${l.transaction_id}</td>
        <td>${l.item_id ? `#${l.item_id}` : '—'}</td>
        <td>${l.item_category ? catPill(l.item_category) : '—'}</td>
        <td>${l.bulk_oz_intake ?? '—'}</td>
        <td>${l.calculated_predicted_packs ?? '—'}</td>
        <td>${mclBadge(l.mcl_verification_state)}</td>
        <td style="font-size:11px;color:var(--text-muted);">${timeAgo(l.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Event log load failed: ' + err.message, 'error');
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
loadDashboard();
