// DriverDetail.js
//
// ⚠️ No design reference for this page — built from fields already
// present in AdminUserDashboard.html (contact, rides, rating, status)
// and AdminVerificationPage.html (documents, license, expiry).
//
// ⚠️ MOCK DATA — no confirmed GET /api/v1/admin/drivers/:id endpoint.
// Reads ?name= from the URL (set by Verification/Users row clicks) and
// generates matching mock data deterministically, same pattern as
// EmployeeDetail.js / TripDetail.js in the corporate portal.

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

function getDriverIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function getDriverNameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("name") || "Driver";
}

function getEmptyDriver(id, name) {
  return {
    name: name || "Driver",
    id: id || "—",
    status: "pending",
    statusLabel: "Pending",
    phone: "—",
    email: "—",
    joined: "—",
    rides: 0,
    rating: "0.0",
    vehicle: "—",
    documents: [],
    trips: [],
  };
}
  
  // ---------------------------------------------------------------
  // Render profile
  // ---------------------------------------------------------------
  function renderProfile(driver) {
    document.getElementById("driver-name").textContent = driver.name;
    document.getElementById("driver-id").textContent = driver.id;
  
    const statusEl = document.getElementById("driver-status");
    statusEl.textContent = driver.statusLabel;
    statusEl.className = `status ${driver.status}`;
  
    document.getElementById("driver-phone").textContent = driver.phone;
    document.getElementById("driver-email").textContent = driver.email;
    document.getElementById("driver-joined").textContent = driver.joined;
    document.getElementById("driver-rides").textContent = driver.rides;
    document.getElementById("driver-rating").textContent = `★ ${driver.rating}`;
    document.getElementById("driver-vehicle").textContent = driver.vehicle;
  }
  
  // ---------------------------------------------------------------
  // Render documents table
  // ---------------------------------------------------------------
  function renderDocuments(documents) {
    const tbody = document.getElementById("driver-documents-body");
    if (!Array.isArray(documents) || documents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:18px;">No documents uploaded yet.</td></tr>`;
      return;
    }
    const statusClass = { pending: "status-badge-pending", confirmed: "status-badge-confirmed", denied: "status-badge-denied", flagged: "status-badge-confirmed", "flagged-red": "status-badge-denied" };
    const statusLabel = { pending: "Pending", confirmed: "Confirmed", denied: "Denied", flagged: "Confirmed", "flagged-red": "Denied" };
  
    tbody.innerHTML = documents.map((d) => `
      <tr>
        <td>${d.document}</td>
        <td>${d.submitted}</td>
        <td>${d.expiry}</td>
        <td>${d.licenseId}</td>
        <td><span class="${statusClass[d.status]}">${statusLabel[d.status]}</span></td>
      </tr>
    `).join("");
  }
  
  // ---------------------------------------------------------------
  // Render trips table
  // ---------------------------------------------------------------
  function renderTrips(trips) {
    const tbody = document.getElementById("driver-trips-body");
    if (!Array.isArray(trips) || trips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:18px;">No trips recorded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = trips.map((t) => `
      <tr>
        <td>${t.rideId}</td>
        <td>${t.route}</td>
        <td>${t.date}</td>
        <td>${t.fare}</td>
        <td><span class="${t.status === "completed" ? "status-badge-confirmed" : "status-badge-denied"}">${t.status === "completed" ? "Completed" : "Cancelled"}</span></td>
      </tr>
    `).join("");
  }
  
  // ---------------------------------------------------------------
  // Approve / Suspend actions
  // ---------------------------------------------------------------
  async function submitDriverDecision(driverId, approve) {
    if (!driverId || driverId === "—") return;
    const reason = approve ? undefined : prompt("Optional rejection reason:");
    if (!approve && reason === null) return;
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/drivers/${encodeURIComponent(driverId)}`, {
        method: "PATCH",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ status: approve ? "APPROVED" : "REJECTED", ...(reason ? { reason } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Could not update driver status.");
        return;
      }
      alert(data.message || `Driver ${approve ? "approved" : "rejected"}.`);
      fetchDriverDetail();
    } catch (err) {
      console.error("Driver decision error:", err);
      alert("Network error while updating driver.");
    }
  }

  function setupProfileActions() {
    document.getElementById("approve-driver-btn").addEventListener("click", () => {
      submitDriverDecision(getDriverIdFromUrl(), true);
    });
  
    document.getElementById("suspend-driver-btn").addEventListener("click", () => {
      submitDriverDecision(getDriverIdFromUrl(), false);
    });
  
    document.getElementById("add-driver-note-btn").addEventListener("click", () => {
      const note = prompt("Enter internal review note:");
      if (note) alert(`Note recorded: ${note}`);
    });
  }

  async function fetchDriverDetail() {
    const driverId = getDriverIdFromUrl();
    if (!driverId) return;
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/drivers/${encodeURIComponent(driverId)}`, {
        headers: getAdminHeaders(),
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      const d = json.data || json;
      if (!d) return;

      const statusRaw = String(d.verificationStatus || d.status || "PENDING").toUpperCase();
      const status = statusRaw === "APPROVED" ? "flagged" : statusRaw === "REJECTED" ? "flagged-red" : "pending";
      const statusLabel = statusRaw === "APPROVED" ? "Approved" : statusRaw === "REJECTED" ? "Rejected" : "Pending";

      const vehicleStr = d.vehicle
        ? `${d.vehicle.make || ""} ${d.vehicle.model || ""} . ${d.vehicle.plateNumber || ""}`.trim()
        : Array.isArray(d.vehicles) && d.vehicles[0]
        ? `${d.vehicles[0].make || ""} ${d.vehicles[0].model || ""} . ${d.vehicles[0].plateNumber || ""}`.trim()
        : "—";

      const docs = Array.isArray(d.documents)
        ? d.documents.map((doc) => ({
            document: doc.type || doc.documentType || "Document",
            submitted: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—",
            expiry: doc.expiryDate || "—",
            licenseId: doc.documentNumber || doc.id || "—",
            status: String(doc.verificationStatus || "PENDING").toUpperCase() === "APPROVED" ? "confirmed" : String(doc.verificationStatus || "").toUpperCase() === "REJECTED" ? "denied" : "pending",
          }))
        : [];

      renderProfile({
        name: d.user?.fullName || d.fullName || getDriverNameFromUrl(),
        id: d.id || driverId,
        status,
        statusLabel,
        phone: d.user?.phoneNumber || d.phone || "—",
        email: d.user?.email || d.email || "—",
        joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—",
        rides: Number(d.totalTrips ?? 0),
        rating: d.rating !== undefined ? Number(d.rating).toFixed(1) : "0.0",
        vehicle: vehicleStr,
      });
      renderDocuments(docs);
      renderTrips(Array.isArray(d.trips) ? d.trips : []);
    } catch (err) {
      console.error("Failed to fetch driver detail:", err);
    }
  }
  
  // ---------------------------------------------------------------
  // Notification bell + profile dropdown (same shared pattern)
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
        <div><div class="notif-panel-item-title">${n.title}</div><div class="notif-panel-item-time">${n.time}</div></div>
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
  const currentDriver = getEmptyDriver(getDriverIdFromUrl(), getDriverNameFromUrl());
  
  renderProfile(currentDriver);
  renderDocuments(currentDriver.documents);
  renderTrips(currentDriver.trips);
  setupProfileActions();
  setupNotifications();
  setupProfileDropdown();
  setupMiscControls();
  fetchDriverDetail();