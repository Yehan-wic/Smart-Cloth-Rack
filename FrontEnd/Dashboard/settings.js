/* ======================================================
   ADMIN SETTINGS – ONE ITEM PER RACK + BATCH BARCODES
====================================================== */

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL"];

let adminSelectedArea = "Men"; // default
let adminSelectedRack = null;

/* ===== Batch State ===== */
let batchItems = [];

/* ======================================================
   AREA TAB HANDLING (MEN / WOMEN / KIDS)
====================================================== */
document.querySelectorAll(".area-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".area-tab")
      .forEach(b => b.classList.remove("bg-primary"));

    btn.classList.add("bg-primary");
    adminSelectedArea = btn.dataset.area;
  });
});

/* ======================================================
   CREATE RACK + ITEM (ONE ITEM PER RACK)
====================================================== */
async function createRackWithItem() {
  const rack = document.getElementById("rackInput").value.trim();
  const brand = document.getElementById("brandInput").value.trim();
  const cloth = document.getElementById("clothInput").value.trim();
  const imageFile = document.getElementById("imageInput").files[0];

  if (!rack || !brand || !cloth || !imageFile) {
    toastError("All fields and image are required");
    return;
  }

  const formData = new FormData();
  formData.append("area", adminSelectedArea);
  formData.append("rack", rack);
  formData.append("brand", brand);
  formData.append("cloth", cloth);
  formData.append("image", imageFile);

  const res = await fetch(`${API_BASE}/admin/rack-with-item`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    toastError(data.error || "Failed to create rack");
    return;
  }

  toastSuccess("Rack & item created successfully");

  // Reset fields
  document.getElementById("rackInput").value = "";
  document.getElementById("brandInput").value = "";
  document.getElementById("clothInput").value = "";
  document.getElementById("imageInput").value = "";
}

/* ======================================================
   LOAD RACKS FOR BATCH MODE
====================================================== */
async function loadRacksForAdmin() {
  adminSelectedArea = selectArea.value;
  if (!adminSelectedArea) return;

  const res = await fetch(`${API_BASE}/esp/racks?area=${adminSelectedArea}`);
  const racks = await res.json();

  selectRack.innerHTML = `<option value="">Select Rack</option>`;
  racks.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    selectRack.appendChild(opt);
  });
}

/* ======================================================
   LOAD PRODUCT FOR RACK (STOCK VIEW)
====================================================== */
async function loadRackProductsAdmin() {
  adminSelectedRack = selectRack.value;
  if (!adminSelectedRack) {
    toastError("Select rack first");
    return;
  }

  batchItems = [];
  renderBatchTable();

  const res = await fetch(`${API_BASE}/esp/rack/${adminSelectedRack}`);
  const products = await res.json();

  const container = document.getElementById("admin-rack-products");
  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML =
      "<p class='text-sm text-gray-500'>No item assigned to this rack</p>";
    return;
  }

  const p = products[0]; // ONE ITEM PER RACK
  const total = p.sizes.reduce((s, x) => s + x.stock, 0);

  const sizeChart = p.sizes.map(s => `
    <div class="text-center ${s.stock ? "bg-gray-100" : "bg-red-100 text-red-600"} py-2 rounded">
      <p class="text-xs font-semibold">${s.size}</p>
      <p class="font-bold">${s.stock}</p>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="border rounded-xl p-4 space-y-3">
      <div class="flex gap-4">
        <img src="${API_BASE.replace("/api","")}${p.image}"
             class="w-24 h-24 object-contain border rounded">
        <div>
          <p class="font-bold text-lg">${p.cloth}</p>
          <p class="text-sm text-gray-500">${p.brand}</p>
          <p class="text-sm font-semibold">Total: ${total}</p>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-2">${sizeChart}</div>
    </div>
  `;

  setTimeout(() => {
    document.getElementById("batchBarcodeInput")?.focus();
  }, 200);
}

/* ======================================================
   BATCH SCAN LISTENER
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("batchBarcodeInput");
  if (!input) return;

  input.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;

    const code = input.value.trim();
    if (!code) return;

    if (batchItems.some(i => i.barcode === code)) {
      toastError("Barcode already scanned");
      input.value = "";
      return;
    }

    batchItems.push({ barcode: code, size: "XS" });
    input.value = "";
    renderBatchTable();
    toastInfo("Barcode added to batch");
  });
});

/* ======================================================
   RENDER BATCH TABLE
====================================================== */
function renderBatchTable() {
  const tbody = document.getElementById("batch-items-body");
  tbody.innerHTML = "";

  batchItems.forEach((item, index) => {
    tbody.innerHTML += `
      <tr class="border-t">
        <td class="px-3 py-2 font-mono">${item.barcode}</td>
        <td class="px-3 py-2 text-center">
          <select
            class="border rounded px-2 py-1 w-20 text-center"
            onchange="updateBatchSize(${index}, this.value)">
            ${STANDARD_SIZES.map(
              s => `<option ${s === item.size ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </td>
        <td class="px-3 py-2 text-center">
          <button onclick="removeBatchItem(${index})"
                  class="text-red-600 font-bold text-lg">✕</button>
        </td>
      </tr>
    `;
  });
}

/* ======================================================
   UPDATE / REMOVE BATCH ITEMS
====================================================== */
function updateBatchSize(index, size) {
  batchItems[index].size = size;
}

function removeBatchItem(index) {
  batchItems.splice(index, 1);
  renderBatchTable();
  toastInfo("Barcode removed from batch");
}

/* ======================================================
   SUBMIT BATCH ITEMS
====================================================== */
async function submitBatchItems() {
  if (!adminSelectedRack) {
    toastError("Select rack first");
    return;
  }

  if (!batchItems.length) {
    toastError("No scanned items");
    return;
  }

  const res = await fetch(`${API_BASE}/barcode/register-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rack: adminSelectedRack,
      items: batchItems
    })
  });

  const data = await res.json();
  if (!res.ok) {
    toastError(data.error || "Failed to add items");
    return;
  }

  toastSuccess(`Added ${batchItems.length} items`);
  batchItems = [];
  renderBatchTable();
  loadRackProductsAdmin();
}
