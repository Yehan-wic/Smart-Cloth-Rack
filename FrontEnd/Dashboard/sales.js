/* ======================================================
   SALES PAGE – CASHIER MODE
====================================================== */

let saleItems = [];

/* ======================================================
   SCAN BARCODE (ENTER KEY)
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("salesBarcodeInput");
  if (!input) return;

  input.focus(); // ✅ auto focus on load

  input.addEventListener("keydown", async e => {
    if (e.key !== "Enter") return;

    const barcode = input.value.trim();
    if (!barcode) return;

    input.value = "";

    // Prevent duplicate scan
    if (saleItems.some(i => i.barcode === barcode)) {
      toastError("Item already scanned");
      input.focus();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/sales/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode })
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || "Invalid barcode");
        input.focus();
        return;
      }

      saleItems.push(data);
      renderSaleTable();

      toastSuccess(`${data.cloth} (${data.size}) added`);
      input.focus(); // ✅ ready for next scan

    } catch (err) {
      console.error("❌ Scan error:", err);
      toastError("Scanner error");
      input.focus();
    }
  });
});

/* ======================================================
   RENDER SALES TABLE
====================================================== */
function renderSaleTable() {
  const tbody = document.getElementById("sales-items-body");
  const count = document.getElementById("sales-count");

  tbody.innerHTML = "";

  saleItems.forEach((item, index) => {
    tbody.innerHTML += `
      <tr class="border-t">
        <td class="px-3 py-2">
          <p class="font-semibold">${item.cloth}</p>
          <p class="text-xs text-gray-500">${item.brand}</p>
        </td>

        <td class="px-3 py-2 text-center font-bold">
          ${item.size}
        </td>

        <td class="px-3 py-2 text-center font-mono text-xs">
          ${item.barcode}
        </td>

        <td class="px-3 py-2 text-center">
          <button
            onclick="removeSaleItem(${index})"
            class="text-red-600 font-bold text-lg">
            ✕
          </button>
        </td>
      </tr>
    `;
  });

  count.textContent = saleItems.length;
}

/* ======================================================
   REMOVE ITEM
====================================================== */
function removeSaleItem(index) {
  if (!saleItems[index]) return;

  const removed = saleItems[index];
  saleItems.splice(index, 1);
  renderSaleTable();

  toastInfo(`${removed.cloth} removed`);
  document.getElementById("salesBarcodeInput")?.focus();
}

/* ======================================================
   CHECKOUT / SELL ITEMS (NO CONFIRM POPUP)
====================================================== */
async function checkoutSale() {
  if (!saleItems.length) {
    toastError("No items to sell");
    return;
  }

  toastInfo(`Selling ${saleItems.length} item(s)...`);

  try {
    const res = await fetch(`${API_BASE}/sales/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcodes: saleItems.map(i => i.barcode)
      })
    });

    const data = await res.json();

    if (!res.ok) {
      toastError(data.error || "Checkout failed");
      return;
    }

    toastSuccess(`Sale completed (${data.sold} item(s))`);

    saleItems = [];
    renderSaleTable();
    document.getElementById("salesBarcodeInput")?.focus();

  } catch (err) {
    console.error("❌ Checkout error:", err);
    toastError("Checkout error");
  }
}
