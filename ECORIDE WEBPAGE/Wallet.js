const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

function requireAuth() {
  const token = localStorage.getItem("ecoride_token");
  if (!token) {
    window.location.replace("Login.html");
    return false;
  }
  return true;
}

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem("ecoride_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function hydrateUserHeader() {
  try {
    const raw = localStorage.getItem("ecoride_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    const companyName = user.companyName || user.fullName || user.email;
    if (companyName) {
      document.querySelectorAll(".company-name, .admin-name").forEach((el) => {
        el.textContent = companyName;
      });
    }
  } catch (err) {
    console.error("Error reading stored user:", err);
  }
}

const PAGE_SIZE = 8;

const state = {
  transactions: [],
  filtered: [],
  currentPage: 1,
  activeTab: "all",
  searchTerm: "",
};

function applyFilters() {
  state.filtered = state.transactions.filter((t) => {
    const matchesTab = state.activeTab === "all" || t.type === state.activeTab;
    const matchesSearch =
      state.searchTerm === "" ||
      t.id.toLowerCase().includes(state.searchTerm) ||
      t.description.toLowerCase().includes(state.searchTerm) ||
      t.type.toLowerCase().includes(state.searchTerm);
    return matchesTab && matchesSearch;
  });
  state.currentPage = 1;
  renderTable();
}

function getPageItems() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  return state.filtered.slice(start, start + PAGE_SIZE);
}

function renderTable() {
  const tbody = document.getElementById("transactions-table-body");
  const pageItems = getPageItems();

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ph ph-wallet"></i><p>No wallet transactions found in your corporate account yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((t) => `
      <tr>
        <td>${t.id}</td>
        <td>${t.description}</td>
        <td>${t.date}</td>
        <td><span class="status-badge ${t.type}">${t.type === "topup" ? "Top-Up" : "Trip Charge"}</span></td>
        <td class="txn-amount ${t.type === "topup" ? "credit" : "debit"}">${t.type === "topup" ? "+" : "-"}₦${t.amount.toLocaleString()}</td>
      </tr>
    `).join("");
  }

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("transactions-pagination");
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shown = total === 0 ? 0 : Math.min(PAGE_SIZE, total - (state.currentPage - 1) * PAGE_SIZE);

  const pageButtons = [];
  const maxVisible = 3;
  let startPage = Math.max(1, state.currentPage - 1);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    pageButtons.push(p);
  }

  container.innerHTML = `
    <span>Showing ${Math.max(0, shown)} of ${total} transactions</span>
    <div class="pagination-controls">
      <button class="page-btn" id="prev-page" ${state.currentPage === 1 ? "disabled" : ""}><i class="ph ph-caret-left"></i></button>
      ${startPage > 1 ? `<button class="page-btn" data-page="1">1</button>${startPage > 2 ? `<span class="page-ellipsis">•••</span>` : ""}` : ""}
      ${pageButtons.map((p) => `<button class="page-btn ${p === state.currentPage ? "active" : ""}" data-page="${p}">${p}</button>`).join("")}
      ${endPage < totalPages ? `${endPage < totalPages - 1 ? `<span class="page-ellipsis">•••</span>` : ""}<button class="page-btn" data-page="${totalPages}">${totalPages}</button>` : ""}
      <button class="page-btn" id="next-page" ${state.currentPage === totalPages ? "disabled" : ""}><i class="ph ph-caret-right"></i></button>
    </div>
  `;

  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentPage = Number(btn.dataset.page);
      renderTable();
    });
  });
  document.getElementById("prev-page").addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTable();
    }
  });
  document.getElementById("next-page").addEventListener("click", () => {
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTable();
    }
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll("#wallet-tabs .emp-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeTab = tab.dataset.tab;
      applyFilters();
    });
  });
}

function setupTopUpModal() {
  const overlay = document.getElementById("topup-modal-overlay");
  const openBtn = document.getElementById("top-up-btn");
  const closeBtn = document.getElementById("topup-modal-close");
  const confirmBtn = document.getElementById("topup-confirm-btn");
  const amountInput = document.getElementById("topup-amount");

  openBtn.addEventListener("click", () => {
    amountInput.value = "";
    overlay.classList.add("open");
  });
  closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  confirmBtn.addEventListener("click", () => {
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    alert(`Top up of ₦${amount.toLocaleString()} initiated.`);
    overlay.classList.remove("open");
  });
}

function setupSidebarNav() {
  document.querySelectorAll("#sidebar-nav-list .nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const href = item.dataset.href;
      if (href) window.location.href = href;
    });
  });
}

function setupMiscControls() {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("active");
    });
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
    });
  }

  document.getElementById("contact-support-btn").addEventListener("click", () => {
    window.location.href = "mailto:support@ecoride.com?subject=EcoRide%20Corporate%20Support";
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("ecoride_token");
    localStorage.removeItem("ecoride_user");
    window.location.href = "Login.html";
  });
  document.getElementById("withdraw-btn").addEventListener("click", () => {
    alert("Withdraw is coming soon.");
  });

  const searchInput = document.querySelector(".search-bar input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchTerm = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }
}

// GET /wallets and GET /wallets/transactions
async function fetchWallet() {
  const balanceEl = document.getElementById("wallet-hero-balance");
  if (balanceEl) balanceEl.textContent = "₦0.00";

  try {
    const [walletRes, txnsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/wallets`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/wallets/transactions`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
    ]);

    if (walletRes.status === "fulfilled" && walletRes.value.ok) {
      const result = await walletRes.value.json();
      const d = result.data || result;
      if (balanceEl && d && d.balance !== undefined) {
        balanceEl.textContent = `₦${Number(d.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    if (txnsRes.status === "fulfilled" && txnsRes.value.ok) {
      const txnsJson = await txnsRes.value.json();
      const list = Array.isArray(txnsJson.data)
        ? txnsJson.data
        : Array.isArray(txnsJson.transactions)
        ? txnsJson.transactions
        : Array.isArray(txnsJson)
        ? txnsJson
        : [];

      state.transactions = list.map((t, i) => ({
        id: t.id || t.reference || `TXN-${1000 + i}`,
        description: t.description || t.narration || "Corporate wallet transaction",
        date: t.createdAt ? new Date(t.createdAt).toLocaleString() : "—",
        type: String(t.type || "debit").toLowerCase().includes("credit") || String(t.type || "").toLowerCase().includes("top") ? "topup" : "debit",
        amount: Number(t.amount) || 0,
      }));

      const totalTopups = state.transactions
        .filter((t) => t.type === "topup")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalSpend = state.transactions
        .filter((t) => t.type === "debit")
        .reduce((sum, t) => sum + t.amount, 0);

      const spendEl = document.getElementById("wallet-month-spend");
      const topupsEl = document.getElementById("wallet-total-topups");
      const pendingEl = document.getElementById("wallet-pending-charges");
      if (spendEl) spendEl.textContent = `₦${totalSpend.toLocaleString()}`;
      if (topupsEl) topupsEl.textContent = `₦${totalTopups.toLocaleString()}`;
      if (pendingEl) pendingEl.textContent = "₦0";

      applyFilters();
    }
  } catch (err) {
    console.error("Error fetching corporate wallet:", err);
  }
}

if (requireAuth()) {
  hydrateUserHeader();
  setupTabs();
  setupTopUpModal();
  setupSidebarNav();
  setupMiscControls();
  applyFilters();
  fetchWallet();
}
