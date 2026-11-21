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
  trips: [],
  filtered: [],
  currentPage: 1,
  activeTab: "all",
  searchTerm: "",
};

async function fetchTrips() {
  try {
    const res = await fetch(`${API_BASE}/bookings/history`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const result = await res.json();
    const list = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.bookings)
      ? result.bookings
      : Array.isArray(result.trips)
      ? result.trips
      : Array.isArray(result)
      ? result
      : [];

    if (res.ok) {
      state.trips = list.map((trip, i) => ({
        id: trip.id || `TRP-${i + 1}`,
        date: trip.date || (trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : "—"),
        time: trip.time || (trip.createdAt ? new Date(trip.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""),
        from: trip.pickupLocation || trip.from || "—",
        to: trip.dropoffLocation || trip.to || "—",
        employee: trip.passenger?.fullName || trip.employee || "Employee",
        status: String(trip.status || "completed").toLowerCase(),
        amount: Number(trip.amount ?? trip.fare ?? 0),
      }));
      applyFilters();
    }
  } catch (err) {
    console.error("Error fetching trips:", err);
  }
}

function applyFilters() {
  state.filtered = state.trips.filter((trip) => {
    const matchesTab = state.activeTab === "all" || trip.status === state.activeTab;
    const matchesSearch =
      state.searchTerm === "" ||
      trip.employee.toLowerCase().includes(state.searchTerm) ||
      trip.id.toLowerCase().includes(state.searchTerm) ||
      trip.from.toLowerCase().includes(state.searchTerm) ||
      trip.to.toLowerCase().includes(state.searchTerm);
    return matchesTab && matchesSearch;
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
  const tbody = document.getElementById("trips-table-body");
  const pageItems = getPageItems();

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ph ph-car"></i><p>No trips recorded in your corporate account yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((trip) => `
      <tr data-id="${trip.id}">
        <td class="trip-date-cell">${trip.date}${trip.time ? `. &nbsp;${trip.time}` : ""}</td>
        <td><span class="route-cell">${trip.from} <i class="ph ph-arrow-right"></i> ${trip.to}</span></td>
        <td>
          <div class="trip-employee-cell">
            <img src="Assets/Driver.jpg" alt="${trip.employee}">
            <span>${trip.employee}</span>
          </div>
        </td>
        <td><span class="status-badge ${trip.status}">${capitalize(trip.status)}</span></td>
        <td class="trip-amount">${trip.amount === 0 ? "₦0" : `₦${trip.amount.toLocaleString()}`}</td>
      </tr>
    `).join("");
  }

  document.querySelectorAll("#trips-table-body tr[data-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = `TripDetail.html?id=${encodeURIComponent(row.dataset.id)}`;
    });
  });

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("trips-pagination");
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
    <span>Showing ${Math.max(0, shown)} of ${total} trips</span>
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
  const tabs = document.querySelectorAll("#trip-tabs .emp-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeTab = tab.dataset.tab;
      applyFilters();
    });
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
    alert("Contact Support is coming soon.");
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("ecoride_token");
    localStorage.removeItem("ecoride_user");
    window.location.href = "Login.html";
  });
  document.getElementById("trip-search").addEventListener("input", (e) => {
    state.searchTerm = e.target.value.trim().toLowerCase();
    applyFilters();
  });
}

if (requireAuth()) {
  hydrateUserHeader();
  setupTabs();
  setupSidebarNav();
  setupMiscControls();
  applyFilters();
  fetchTrips();
}
