
    let barterItems = [];
    let currentFilter = localStorage.getItem('barterFilter') || '1';

    function saveToLocal() {
      localStorage.setItem('barterItems', JSON.stringify(barterItems));
      console.log('💾 Saved to localStorage');
    }

    async function loadBarterItems() {
      const localData = localStorage.getItem('barterItems');
      if (localData) {
        barterItems = JSON.parse(localData);
        // console.log('📦 Loaded from localStorage');
        renderTable();
      } else {
        try {
          const response = await fetch('data/barterItems.json');
          barterItems = await response.json();
          console.log('🌐 Loaded from JSON file');
        } catch (e) {
          barterItems = [];
          console.warn('⚠️ No JSON found, starting fresh.');
        }
        renderTable();
        saveToLocal();
      }

      // restore previous filter selection
      document.getElementById('tierFilter').value = currentFilter;
    }

    function renderTable() {
      const tbody = document.getElementById('itemTableBody');
      tbody.innerHTML = '';

      // Apply tier filter
      const filtered = currentFilter === 'all'
        ? barterItems
        : barterItems.filter(i => String(i.tier) === currentFilter);

      filtered.forEach((item, index) => {
        const realIndex = barterItems.indexOf(item); // keep true index
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div class="paste-area" data-index="${realIndex}">
              ${item.image ? `<img src="${item.image}" alt="img">` : '📋 Paste Image'}
            </div>
          </td>
          <td><input type="text" class="form-control form-control-sm name-input" value="${item.name}" data-index="${realIndex}"></td>
          <td><input type="number" class="form-control form-control-sm tier-input text-center" value="${item.tier}" data-index="${realIndex}" disabled></td>
          <td class="text-center">
            <button class="btn btn-danger btn-sm" onclick="deleteItem(${realIndex})">🗑️ Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      // Attach listeners
      document.querySelectorAll('.paste-area').forEach(div => div.addEventListener('paste', handlePasteImage));
      document.querySelectorAll('.tier-input').forEach(inp => inp.addEventListener('input', handleInputChange));
      document.querySelectorAll('.name-input').forEach(inp => inp.addEventListener('input', handleInputChange));
    }

    function handleInputChange(e) {
      const idx = e.target.dataset.index;
      const field = e.target.classList.contains('tier-input') ? 'tier' : 'name';
      barterItems[idx][field] = field === 'tier' ? parseInt(e.target.value) || 1 : e.target.value;
      saveToLocal();
    }

    function handlePasteImage(e) {
      const index = e.target.dataset.index;
      const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
      if (item) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = evt => {
          barterItems[index].image = evt.target.result;
          saveToLocal();
          renderTable();
        };
        reader.readAsDataURL(blob);
      }
    }

    function deleteItem(index) {
      barterItems.splice(index, 1);
      saveToLocal();
      renderTable();
    }

    document.getElementById('btnAdd').addEventListener('click', () => {
      barterItems.push({ tier: 1, name: "New Item", image: "" });
      saveToLocal();
      renderTable();
    });

    document.getElementById('btnExport').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(barterItems, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "barterItems.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('btnClearLocal').addEventListener('click', () => {
      if (confirm('Clear all saved data from browser?')) {
        localStorage.removeItem('barterItems');
        barterItems = [];
        renderTable();
        console.log('🧹 Local data cleared');
      }
    });

    // 🔹 Handle tier filter
    document.getElementById('tierFilter').addEventListener('change', e => {
      currentFilter = e.target.value;
      localStorage.setItem('barterFilter', currentFilter);
      renderTable();
    });

    document.addEventListener('DOMContentLoaded', loadBarterItems);