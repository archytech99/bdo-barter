// barterLogic.js
// moved/adapted logic from your storage2.html into an external file
// keeps all features: edit, exchange (qtyFrom/qtyTo), discard T5, history, export, localStorage

let barterItems = [];
let barterStorage = {};
let barterHistory = [];
let currentItem = null;
let currentFilter = localStorage.getItem('barterFilter') || 'all';
if (currentFilter === 'all') currentFilter = '';
let barterLocations = JSON.parse(localStorage.getItem('barterLocations')) || [
  "Port Epheria", "Velia", "Iliya Island", "Ancado Inner Harbor"
];
let barterPrices = JSON.parse(localStorage.getItem('barterPrices')) || [
  null, null, null, 1000000, 2000000, 10000000
];

// --- Calculate Tier Value ---
function formatNumber(num) {
  return num.toLocaleString('en-US');
}

// --- Load Barter Items ---
async function loadBarterItems() {
  try {
    const res = await fetch('data/barterItems.json');
    barterItems = await res.json();
  } catch (err) {
    barterItems = [];
    console.warn("⚠️ barterItems.json not found or failed to load.", err);
  }

  document.getElementById('filterTier').value = currentFilter;
  barterStorage = JSON.parse(localStorage.getItem('barterStorage') || '{}');
  barterHistory = JSON.parse(localStorage.getItem('barterHistory') || '[]');

  renderStorageView({ tier: currentFilter, loc: '', onlyStock: false });
}

// --- Render Storage View ---
function renderStorageView(filters = {}) {
  const container = document.getElementById('tiersContainer');
  container.innerHTML = '';
  let sumValue = 0;

  const { tier, loc, onlyStock } = filters;

  for (let t = 1; t <= 5; t++) {
    if (tier && parseInt(tier) !== t) continue;

    const tierItems = barterItems.filter(i => i.tier === t);
    const totalQty = tierItems.reduce((sum, item) => {
      const stored = barterStorage[item.name];
      if (!stored || !stored.locations) return sum;
      const itemTotal = stored.locations.reduce((s, l) => s + l.qty, 0);
      return sum + itemTotal;
    }, 0);

    const col = document.createElement('div');
    col.className = `tier-column`;

    const header = document.createElement('div');
    header.className = 'tier-header';
    header.innerHTML = `
      <div class="tier-badge"><span class="dot ${'t' + t}"></span><span style="margin-left:8px">Tier ${t}</span></div>
      <div class="text-end">Total: <strong>${totalQty}</strong></div>
    `;
    col.appendChild(header);

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'tier-items';

    tierItems.forEach(item => {
      const stored = barterStorage[item.name];
      if (!stored || !stored.locations?.length) {
        const stored = barterStorage[item.name] || { quantity: 0, location: '' };

        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('role','button');
        card.onclick = () => editItem(item.name);

        card.innerHTML = `
          <img src="${item.image || 'https://via.placeholder.com/48?text=?'}" class="item-img ${'t' + t}" alt="${item.name}">
          <div class="item-info">
            <div class="item-name" title="${item.name}">${item.name}</div>
            <div class="item-location" title="${stored.location || ''}">${stored.location || ''}</div>
          </div>
          <div class="item-right">
            <div class="item-qty">${stored.quantity || 0}</div>
          </div>
        `;

        itemsWrap.appendChild(card);
      } else {
        const matchingLocs = stored.locations.filter(l => {
          if (loc && !l.name.toLowerCase().includes(loc)) return false;
          if (onlyStock && (!l.qty || l.qty <= 0)) return false;
          return true;
        });
        if (!matchingLocs.length) return;

        const total = matchingLocs.reduce((s, l) => s + l.qty, 0);
        const locText = matchingLocs.map(l => `${l.name}: ${l.qty}`).join(' · ');

        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('role', 'button');
        card.onclick = () => editItem(item.name);

        card.innerHTML = `
          <img src="${item.image || 'https://via.placeholder.com/48?text=?'}" class="item-img ${'t' + t}" alt="${item.name}">
          <div class="item-info">
            <div class="item-name" title="${item.name}">${item.name}</div>
            <div class="item-location">${locText}</div>
          </div>
          <div class="item-right">
            <div class="item-qty">${total}</div>
          </div>
        `;

        itemsWrap.appendChild(card);
      }
    });

    col.appendChild(itemsWrap);
    container.appendChild(col);

    const footer = document.createElement('div');
    const price = barterPrices[t];
    const totalValue = totalQty * price;
    footer.className = 'tier-footer d-flex justify-content-between small';
    footer.innerHTML = `
      <div>Value: </div>
      <div class="text-muted text-end"><strong>${formatNumber(totalValue)}</strong></div>
    `;
    col.appendChild(footer);

    const sumPriceBarter = document.getElementById('sumPriceBarter');
    sumValue += totalValue;
    sumPriceBarter.innerHTML = "💰 <strong>" + formatNumber(sumValue) + "</strong>";

  }
}

// --- Edit Storage ---
function editItem(name) {
  currentItem = name;
  const stored = barterStorage[name] || { locations: [] };
  document.getElementById('editItemName').value = name;

  const tbody = document.querySelector('#storageTable tbody');
  tbody.innerHTML = '';

  stored.locations.forEach((loc) => addStorageRow(tbody, loc.name, loc.qty));
  const modal = new bootstrap.Modal(document.getElementById('editModal'));
  modal.show();

  const itemData = barterItems.find(i => i.name === name);
  document.getElementById('btnDiscard').style.display = (itemData && itemData.tier === 5) ? 'inline-block' : 'none';
}

// --- Add Storage Row ---
document.getElementById('btnAddStorage').addEventListener('click', () => {
  const tbody = document.querySelector('#storageTable tbody');
  addStorageRow(tbody, '', 0);
});
function addStorageRow(tbody, name = '', qty = 0) {
  const tr = document.createElement('tr');
  const locSelect = document.createElement('select');
  locSelect.className = 'form-select form-select-sm';
  barterLocations.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    if (loc === name) opt.selected = true;
    locSelect.appendChild(opt);
  });
  tr.innerHTML = `
    <td></td>
    <td><input type="number" class="form-control form-control-sm" value="${qty}" min="0"></td>
    <td class="text-center"><button class="btn btn-sm btn-outline-danger">✖</button></td>
  `;
  tr.children[0].appendChild(locSelect);
  tr.querySelector('button').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}
document.getElementById('btnSaveStorage').addEventListener('click', () => {
  const rows = document.querySelectorAll('#storageTable tbody tr');
  const locations = [];

  rows.forEach(row => {
    const locSelect = row.querySelector('select.form-select') || row.querySelector('select');
    const textInput = row.querySelector('input[type="text"]');
    const name = (locSelect ? locSelect.value : (textInput ? textInput.value : '')).trim();

    const qtyInput = row.querySelector('input[type="number"]');
    const qty = parseInt(qtyInput ? qtyInput.value : '0', 10) || 0;

    if (name && qty >= 0) locations.push({ name, qty });
  });

  barterStorage[currentItem] = { locations };
  logHistory('Edit', `Updated ${currentItem} storages: ${locations.map(l => `${l.name}=${l.qty}`).join(', ')}`);
  saveData();
  bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
  renderStorageView();
});

// --- Discard Tier 5 Item ---
document.getElementById('btnDiscard').addEventListener('click', () => {
  if (!currentItem) return;
  if (confirm('Discard Tier 5 item?')) {
    barterStorage[currentItem] = { locations: [] };
    logHistory('Discard', `Discarded ${currentItem}`);
    saveData();
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    renderStorageView();
  }
});

// --- Exchange ---
const exchangeModalObj = new bootstrap.Modal(document.getElementById("exchangeModal"));
let exchangeBatch = [];

function getStoredQty(name, location = null) {
  const storageData = barterStorage[name];
  if (!storageData || !storageData.locations?.length) return 0;
  const locIndex = storageData.locations.findIndex(l => l.name === location);
  return locIndex === -1 ? 0 : storageData.locations[locIndex].qty;
}

function adjustQty(name, location, delta) {
  const qtyDelta = parseInt(delta) || 0;

  if (!qtyDelta) return alert("Please enter valid quantities.");

  let storageData = barterStorage[name];
  if (!storageData) storageData = { locations: [] };

  let locIndex = storageData.locations.findIndex(l => l.name === location);
  if (locIndex === -1) {
    storageData.locations.push({ name: location, qty: qtyDelta });
  } else {
    storageData.locations[locIndex].qty += qtyDelta;
    if (storageData.locations[locIndex].qty <= 0) storageData.locations.splice(locIndex, 1);
  }
  barterStorage[name] = storageData;
}

function addHistory(entry) {
  const time = new Date().toLocaleString();
  const type = exchangeBatch.length === 1 ? "Exchange" : entry.type;
  barterHistory.unshift({ time, action: type, detail: `T${entry.fromTier}: ${entry.fromItem} (-${entry.fromQty} @${entry.fromLoc}) → T${entry.toTier}: ${entry.toItem} (+${entry.toQty} @${entry.toLoc})` });
}

function renderAllTiers() {
  // placeholder: your real rendering logic will be pasted here
  loadBarterItems();
}

function renderTierOptions(selected) {
  let html = `<option value="">T?</option>`;
  for (let t = 1; t <= 5; t++) {
    html += `<option value="${t}" ${selected == t ? "selected" : ""}>T${t}</option>`;
  }
  return html;
}

function renderItemOptions(tier, selected) {
  if (!tier) return `<option value="">Item</option>`;
  let items = barterItems.filter(i => i.tier == tier);
  let html = `<option value="">Item</option>`;
  items.forEach(i => {
    html += `<option value="${i.name}" ${i.name == selected ? "selected" : ""}>${i.name}</option>`;
  });
  return html;
}

function renderLocationOptions(selected) {
  let html = `<option value="">Location</option>`;
  barterLocations.forEach(loc => {
    html += `<option value="${loc}" ${loc == selected ? "selected" : ""}>${loc}</option>`;
  });
  return html;
}

function addExchangeRow() {
  exchangeBatch.push({
    fromTier: "",
    fromItem: "",
    fromLoc: "",
    fromQty: 0,
    toTier: "",
    toItem: "",
    toLoc: "",
    toQty: 0
  });
  renderExchangeRows();
}

function removeExchangeRow(i) {
  exchangeBatch.splice(i, 1);
  renderExchangeRows();
}

function renderExchangeRows() {
  let html = "";

  exchangeBatch.forEach((row, i) => {
    html += `
      <div class="exchange-row p-2 mb-3 rounded bg-dark-subtle border">
        <div class="d-flex justify-content-between mb-1">
          <span class="text-info fw-bold">#${i + 1}</span>
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="removeExchangeRow(${i})">🗑</button>
        </div>

        <div class="row g-1 mb-1">
          <div class="col-2">
            <select class="form-select form-select-sm" onchange="exchangeBatch[${i}].fromTier=this.value; renderExchangeRows();">
              ${renderTierOptions(row.fromTier)}
            </select>
          </div>

          <div class="col-4">
            <select class="form-select form-select-sm" onchange="exchangeBatch[${i}].fromItem=this.value;">
              ${renderItemOptions(row.fromTier, row.fromItem)}
            </select>
          </div>

          <div class="col-4">
            <select class="form-select form-select-sm" onchange="exchangeBatch[${i}].fromLoc=this.value;">
              ${renderLocationOptions(row.fromLoc)}
            </select>
          </div>

          <div class="col-2">
            <input type="number" min="0" class="form-control form-control-sm" value="${row.fromQty}" onchange="exchangeBatch[${i}].fromQty=+this.value;">
          </div>
        </div>

        <div class="row g-1 mb-1">
          <div class="col-2">
            <select class="form-select form-select-sm" onchange="exchangeBatch[${i}].toTier=this.value; renderExchangeRows();">
              ${renderTierOptions(row.toTier)}
            </select>
          </div>

          <div class="col-4">
            <select class="form-select form-select-sm" onchange="exchangeBatch[${i}].toItem=this.value;">
              ${renderItemOptions(row.toTier, row.toItem)}
            </select>
          </div>

          <div class="col-4">
            <select class="form-select form-select-sm" onchange="exchangeBatch[${i}].toLoc=this.value;">
              ${renderLocationOptions(row.toLoc)}
            </select>
          </div>

          <div class="col-2">
            <input type="number" min="0" class="form-control form-control-sm" value="${row.toQty}" onchange="exchangeBatch[${i}].toQty=+this.value;">
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("exchangeRowsContainer").innerHTML = html;
}

function validateExchange() {
  for (let row of exchangeBatch) {
    if (!row.fromItem || !row.toItem) {
      return { ok: false, error: "Missing item selection." };
    }
    let available = getStoredQty(row.fromItem, row.fromLoc);
    if (available < row.fromQty) {
      return { ok: false, error: `Not enough stock for ${row.fromItem} at ${row.fromLoc}.` };
    }
  }
  return { ok: true };
}

function performExchange() {
  for (let row of exchangeBatch) {
    adjustQty(row.fromItem, row.fromLoc, -row.fromQty);
    adjustQty(row.toItem, row.toLoc, row.toQty);

    addHistory({
      type: "BatchExchange",
      fromTier: row.fromTier,
      fromItem: row.fromItem,
      fromLoc: row.fromLoc,
      fromQty: row.fromQty,
      toTier: row.toTier,
      toItem: row.toItem,
      toLoc: row.toLoc,
      toQty: row.toQty,
      timestamp: Date.now()
    });
  }

  saveData();
  renderAllTiers();
}

function resetExchangeModal() {
  exchangeBatch = [];
  renderExchangeRows();
}

document.getElementById("btnExchange").addEventListener("click", () => {
  resetExchangeModal();
  addExchangeRow();
  exchangeModalObj.show();
});

document.getElementById("btnConfirmExchange").addEventListener("click", () => {
  const check = validateExchange();
  if (!check.ok) {
    alert(check.error);
    return;
  }

  performExchange();
  resetExchangeModal();
  exchangeModalObj.hide();
});

// --- Mobile Filters ---
const filterModal = new bootstrap.Modal(document.getElementById('filterModal'));
document.getElementById('btnMobileFilter').addEventListener('click', () => filterModal.show());
document.getElementById('btnApplyFilter').addEventListener('click', () => {
  const tier = document.getElementById('filterTier').value;
  localStorage.setItem('barterFilter', (tier === '') ? 'all' : tier);
  const loc = document.getElementById('filterLocation').value.toLowerCase();
  const onlyStock = document.getElementById('filterHasStock').checked;

  renderStorageView({ tier, loc, onlyStock });
  filterModal.hide();
});

// --- History ---
function logHistory(action, detail) {
  const time = new Date().toLocaleString();
  barterHistory.unshift({ time, action, detail });
  saveData();
}
document.getElementById('btnHistory').addEventListener('click', renderHistory);
function renderHistory() {
  const table = document.getElementById('historyTable');
  table.innerHTML = barterHistory.map(h => `
    <tr><td>${h.time}</td><td>${h.action}</td><td>${h.detail}</td></tr>
  `).join('');
  const hm = new bootstrap.Modal(document.getElementById('historyModal'));
  hm.show();
}

// --- Clear History ---
document.getElementById('btnClearHistory').addEventListener('click', () => {
  if (confirm('Clear barter history?')) {
    barterHistory = [];
    saveData();
    renderHistory();
  }
});

// --- Manage Locations ---
function saveLocations() {
  localStorage.setItem('barterLocations', JSON.stringify(barterLocations));
}
function renderLocationsTable() {
  const tbody = document.querySelector('#locationsTable tbody');
  tbody.innerHTML = '';
  barterLocations.forEach((name, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger">✖</button>
      </td>
    `;
    tr.querySelector('button').addEventListener('click', () => {
      barterLocations.splice(idx, 1);
      saveLocations();
      renderLocationsTable();
    });
    tbody.appendChild(tr);
  });
}
document.getElementById('btnAddLocation').addEventListener('click', () => {
  const name = document.getElementById('newLocationName').value.trim();
  if (!name) return;
  if (barterLocations.includes(name)) return alert("Already exists!");
  barterLocations.push(name);
  document.getElementById('newLocationName').value = '';
  saveLocations();
  renderLocationsTable();
});
document.getElementById('btnManageLocations').addEventListener('click', () => {
  renderLocationsTable();
  const modal = new bootstrap.Modal(document.getElementById('locationsModal'));
  modal.show();
});

// --- Edit Prices ---
document.getElementById('btnEditPrices').addEventListener('click', () => {
  document.getElementById('priceT1').value = barterPrices[1] ?? '';
  document.getElementById('priceT2').value = barterPrices[2] ?? '';
  document.getElementById('priceT3').value = barterPrices[3] ?? '';
  document.getElementById('priceT4').value = barterPrices[4] ?? '';
  document.getElementById('priceT5').value = barterPrices[5] ?? '';

  new bootstrap.Modal(document.getElementById('priceModal')).show();
});
document.getElementById('btnSavePrices').addEventListener('click', () => {
  barterPrices = [
    null,
    parseInt(document.getElementById('priceT1').value) || null,
    parseInt(document.getElementById('priceT2').value) || null,
    parseInt(document.getElementById('priceT3').value) || null,
    parseInt(document.getElementById('priceT4').value) || null,
    parseInt(document.getElementById('priceT5').value) || null
  ];

  localStorage.setItem('barterPrices', JSON.stringify(barterPrices));

  // re-render all tiers
  renderAllTiers();

  bootstrap.Modal.getInstance(document.getElementById('priceModal')).hide();
});

// --- Save / Export / Import / Clear storage ---
function saveData() {
  localStorage.setItem('barterStorage', JSON.stringify(barterStorage));
  localStorage.setItem('barterHistory', JSON.stringify(barterHistory));
}
document.getElementById('btnExportStorage').addEventListener('click', () => {
  const exportData = {
    barterItems: barterItems || [],
    barterStorage: barterStorage || {},
    barterHistory: [],
    barterLocations: barterLocations || [],
    barterPrices: barterPrices || []
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'barterBackup.json';
  a.click();

  URL.revokeObjectURL(url);
});
document.getElementById('importFile').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const json = JSON.parse(e.target.result);

      if (!json.barterItems || !json.barterStorage) {
        alert("Invalid file format!");
        return;
      }

      localStorage.setItem("barterItems", JSON.stringify(json.barterItems));
      localStorage.setItem("barterStorage", JSON.stringify(json.barterStorage));

      if (json.barterHistory)
        localStorage.setItem("barterHistory", JSON.stringify(json.barterHistory));

      if (json.barterLocations)
        localStorage.setItem("barterLocations", JSON.stringify(json.barterLocations));

      if (json.barterPrices)
        localStorage.setItem("barterPrices", JSON.stringify(json.barterPrices));

      loadBarterItems();
      alert("Import successful!");
      location.reload();
    }
    catch (err) {
      alert("Failed to read import file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
});
document.getElementById('btnClearStorage').addEventListener('click', () => {
  if (!confirm("Are you sure? This will delete ALL barter data from localStorage.")) return;

  localStorage.clear();
  barterStorage = {}; barterHistory = [];
  renderStorageView();
});

document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('hidden.bs.modal', () => {
    document.activeElement.blur();
  });
});

// init
loadBarterItems();