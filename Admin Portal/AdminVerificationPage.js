// AdminVerificationPage.js
//
// ⚠️ MOCK DATA — no confirmed admin API endpoints. Swap
// generateMockVerifications() for a real fetch() once
// GET /api/v1/admin/verifications (or similar) exists.

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

const DRIVERS = ["Kelechi Obi", "Yemi Soyinka", "Tunde Fashola", "Ngozi Adeyemi", "Chuka Nwankwo"];
const DOCUMENTS = ["Driver's license", "National ID", "Birth Certificate", "Insurance", "Vehicle Registration"];
const STATUSES = ["pending", "confirmed", "denied"];

function generateMockVerifications(count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      rideId: `R${10091 + i}`,
      driver: DRIVERS[i % DRIVERS.length],
      document: DOCUMENTS[i % DOCUMENTS.length],
      submitted: `May ${20 + (i % 8)}, 2026`,
      expiry: `${(i % 28) + 1}/${(i % 12) + 1}/${2027 + (i % 4)}`,
      licenseId: `${["DL","VR","SQ","GT","HW"][i % 5]}-${1000 + i * 37}-${["KO","YS","JL","KI","PF"][i % 5]}`,
      status: STATUSES[i % STATUSES.length],
    });
  }
  return rows;
}

const state = {
  verifications: [],
  activeFilter: "all",
};

// ---------------------------------------------------------------
// Render table
// ---------------------------------------------------------------
function mapReviewStatus(raw) {
  const s = String(raw || "PENDING").toUpperCase();
  if (s === "APPROVED" || s === "PASSED" || s === "CONFIRMED") return "confirmed";
  if (s === "REJECTED" || s === "FAILED" || s === "DENIED") return "denied";
  return "pending";
}

async function fetchVerificationQueues() {
  try {
    const [driversRes, vehiclesRes, inspectionsRes, corpRes] = await Promise.allSettled([
      fetch(`${ADMIN_API_BASE}/admin/drivers`, { headers: getAdminHeaders(), credentials: "include" }),
      fetch(`${ADMIN_API_BASE}/admin/vehicles`, { headers: getAdminHeaders(), credentials: "include" }),
      fetch(`${ADMIN_API_BASE}/admin/inspections`, { headers: getAdminHeaders(), credentials: "include" }),
      fetch(`${ADMIN_API_BASE}/admin/corporates`, { headers: getAdminHeaders(), credentials: "include" }),
    ]);

    const extract = async (r) => {
      if (r.status !== "fulfilled" || !r.value.ok) return [];
      const j = await r.value.json();
      return Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : [];
    };

    const [drivers, vehicles, inspections, corporates] = await Promise.all([
      extract(driversRes),
      extract(vehiclesRes),
      extract(inspectionsRes),
      extract(corpRes),
    ]);

    const items = [
      ...drivers.map((d) => ({
        id: d.id,
        kind: "drivers",
        rideId: d.id ? String(d.id).slice(0, 8) : "DRV",
        driver: d.user?.fullName || d.fullName || d.user?.email || "Driver",
        document: "Driver Profile & Docs",
        submitted: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—",
        expiry: "—",
        licenseId: d.licenseNumber || "Driver",
        status: mapReviewStatus(d.verificationStatus || d.status),
      })),
      ...vehicles.map((v) => ({
        id: v.id,
        kind: "vehicles",
        rideId: v.id ? String(v.id).slice(0, 8) : "VEH",
        driver: v.driver?.user?.fullName || v.ownerName || v.model || "Vehicle",
        document: `Vehicle (${v.make || ""} ${v.model || ""})`.trim(),
        submitted: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—",
        expiry: "—",
        licenseId: v.plateNumber || "Vehicle",
        status: mapReviewStatus(v.verificationStatus || v.status),
      })),
      ...inspections.map((ins) => ({
        id: ins.id,
        kind: "inspections",
        rideId: ins.id ? String(ins.id).slice(0, 8) : "INS",
        driver: ins.driver?.user?.fullName || ins.vehicle?.plateNumber || "Inspection",
        document: "Vehicle Inspection",
        submitted: ins.createdAt ? new Date(ins.createdAt).toLocaleDateString() : "—",
        expiry: "—",
        licenseId: ins.vehicle?.plateNumber || "Inspection",
        status: mapReviewStatus(ins.status),
      })),
      ...corporates.map((c) => ({
        id: c.id,
        kind: "corporates",
        rideId: c.id ? String(c.id).slice(0, 8) : "CRP",
        driver: c.companyName || c.user?.email || "Corporate",
        document: "Corporate Documents",
        submitted: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
        expiry: "—",
        licenseId: c.rcNumber || "Corporate",
        status: mapReviewStatus(c.verificationStatus || c.status),
      })),
    ];

    state.verifications = items;

    const total = items.length;
    const pending = items.filter((x) => x.status === "pending").length;
    const confirmed = items.filter((x) => x.status === "confirmed").length;
    const denied = items.filter((x) => x.status === "denied").length;
    const statValues = document.querySelectorAll(".stats-grid .stat-card h3");
    if (statValues[0]) statValues[0].textContent = total.toLocaleString();
    if (statValues[1]) statValues[1].textContent = pending.toLocaleString();
    if (statValues[2]) statValues[2].textContent = confirmed.toLocaleString();
    if (statValues[3]) statValues[3].textContent = denied.toLocaleString();

    renderTable();
  } catch (err) {
    console.error("Failed to fetch verification queues:", err);
  }
}

async function submitReviewDecision(kind, id, approve) {
  const reason = approve ? undefined : prompt("Optional rejection/failure reason:");
  if (!approve && reason === null) return;

  const body =
    kind === "inspections"
      ? { status: approve ? "PASSED" : "FAILED", ...(reason ? { reviewNote: reason } : {}) }
      : { status: approve ? "APPROVED" : "REJECTED", ...(reason ? { reason } : {}) };

  try {
    const res = await fetch(`${ADMIN_API_BASE}/admin/${kind}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Could not update verification status.");
      return;
    }
    fetchVerificationQueues();
  } catch (err) {
    console.error("Verification decision error:", err);
    alert("Network error while updating verification.");
  }
}

function renderTable() {
  const tbody = document.getElementById("verification-table-body");
  const filtered = state.activeFilter === "all"
    ? state.verifications
    : state.verifications.filter((v) => v.status === state.activeFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No verifications in this view.</td></tr>`;
    return;
  }

  const statusClass = { pending: "status-badge-pending", confirmed: "status-badge-confirmed", denied: "status-badge-denied" };
  const statusLabel = { pending: "Pending", confirmed: "Confirmed", denied: "Denied" };

  tbody.innerHTML = filtered.map((v) => `
    <tr data-kind="${v.kind}" data-id="${v.id}" data-driver="${v.driver}">
      <td>${v.rideId}</td>
      <td><strong>${v.driver}</strong></td>
      <td>${v.document}</td>
      <td>${v.submitted}</td>
      <td>${v.expiry}</td>
      <td>${v.licenseId}</td>
      <td>
        <span class="${statusClass[v.status]}">${statusLabel[v.status]}</span>
        ${v.status === "pending"
          ? `<button type="button" class="verify-approve-btn" data-kind="${v.kind}" data-id="${v.id}" style="margin-left:6px;padding:3px 8px;font-size:11px;border:none;background:#16a34a;color:#fff;border-radius:6px;cursor:pointer;">Approve</button>
             <button type="button" class="verify-reject-btn" data-kind="${v.kind}" data-id="${v.id}" style="margin-left:4px;padding:3px 8px;font-size:11px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;border-radius:6px;cursor:pointer;">Reject</button>`
          : ""}
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".verify-approve-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      submitReviewDecision(btn.dataset.kind, btn.dataset.id, true);
    });
  });
  tbody.querySelectorAll(".verify-reject-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      submitReviewDecision(btn.dataset.kind, btn.dataset.id, false);
    });
  });

  tbody.querySelectorAll("tr[data-kind='drivers']").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = `DriverDetail.html?id=${encodeURIComponent(row.dataset.id)}&name=${encodeURIComponent(row.dataset.driver)}`;
    });
  });
}

// ---------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------
function setupFilters() {
  const buttons = document.querySelectorAll("#verification-filters .filter-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeFilter = btn.dataset.filter;
      renderTable();
    });
  });
}

// ---------------------------------------------------------------
// Notification bell + profile dropdown (same pattern as other admin pages)
// ---------------------------------------------------------------
const MOCK_NOTIFICATIONS = [];

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

function setupMiscControls() {
  document.getElementById("contact-support-btn").addEventListener("click", () => {
    alert("Contact Support is coming soon.");
  });
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
setupFilters();
setupNotifications();
setupProfileDropdown();
setupMiscControls();
renderTable();
fetchVerificationQueues();