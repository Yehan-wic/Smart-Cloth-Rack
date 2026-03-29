/* ======================================================
   API CONFIG
====================================================== */

// ✅ BEST METHOD: Use relative API path
// Works in Browser + Electron + Packaged App
const API_BASE = "/api";

console.log("🌐 API_BASE =", API_BASE);

/* ======================================================
   TOAST NOTIFICATION SYSTEM (GLOBAL)
====================================================== */

/**
 * showToast(message, type)
 * type = "success" | "error" | "info"
 */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");

  // Create container if not exists
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.top = "16px";
    container.style.right = "16px"; // ✅ CHANGED (top-right)
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");

  // Colors by type
  let bg = "#e5e7eb";
  let color = "#111827";
  let icon = "ℹ️";

  if (type === "success") {
    bg = "#d1fae5";
    color = "#065f46";
    icon = "✅";
  } else if (type === "error") {
    bg = "#fee2e2";
    color = "#991b1b";
    icon = "❌";
  }

  toast.style.background = bg;
  toast.style.color = color;
  toast.style.padding = "12px 14px";
  toast.style.borderRadius = "10px";
  toast.style.minWidth = "260px";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  toast.style.opacity = "0";
  toast.style.transform = "translateX(20px)"; // ✅ slide from right
  toast.style.transition = "all 0.3s ease";

  toast.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ======================================================
   OPTIONAL SHORTCUT HELPERS
====================================================== */
function toastSuccess(msg) {
  showToast(msg, "success");
}

function toastError(msg) {
  showToast(msg, "error");
}

function toastInfo(msg) {
  showToast(msg, "info");
}
