// AdminUserDashboard.js
//
// ⚠️ MOCK DATA — no confirmed admin API endpoints (same as every other
// admin page). Swap generateMockUsers() for real fetch() calls once
// GET /api/v1/admin/drivers and .../passengers (or similar) exist.

const ADMIN_API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

function getAdminHeaders(extra = {}) {
  const token = localStorage.getItem("ecoride_admin_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

const INITIAL_VISIBLE = 5;

const NAMES = ["Tunde Fashola", "Yemi Soyinka", "Kelechi Obi", "Ngozi Adeyemi", "Chuka Nwankwo", "Bisi Adekunle", "Femi Balogun", "Amara Okeke", "Segun Okafor", "Ijeoma Eze", "Musa Bello", "Halima Sani"];
const STATUSES = ["pending", "flagged", "flagged-red"];
const STATUS_LABELS = { pending: "Pending", flagged: "Flagged", "flagged-red": "Flagged" };

function generateMockUsers(count, seedOffset) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const idx = i + seedOffset;
    const name = NAMES[idx % NAMES.length];
    users.push({
      id: `USR-${1000 + idx}`,
      name,
      phone: `+234 8${String(10000000 + idx * 733).slice(0, 8)}`,
      email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@email.com`,
      joined: "2026-05-15",
      rides: 100 + (idx * 7) % 60,
      rating: (4.2 + (idx % 8) * 0.1).toFixed(1),
      status: STATUSES[idx % STATUSES.length],
    });
  }
  return users;
}

const state = {
  drivers: [],
  passengers: [],
  driversSearch: "",
  passengersSearch: "",
  driversExpanded: false,
  passengersExpanded: false,
};

// ---------------------------------------------------------------
// Render a user table (shared by Drivers and Passengers sections)
// ---------------------------------------------------------------
function renderUserTable(tbodyId, users, searchTerm, expanded) {
  const tbody = document.getElementById(tbodyId);

  const filtered = users.filter((u) =>
    searchTerm === "" ||
    u.name.toLowerCase().includes(searchTerm) ||
    u.phone.includes(searchTerm)
  );

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);

  if (visible.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No matching users.</td></tr>`;
    return;
  }

  tbody.innerHTML = visible.map((u) => `
    <tr data-id="${u.id}">
      <td class="user-td"><img src="Assets/Driver.jpg" alt=""> ${u.name}</td>
      <td>${u.phone}</td>
      <td>${u.email}</td>
      <td>${u.joined}</td>
      <td>${u.rides}</td>
      <td class="rating"><i class="ph-fill ph-star"></i> ${u.rating}</td>
      <td><span class="status ${u.status}">${STATUS_LABELS[u.status]}</span></td>
      <td class="actions" data-id="${u.id}"><i class="ph-fill ph-dots-three-outline"></i></td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".actions").forEach((cell) => {
    cell.addEventListener("click", (e) => openRowMenu(e.currentTarget, cell.dataset.id));
  });
}

function renderAll() {
  renderUserTable("drivers-table-body", state.drivers, state.driversSearch, state.driversExpanded);
  renderUserTable("passengers-table-body", state.passengers, state.passengersSearch, state.passengersExpanded);

  const driversFiltered = state.drivers.filter((u) => state.driversSearch === "" || u.name.toLowerCase().includes(state.driversSearch));
  document.getElementById("drivers-see-all-btn").style.display = driversFiltered.length > INITIAL_VISIBLE ? "block" : "none";
  document.getElementById("drivers-see-all-btn").textContent = state.driversExpanded ? "Show less" : "See all";

  const passengersFiltered = state.passengers.filter((u) => state.passengersSearch === "" || u.name.toLowerCase().includes(state.passengersSearch));
  document.getElementById("passengers-see-all-btn").style.display = passengersFiltered.length > INITIAL_VISIBLE ? "block" : "none";
  document.getElementById("passengers-see-all-btn").textContent = state.passengersExpanded ? "Show less" : "See all";
}

// ---------------------------------------------------------------
// Search
// ---------------------------------------------------------------
function setupSearch() {
  document.getElementById("drivers-search").addEventListener("input", (e) => {
    state.driversSearch = e.target.value.trim().toLowerCase();
    renderAll();
  });
  document.getElementById("passengers-search").addEventListener("input", (e) => {
    state.passengersSearch = e.target.value.trim().toLowerCase();
    renderAll();
  });
}

// ---------------------------------------------------------------
// See all / Show less
// ---------------------------------------------------------------
function setupSeeAll() {
  document.getElementById("drivers-see-all-btn").addEventListener("click", () => {
    state.driversExpanded = !state.driversExpanded;
    renderAll();
  });
  document.getElementById("passengers-see-all-btn").addEventListener("click", () => {
    state.passengersExpanded = !state.passengersExpanded;
    renderAll();
  });
}

// ---------------------------------------------------------------
// Row-action menu (View Details / Approve-Verify / Suspend)
// ---------------------------------------------------------------
function findUserById(id) {
  const driver = state.drivers.find((u) => u.id === id);
  if (driver) return { user: driver, type: "driver" };
  const passenger = state.passengers.find((u) => u.id === id);
  if (passenger) return { user: passenger, type: "passenger" };
  return null;
}

function openRowMenu(anchorEl, id) {
  const menu = document.getElementById("user-row-menu");
  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX - 130}px`;
  menu.classList.add("open");
  menu.dataset.id = id;
}

function closeRowMenu() {
  document.getElementById("user-row-menu").classList.remove("open");
}

function mapAdminStatus(raw) {
  const s = String(raw || "PENDING").toUpperCase();
  if (s === "APPROVED" || s === "VERIFIED" || s === "ACTIVE") return "flagged";
  if (s === "REJECTED" || s === "SUSPENDED" || s === "INACTIVE") return "flagged-red";
  return "pending";
}

function normalizeUserRecord(u, idx, fallbackPrefix) {
  const userObj = u.user || u;
  return {
    id: u.id || userObj.id || `${fallbackPrefix}-${idx + 1}`,
    name: userObj.fullName || userObj.name || userObj.email || `${fallbackPrefix} ${idx + 1}`,
    phone: userObj.phoneNumber || userObj.phone || "—",
    email: userObj.email || "—",
    joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
    rides: Number(u.totalTrips ?? u.ridesCount ?? 0),
    rating: u.rating !== undefined ? Number(u.rating).toFixed(1) : "0.0",
    status: mapAdminStatus(u.verificationStatus || userObj.status),
  };
}

async function fetchAdminUsers() {
  try {
    const [driversRes, passengersRes] = await Promise.allSettled([
      fetch(`${ADMIN_API_BASE}/admin/drivers`, { headers: getAdminHeaders(), credentials: "include" }),
      fetch(`${ADMIN_API_BASE}/admin/passengers`, { headers: getAdminHeaders(), credentials: "include" }),
    ]);

    if (driversRes.status === "fulfilled" && driversRes.value.ok) {
      const dj = await driversRes.value.json();
      const dList = Array.isArray(dj.data) ? dj.data : Array.isArray(dj) ? dj : [];
      state.drivers = dList.map((u, i) => normalizeUserRecord(u, i, "Driver"));
    }

    if (passengersRes.status === "fulfilled" && passengersRes.value.ok) {
      const pj = await passengersRes.value.json();
      const pList = Array.isArray(pj.data) ? pj.data : Array.isArray(pj) ? pj : [];
      state.passengers = pList.map((u, i) => normalizeUserRecord(u, i, "Passenger"));
    }

    renderAll();
  } catch (err) {
    console.error("Failed to fetch admin users:", err);
  }
}

function setupRowMenuActions() {
  const menu = document.getElementById("user-row-menu");
  menu.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = menu.dataset.id;
      const found = findUserById(id);
      const action = btn.dataset.action;
      closeRowMenu();
      if (!found) return;
      const { user, type } = found;
      const endpoint = type === "driver" ? "drivers" : "passengers";

      if (action === "view") {
        const detailPage = type === "driver" ? "DriverDetail.html" : "PassengerDetail.html";
        window.location.href = `${detailPage}?id=${encodeURIComponent(user.id)}&name=${encodeURIComponent(user.name)}`;
      } else if (action === "verify") {
        try {
          const res = await fetch(`${ADMIN_API_BASE}/admin/${endpoint}/${encodeURIComponent(user.id)}`, {
            method: "PATCH",
            headers: getAdminHeaders({ "Content-Type": "application/json" }),
            credentials: "include",
            body: JSON.stringify({ status: "APPROVED" }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.message || "Could not approve user.");
            return;
          }
          fetchAdminUsers();
        } catch (err) {
          console.error("Verify error:", err);
        }
      } else if (action === "suspend") {
        const reason = prompt(`Reason for rejecting/suspending ${user.name} (optional):`);
        if (reason === null) return;
        try {
          const res = await fetch(`${ADMIN_API_BASE}/admin/${endpoint}/${encodeURIComponent(user.id)}`, {
            method: "PATCH",
            headers: getAdminHeaders({ "Content-Type": "application/json" }),
            credentials: "include",
            body: JSON.stringify({ status: "REJECTED", reason: reason.trim() || undefined }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.message || "Could not reject user.");
            return;
          }
          fetchAdminUsers();
        } catch (err) {
          console.error("Reject error:", err);
        }
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !e.target.closest(".actions")) {
      closeRowMenu();
    }
  });
}

// ---------------------------------------------------------------
// Notification bell + profile dropdown (same pattern as Overview)
// ---------------------------------------------------------------
const MOCK_NOTIFICATIONS = [
  { icon: "ph-bell", title: "New driver verification submitted", time: "10 mins ago" },
  { icon: "ph-warning", title: "Payment dispute flagged", time: "1 hour ago" },
];

function setupNotifications() {
  const bell = document.getElementById("notif-bell");
  const panel = document.getElementById("notif-panel");
  const dot = document.getElementById("notif-dot");
  const list = document.getElementById("notif-panel-list");

  list.innerHTML = MOCK_NOTIFICATIONS.map((n) => `
    <li class="notif-panel-item">
      <i class="ph-fill ${n.icon}"></i>
      <div>
        <div class="notif-panel-item-title">${n.title}</div>
        <div class="notif-panel-item-time">${n.time}</div>
      </div>
    </li>
  `).join("");

  if (MOCK_NOTIFICATIONS.length > 0) dot.classList.add("visible");

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("admin-dropdown").classList.remove("open");
    panel.classList.toggle("open");
  });
  document.getElementById("mark-all-read-btn").addEventListener("click", () => {
    dot.classList.remove("visible");
    panel.classList.remove("open");
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) panel.classList.remove("open");
  });
}

function setupProfileDropdown() {
  const toggle = document.getElementById("admin-profile-toggle");
  const dropdown = document.getElementById("admin-dropdown");
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("notif-panel").classList.remove("open");
    dropdown.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !toggle.contains(e.target)) dropdown.classList.remove("open");
  });
}

// ---------------------------------------------------------------
// Misc
// ---------------------------------------------------------------
function setupMiscControls() {
  document.getElementById("contact-support-btn").addEventListener("click", () => {
    alert("Contact Support is coming soon.");
  });
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
setupSearch();
setupSeeAll();
setupRowMenuActions();
setupNotifications();
setupProfileDropdown();
setupMiscControls();
renderAll();
fetchAdminUsers();