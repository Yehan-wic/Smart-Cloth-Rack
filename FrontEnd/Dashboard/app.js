let currentArea = null;
let currentRack = null;

/* ======================================================
   AREA TAB NAVIGATION (TOP BAR)
====================================================== */
function initAreaTabs() {
  const tabs = document.querySelectorAll(".area-tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // UI highlight
      tabs.forEach(t =>
        t.classList.remove("bg-primary")
      );
      tabs.forEach(t =>
        t.classList.add("bg-white")
      );

      tab.classList.remove("bg-white");
      tab.classList.add("bg-primary");

      // Load area
      const area = tab.dataset.area;
      currentArea = area;
      currentRack = null;

      // Clear UI
      document.getElementById("rack-buttons").innerHTML = "";
      document.getElementById("product-list").innerHTML = "";

      loadRacks(area);
    });
  });
}

/* ======================================================
   LOAD AREAS (LEGACY – KEPT FOR SAFETY)
====================================================== */
async function loadAreas() {
  try {
    const res = await fetch(`${API_BASE}/esp/areas`);
    if (!res.ok) throw new Error("Failed to load areas");

    const areas = await res.json();
    const container = document.getElementById("area-buttons");
    container.innerHTML = "";

    areas.forEach(area => {
      const btn = document.createElement("button");
      btn.className =
        "px-4 py-2 rounded-full bg-primary font-bold whitespace-nowrap";
      btn.textContent = area;
      btn.onclick = () => {
        currentArea = area;
        loadRacks(area);
      };
      container.appendChild(btn);
    });
  } catch (err) {
    console.error("❌ loadAreas error:", err);
  }
}

/* ======================================================
   LOAD RACKS
====================================================== */
async function loadRacks(area) {
  try {
    const res = await fetch(
      `${API_BASE}/esp/racks?area=${encodeURIComponent(area)}`
    );
    if (!res.ok) throw new Error("Failed to load racks");

    const racks = await res.json();
    const container = document.getElementById("rack-buttons");
    container.innerHTML = "";

    if (!racks.length) {
      container.innerHTML =
        "<p class='text-xs text-gray-400'>No racks found</p>";
      return;
    }

    racks.forEach(rack => {
      const btn = document.createElement("button");
      btn.className =
        "px-4 py-2 rounded-full border font-semibold whitespace-nowrap";

      btn.textContent = rack;

      btn.onclick = () => {
        currentRack = rack;

        // Highlight rack
        [...container.children].forEach(b =>
          b.classList.remove("bg-primary")
        );
        btn.classList.add("bg-primary");

        loadRackData(rack);
      };

      container.appendChild(btn);
    });
  } catch (err) {
    console.error("❌ loadRacks error:", err);
  }
}

/* ======================================================
   LOAD PRODUCTS FOR RACK
====================================================== */
async function loadRackData(rackId) {
  try {
    const res = await fetch(`${API_BASE}/esp/rack/${rackId}`);
    if (!res.ok) throw new Error("Failed to load rack data");

    const data = await res.json();
    renderProducts(data);
  } catch (err) {
    console.error("❌ loadRackData error:", err);
  }
}

/* ======================================================
   RENDER PRODUCTS
====================================================== */
function renderProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML =
      "<p class='text-gray-500 text-sm'>No products found</p>";
    return;
  }

  products.forEach(product => {
    const total = product.sizes.reduce((sum, s) => sum + s.stock, 0);
    const lowStock = total <= 5;

    const imageHTML = product.image
      ? `
        <img
          src="${API_BASE.replace("/api", "")}${product.image}"
          class="w-20 h-24 object-cover rounded-lg border"
        />
      `
      : `
        <div class="w-20 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
          No Image
        </div>
      `;

    const sizesHTML = product.sizes
      .map(
        s => `
        <div class="text-center ${
          s.stock === 0 ? "bg-red-100 text-red-600" : "bg-gray-100"
        } py-2 rounded">
          <p class="text-xs font-semibold">${s.size}</p>
          <p class="font-bold">${s.stock}</p>
        </div>
      `
      )
      .join("");

    container.innerHTML += `
      <div class="bg-white p-4 rounded-xl border flex gap-4">

        ${imageHTML}

        <div class="flex-1">
          <div class="flex justify-between mb-2">
            <div>
              <p class="font-bold">${product.cloth}</p>
              <p class="text-xs text-gray-500">Brand: ${product.brand}</p>
              ${
                lowStock
                  ? `<p class="text-red-600 text-xs font-bold">LOW STOCK</p>`
                  : ""
              }
            </div>

            <div class="text-right">
              <p class="text-xs">TOTAL</p>
              <p class="text-lg font-bold">${total}</p>
            </div>
          </div>

          <div class="grid grid-cols-5 gap-2">
            ${sizesHTML}
          </div>
        </div>
      </div>
    `;
  });
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initAreaTabs();

  // Default load = Men
  const defaultTab = document.querySelector(
    '.area-tab[data-area="Men"]'
  );
  if (defaultTab) defaultTab.click();

  // Legacy safety (not visible, but kept)
  loadAreas();
});
