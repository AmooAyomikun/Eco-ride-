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

const PAGE_SIZE = 7;

const state = {
  bookings: [],
  filtered: [],
  currentPage: 1,
  activeTab: "all",
  dateFilter: "All",
  searchTerm: "",
};

// GET /bookings
async function fetchBookings() {
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const result = await res.json();
    const list = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.bookings)
      ? result.bookings
      : Array.isArray(result)
      ? result
      : [];

    if (res.ok) {
      state.bookings = list.map((b, i) => ({
        id: b.id || b.bookingId || `BK-${i + 1}`,
        from: b.pickupLocation || b.pickupAddress || b.origin || b.from || "—",
        to: b.dropoffLocation || b.dropoffAddress || b.destination || b.to || "—",
        rawDate: b.scheduledAt || b.createdAt || b.date || null,
        date: b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"),
        time: b.time || (b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""),
        requestedBy: b.passenger?.fullName || b.requestedBy || "Employee",
        seats: b.seats || b.seatsBooked || 1,
        status: String(b.status || "pending").toLowerCase(),
      }));
      applyFilters();
    }
  } catch (err) {
    console.error("Error fetching bookings:", err);
  }
}

function matchesDateFilter(rawDate, filter) {
  if (!filter || filter === "All") return true;
  if (!rawDate) return false;
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  if (filter === "This Week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now;
  }
  if (filter === "This Month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (filter === "Last Month") {
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
  }
  return true;
}

function applyFilters() {
  state.filtered = state.bookings.filter((b) => {
    const matchesTab = state.activeTab === "all" || b.status === state.activeTab;
    const matchesDate = matchesDateFilter(b.rawDate, state.dateFilter);
    const matchesSearch =
      state.searchTerm === "" ||
      b.requestedBy.toLowerCase().includes(state.searchTerm) ||
      b.id.toLowerCase().includes(state.searchTerm) ||
      b.from.toLowerCase().includes(state.searchTerm) ||
      b.to.toLowerCase().includes(state.searchTerm);
    return matchesTab && matchesDate && matchesSearch;
  });
  state.currentPage = 1;
  renderTable();
}

function getPageItems() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  return state.filtered.slice(start, start + PAGE_SIZE);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderTable() {
  const tbody = document.getElementById("bookings-table-body");
  const pageItems = getPageItems();

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="ph ph-identification-card"></i><p>No bookings found in your corporate account yet. Click "Create Booking" to schedule a ride.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((b) => `
      <tr data-id="${b.id}" style="cursor:pointer;">
        <td class="booking-id-cell">${b.id}</td>
        <td><span class="route-cell">${b.from} <i class="ph ph-arrow-right"></i> ${b.to}</span></td>
        <td class="booking-date-cell">${b.date}${b.time ? `. &nbsp;${b.time}` : ""}</td>
        <td>
          <div class="requested-by-cell">
            <img src="Assets/Driver.jpg" alt="${b.requestedBy}">
            <span>${b.requestedBy}</span>
          </div>
        </td>
        <td class="booking-seats-cell">${b.seats}</td>
        <td><span class="status-badge ${b.status}">${capitalize(b.status)}</span></td>
      </tr>
    `).join("");

    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => {
        window.location.href = `TripDetail.html?id=${encodeURIComponent(row.dataset.id)}`;
      });
    });
  }

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("bookings-pagination");
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
    <span>Showing ${Math.max(0, shown)} of ${total} bookings</span>
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
  const tabs = document.querySelectorAll("#booking-tabs .emp-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeTab = tab.dataset.tab;
      applyFilters();
    });
  });
}

function setupFilterDropdown(containerId, options, onSelect) {
  const container = document.getElementById(containerId);
  const btn = container.querySelector(".filter-btn");

  const menu = document.createElement("div");
  menu.className = "filter-menu";
  menu.innerHTML = options.map((opt) => `<button data-value="${opt}" class="${opt === "All" ? "selected" : ""}">${opt}</button>`).join("");
  container.appendChild(menu);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".filter-dropdown.open").forEach((el) => {
      if (el !== container) el.classList.remove("open");
    });
    container.classList.toggle("open");
  });

  menu.querySelectorAll("button").forEach((optBtn) => {
    optBtn.addEventListener("click", () => {
      menu.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      optBtn.classList.add("selected");
      container.classList.remove("open");
      onSelect(optBtn.dataset.value);
    });
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) container.classList.remove("open");
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
  document.getElementById("booking-search").addEventListener("input", (e) => {
    state.searchTerm = e.target.value.trim().toLowerCase();
    applyFilters();
  });
  const topbarSearch = document.getElementById("topbar-booking-search");
  if (topbarSearch) {
    topbarSearch.addEventListener("input", (e) => {
      state.searchTerm = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }
  document.getElementById("create-booking-btn").addEventListener("click", () => {
    window.location.href = "CreateBooking.html";
  });
}

if (requireAuth()) {
  setupFilterDropdown("date-range-filter", ["All", "This Week", "This Month", "Last Month"], (value) => {
    state.dateFilter = value;
    applyFilters();
  });
  setupFilterDropdown("booking-status-filter", ["All", "Pending", "Approved", "Cancelled"], (value) => {
    const tabMap = { All: "all", Pending: "pending", Approved: "approved", Cancelled: "cancelled" };
    state.activeTab = tabMap[value];
    document.querySelectorAll("#booking-tabs .emp-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === state.activeTab);
    });
    applyFilters();
  });

  hydrateUserHeader();
  setupTabs();
  setupSidebarNav();
  setupMiscControls();
  applyFilters();
  fetchBookings();
}
