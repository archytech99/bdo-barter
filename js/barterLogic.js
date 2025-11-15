// barterLogic.js
// moved/adapted logic from your storage2.html into an external file
// keeps all features: edit, exchange (qtyFrom/qtyTo), discard T5, history, export, localStorage

let barterItems = [];
let storageData = {};
let historyData = [];
let currentItem = null;
let currentFilter = localStorage.getItem('barterFilter') || 'all';
if (currentFilter === 'all') currentFilter = '';
let locationsList = JSON.parse(localStorage.getItem('barterLocations')) || [
  "Port Epheria", "Velia", "Iliya Island", "Oquilla Eye", "Ancado Inner Harbor"
];
let priceList = JSON.parse(localStorage.getItem('barterPrices')) || [
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
  storageData = JSON.parse(localStorage.getItem('barterStorage') || '{}');
  historyData = JSON.parse(localStorage.getItem('barterHistory') || '[]');

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
      const stored = storageData[item.name];
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
      const stored = storageData[item.name];
      if (!stored || !stored.locations?.length) {
        const stored = storageData[item.name] || { quantity: 0, location: '' };

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
    const price = priceList[t];
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
  const stored = storageData[name] || { locations: [] };
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
  locationsList.forEach(loc => {
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

  storageData[currentItem] = { locations };
  logHistory('Edit', `Updated ${currentItem} storages: ${locations.map(l => `${l.name}=${l.qty}`).join(', ')}`);
  saveData();
  bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
  renderStorageView();
});

// --- Discard Tier 5 Item ---
document.getElementById('btnDiscard').addEventListener('click', () => {
  if (!currentItem) return;
  if (confirm('Discard Tier 5 item?')) {
    storageData[currentItem] = { locations: [] };
    logHistory('Discard', `Discarded ${currentItem}`);
    saveData();
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    renderStorageView();
  }
});

// --- Exchange ---
const exchangeModalObj = new bootstrap.Modal(document.getElementById('exchangeModal'));

document.getElementById('btnExchange').addEventListener('click', () => {
  updateExchangeForm(1);
  
  const toLocSel = document.getElementById('toLocation');
  toLocSel.innerHTML = '';
  locationsList.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    toLocSel.appendChild(opt);
  });

  exchangeModalObj.show();
});
document.getElementById('fromTier').addEventListener('change', e => {
  const fromTier = parseInt(e.target.value);
  document.getElementById('toTier').value = 'T' + (fromTier + 1);
  updateExchangeForm(fromTier);
});
document.getElementById('fromItem').addEventListener('change', e => {
  const name = e.target.value;
  const fromLocSel = document.getElementById('fromLocation');
  fromLocSel.innerHTML = '';

  const stored = storageData[name];
  if (stored && stored.locations?.length) {
    stored.locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.name;
      opt.textContent = `${loc.name} (${loc.qty})`;
      fromLocSel.appendChild(opt);
    });
  } else {
    const opt = document.createElement('option');
    opt.textContent = 'No storage found';
    fromLocSel.appendChild(opt);
  }
});

// --- Update Exchange Form ---
function updateExchangeForm(fromTier) {
  const fromSel = document.getElementById('fromItem');
  const toSel = document.getElementById('toItem');
  fromSel.innerHTML = '';
  toSel.innerHTML = '';

  barterItems.filter(i => i.tier === fromTier).forEach(i => {
    const opt = document.createElement('option');
    opt.textContent = i.name;
    fromSel.appendChild(opt);
  });
  barterItems.filter(i => i.tier === fromTier + 1).forEach(i => {
    const opt = document.createElement('option');
    opt.textContent = i.name;
    toSel.appendChild(opt);
  });

  fromSel.dispatchEvent(new Event('change'));
}

// --- Exchange Form Submit ---
document.getElementById('exchangeForm').addEventListener('submit', e => {
  e.preventDefault();

  const fromItem = document.getElementById('fromItem').value;
  const fromLocation = document.getElementById('fromLocation').value;
  const toItem = document.getElementById('toItem').value;
  const toLocation = document.getElementById('toLocation').value.trim() || 'Unknown';
  const qtyFrom = parseInt(document.getElementById('exchangeQtyFrom').value) || 0;
  const qtyTo = parseInt(document.getElementById('exchangeQtyTo').value) || 0;
  const fromTier = parseInt(document.getElementById('fromTier').value);

  if (!qtyFrom || !qtyTo) return alert("Please enter valid quantities.");

  const fromData = storageData[fromItem];
  if (!fromData || !fromData.locations?.length)
    return alert("Source item has no stored quantity.");

  const locIndex = fromData.locations.findIndex(l => l.name === fromLocation);
  if (locIndex === -1 || fromData.locations[locIndex].qty < qtyFrom)
    return alert(`Not enough stock in ${fromLocation}.`);

  fromData.locations[locIndex].qty -= qtyFrom;
  if (fromData.locations[locIndex].qty <= 0)
    fromData.locations.splice(locIndex, 1);

  if (!storageData[toItem]) storageData[toItem] = { locations: [] };
  const toData = storageData[toItem];
  const existingLoc = toData.locations.find(l => l.name === toLocation);
  if (existingLoc) existingLoc.qty += qtyTo;
  else toData.locations.push({ name: toLocation, qty: qtyTo });

  logHistory('Exchange', `T${fromTier}: ${fromItem} (-${qtyFrom} @${fromLocation}) → ${toItem} (+${qtyTo} @${toLocation})`);
  saveData();
  renderStorageView();
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
  historyData.unshift({ time, action, detail });
  saveData();
}
document.getElementById('btnHistory').addEventListener('click', renderHistory);
function renderHistory() {
  const table = document.getElementById('historyTable');
  table.innerHTML = historyData.map(h => `
    <tr><td>${h.time}</td><td>${h.action}</td><td>${h.detail}</td></tr>
  `).join('');
  const hm = new bootstrap.Modal(document.getElementById('historyModal'));
  hm.show();
}

// --- Clear History ---
document.getElementById('btnClearHistory').addEventListener('click', () => {
  if (confirm('Clear barter history?')) {
    historyData = [];
    saveData();
    renderHistory();
  }
});

// --- Manage Locations ---
function saveLocations() {
  localStorage.setItem('barterLocations', JSON.stringify(locationsList));
}
function renderLocationsTable() {
  const tbody = document.querySelector('#locationsTable tbody');
  tbody.innerHTML = '';
  locationsList.forEach((name, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger">✖</button>
      </td>
    `;
    tr.querySelector('button').addEventListener('click', () => {
      locationsList.splice(idx, 1);
      saveLocations();
      renderLocationsTable();
    });
    tbody.appendChild(tr);
  });
}
document.getElementById('btnAddLocation').addEventListener('click', () => {
  const name = document.getElementById('newLocationName').value.trim();
  if (!name) return;
  if (locationsList.includes(name)) return alert("Already exists!");
  locationsList.push(name);
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
  document.getElementById('priceT1').value = priceList[1] ?? '';
  document.getElementById('priceT2').value = priceList[2] ?? '';
  document.getElementById('priceT3').value = priceList[3] ?? '';
  document.getElementById('priceT4').value = priceList[4] ?? '';
  document.getElementById('priceT5').value = priceList[5] ?? '';

  new bootstrap.Modal(document.getElementById('priceModal')).show();
});
document.getElementById('btnSavePrices').addEventListener('click', () => {
  priceList = [
    null,
    parseInt(document.getElementById('priceT1').value) || null,
    parseInt(document.getElementById('priceT2').value) || null,
    parseInt(document.getElementById('priceT3').value) || null,
    parseInt(document.getElementById('priceT4').value) || null,
    parseInt(document.getElementById('priceT5').value) || null
  ];

  localStorage.setItem('barterPrices', JSON.stringify(priceList));

  // re-render all tiers
  renderAllTiers();

  bootstrap.Modal.getInstance(document.getElementById('priceModal')).hide();
});


// --- Save / Export / Import / Clear storage ---
function saveData() {
  localStorage.setItem('barterStorage', JSON.stringify(storageData));
  localStorage.setItem('barterHistory', JSON.stringify(historyData));
}
document.getElementById('btnExportStorage').addEventListener('click', () => {
  const exportData = {
    barterItems: barterItems || [],
    barterStorage: storageData || {},
    barterHistory: [],
    barterLocations: locationsList || [],
    barterPrices: priceList || []
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
document.getElementById('btnClearStorage').addEventListener('click', () => {
  if (!confirm("Are you sure? This will delete ALL barter data from localStorage.")) return;

  localStorage.clear();
  storageData = {}; historyData = [];
  renderStorageView();
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('hidden.bs.modal', () => {
    document.activeElement.blur();
  });
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

// init
loadBarterItems();
