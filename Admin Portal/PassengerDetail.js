// PassengerDetail.js
//
// ⚠️ No design reference for this page — built to mirror DriverDetail.js's
// structure but swaps documents/vehicle for ride history and payment
// history, since those fields don't apply to a passenger.
//
// ⚠️ MOCK DATA — no confirmed GET /api/v1/admin/passengers/:id endpoint.
// Reads ?name= from the URL (set by AdminUserDashboard.js row clicks).

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

function getPassengerIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function getPassengerNameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("name") || "Passenger";
}

function getEmptyPassenger(id, name) {
  return {
    name: name || "Passenger",
    id: id || "—",
    status: "pending",
    statusLabel: "Pending",
    phone: "—",
    email: "—",
    joined: "—",
    rides: 0,
    rating: "0.0",
    paymentMethod: "—",
    rideHistory: [],
    payments: [],
  };
}
  
  // ---------------------------------------------------------------
  // Render profile
  // ---------------------------------------------------------------
  function renderProfile(passenger) {
    document.getElementById("passenger-name").textContent = passenger.name;
    document.getElementById("passenger-id").textContent = passenger.id;
  
    const statusEl = document.getElementById("passenger-status");
    statusEl.textContent = passenger.statusLabel;
    statusEl.className = `status ${passenger.status}`;
  
    document.getElementById("passenger-phone").textContent = passenger.phone;
    document.getElementById("passenger-email").textContent = passenger.email;
    document.getElementById("passenger-joined").textContent = passenger.joined;
    document.getElementById("passenger-rides").textContent = passenger.rides;
    document.getElementById("passenger-rating").textContent = `★ ${passenger.rating}`;
    document.getElementById("passenger-payment").textContent = passenger.paymentMethod;
  }
  
  // ---------------------------------------------------------------
  // Render ride history
  // ---------------------------------------------------------------
  function renderRideHistory(rides) {
    const tbody = document.getElementById("passenger-rides-body");
    if (!Array.isArray(rides) || rides.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:18px;">No rides recorded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = rides.map((r) => `
      <tr>
        <td>${r.rideId}</td>
        <td>${r.route}</td>
        <td>${r.driver}</td>
        <td>${r.date}</td>
        <td>${r.fare}</td>
        <td><span class="${r.status === "completed" ? "status-badge-confirmed" : "status-badge-denied"}">${r.status === "completed" ? "Completed" : "Cancelled"}</span></td>
      </tr>
    `).join("");
  }
  
  // ---------------------------------------------------------------
  // Render payment history
  // ---------------------------------------------------------------
  function renderPayments(payments) {
    const tbody = document.getElementById("passenger-payments-body");
    if (!Array.isArray(payments) || payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:18px;">No payment records yet.</td></tr>`;
      return;
    }
    const statusClass = { confirmed: "status-badge-confirmed", pending: "status-badge-pending", denied: "status-badge-denied" };
    const statusLabel = { confirmed: "Confirmed", pending: "Pending", denied: "Denied" };
  
    tbody.innerHTML = payments.map((p) => `
      <tr>
        <td>${p.txnId}</td>
        <td>${p.date}</td>
        <td>${p.method}</td>
        <td>${p.amount}</td>
        <td><span class="${statusClass[p.status]}">${statusLabel[p.status]}</span></td>
      </tr>
    `).join("");
  }
  
  // ---------------------------------------------------------------
  // Verify / Suspend actions
  // ---------------------------------------------------------------
  async function submitPassengerDecision(passengerId, approve) {
    if (!passengerId || passengerId === "—") return;
    const reason = approve ? undefined : prompt("Optional rejection reason:");
    if (!approve && reason === null) return;
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/passengers/${encodeURIComponent(passengerId)}`, {
        method: "PATCH",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ status: approve ? "APPROVED" : "REJECTED", ...(reason ? { reason } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Could not update passenger status.");
        return;
      }
      alert(data.message || `Passenger ${approve ? "approved" : "rejected"}.`);
      fetchPassengerDetail();
    } catch (err) {
      console.error("Passenger decision error:", err);
      alert("Network error while updating passenger.");
    }
  }

  function setupProfileActions() {
    document.getElementById("verify-passenger-btn").addEventListener("click", () => {
      submitPassengerDecision(getPassengerIdFromUrl(), true);
    });
  
    document.getElementById("suspend-passenger-btn").addEventListener("click", () => {
      submitPassengerDecision(getPassengerIdFromUrl(), false);
    });
  
    document.getElementById("add-passenger-note-btn").addEventListener("click", () => {
      const note = prompt("Enter internal review note:");
      if (note) alert(`Note recorded: ${note}`);
    });
  }

  async function fetchPassengerDetail() {
    const passengerId = getPassengerIdFromUrl();
    if (!passengerId) return;
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/passengers/${encodeURIComponent(passengerId)}`, {
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

      renderProfile({
        name: d.user?.fullName || d.fullName || getPassengerNameFromUrl(),
        id: d.id || passengerId,
        status,
        statusLabel,
        phone: d.user?.phoneNumber || d.phone || "—",
        email: d.user?.email || d.email || "—",
        joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—",
        rides: Number(d.totalTrips ?? 0),
        rating: d.rating !== undefined ? Number(d.rating).toFixed(1) : "0.0",
        paymentMethod: d.preferredPaymentMethod || "—",
      });
      renderRideHistory(Array.isArray(d.rides) ? d.rides : []);
      renderPayments(Array.isArray(d.payments) ? d.payments : []);
    } catch (err) {
      console.error("Failed to fetch passenger detail:", err);
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
  const currentPassenger = getEmptyPassenger(getPassengerIdFromUrl(), getPassengerNameFromUrl());
  
  renderProfile(currentPassenger);
  renderRideHistory(currentPassenger.rideHistory);
  renderPayments(currentPassenger.payments);
  setupProfileActions();
  setupNotifications();
  setupProfileDropdown();
  setupMiscControls();
  fetchPassengerDetail();