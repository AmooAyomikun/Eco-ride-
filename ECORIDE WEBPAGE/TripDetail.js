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

function getTripIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function getEmptyTrip(id) {
  return {
    id: id || "—",
    status: "pending",
    route: { from: "—", to: "—" },
    date: "—",
    driver: {
      name: "Unassigned",
      email: "—",
      phone: "—",
      vehicle: "—",
    },
    seats: "0 Seats",
    amount: 0,
    tripIdLabel: id || "—",
    paymentMethod: "Corporate Wallet",
    distance: "—",
    duration: "—",
    summary: {
      status: "pending",
      totalAmount: 0,
      paidBy: "Corporate Wallet",
      bookedBy: "—",
      passengerCount: 0,
      seatsBooked: "0",
      tripType: "Corporate Ride",
      createdAt: "—",
      completedAt: "—",
    },
    passengers: [],
    timeline: [],
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function currency(amount) {
  return `₦${(Number(amount) || 0).toLocaleString()}`;
}

function renderTripInfo(trip) {
  const badge = document.getElementById("trip-status-badge");
  badge.textContent = capitalize(trip.status);
  badge.className = "trip-pill-badge";

  const rows = [
    { icon: "ph-git-branch", label: "Route", value: `<span class="info-row-value route">${trip.route.from} <i class="ph ph-arrow-right"></i> ${trip.route.to}</span>` },
    { icon: "ph-calendar-blank", label: "Date & Time", value: trip.date },
    { icon: "ph-user", label: "Driver", value: `<span class="driver-inline"><img src="Assets/Review.jpg" alt="${trip.driver.name}">${trip.driver.name}</span>` },
    { icon: "ph-car", label: "Vehicle", value: trip.driver.vehicle },
    { icon: "ph-armchair", label: "Seats", value: trip.seats },
    { icon: "ph-credit-card", label: "Amount", value: currency(trip.amount) },
    { icon: "ph-map-pin", label: "Trip ID", value: trip.tripIdLabel },
    { icon: "ph-wallet", label: "Payment Method", value: trip.paymentMethod },
  ];

  document.getElementById("trip-info-rows").innerHTML = rows.map((r) => `
    <li class="info-row">
      <span class="info-row-label"><span class="info-row-icon"><i class="ph ${r.icon}"></i></span>${r.label}</span>
      <span class="info-row-value">${r.value}</span>
    </li>
  `).join("");
}

function renderRouteDetails(trip) {
  document.getElementById("route-distance").textContent = trip.distance;
  document.getElementById("route-duration").textContent = trip.duration;
}

function renderTripSummary(trip) {
  const s = trip.summary;
  const rows = [
    { icon: "ph-git-branch", label: "Status", value: `<span class="trip-pill-badge">${capitalize(s.status)}</span>` },
    { icon: "ph-credit-card", label: "Total Amount", value: currency(s.totalAmount) },
    { icon: "ph-user", label: "Paid By", value: s.paidBy },
    { icon: "ph-user", label: "Booked By", value: `<span class="driver-inline"><img src="Assets/Review.jpg" alt="${s.bookedBy}">${s.bookedBy}</span>` },
    {
      icon: "ph-users",
      label: "Passengers",
      value: `<span class="passengers-inline">${Array.from({ length: s.passengerCount }).map(() => `<img src="Assets/Review.jpg" alt="Passenger">`).join("")}<span class="passengers-more">+0</span></span>`,
    },
    { icon: "ph-armchair", label: "Seats Booked", value: s.seatsBooked },
    { icon: "ph-map-pin", label: "Trip Type", value: s.tripType },
    { icon: "ph-clock", label: "Created At", value: s.createdAt },
    { icon: "ph-clock", label: "Completed At", value: s.completedAt },
  ];

  document.getElementById("trip-summary-rows").innerHTML = rows.map((r) => `
    <li class="info-row">
      <span class="info-row-label"><span class="info-row-icon"><i class="ph ${r.icon}"></i></span>${r.label}</span>
      <span class="info-row-value">${r.value}</span>
    </li>
  `).join("");
}

function renderPassengers(trip) {
  const tbody = document.getElementById("passenger-table-body");
  if (!Array.isArray(trip.passengers) || trip.passengers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:18px 0;">No passenger records available for this trip.</td></tr>`;
    document.getElementById("total-paid").textContent = currency(trip.amount || 0);
    return;
  }

  tbody.innerHTML = trip.passengers.map((p) => `
    <tr>
      <td>
        <span class="passenger-name-cell">
          <img src="Assets/Review.jpg" alt="${p.name}">
          <span>${p.name}</span>
        </span>
      </td>
      <td>${p.email}</td>
      <td>${p.phone}</td>
      <td>${p.boarding}</td>
      <td>${p.dropoff}</td>
      <td>${currency(p.amount)}</td>
    </tr>
  `).join("");

  const total = trip.passengers.reduce((sum, p) => sum + p.amount, 0);
  document.getElementById("total-paid").textContent = currency(total);
}

function renderDriverInfo(trip) {
  document.getElementById("driver-info").innerHTML = `
    <img src="Assets/Review.jpg" alt="${trip.driver.name}">
    <div>
      <div class="driver-name">${trip.driver.name}</div>
      <div class="driver-meta">${trip.driver.email} | ${trip.driver.phone}</div>
      <div class="driver-meta">${trip.driver.vehicle}</div>
    </div>
  `;
}

function renderTimeline(timeline) {
  const list = document.getElementById("timeline-list");
  if (!Array.isArray(timeline) || timeline.length === 0) {
    list.innerHTML = `<li class="timeline-item"><div class="timeline-title" style="color:#6b7280;">No timeline events recorded yet.</div></li>`;
    return;
  }

  list.innerHTML = timeline.map((t) => `
    <li class="timeline-item">
      <div class="timeline-title">${t.title}</div>
      <div class="timeline-time">${t.time}</div>
    </li>
  `).join("");
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
  document.getElementById("add-note-btn").addEventListener("click", () => {
    alert("Add Note is coming soon.");
  });
  document.getElementById("report-issue-btn").addEventListener("click", () => {
    alert("Report Issue is coming soon.");
  });

  ["more-actions-dropdown", "print-export-dropdown"].forEach((id) => {
    document.getElementById(id).querySelector("button").addEventListener("click", () => {
      alert("This menu is coming soon.");
    });
  });
}

function renderTripView(trip) {
  renderTripInfo(trip);
  renderRouteDetails(trip);
  renderTripSummary(trip);
  renderPassengers(trip);
  renderDriverInfo(trip);
  renderTimeline(trip.timeline);
}

function mapApiTrip(b, fallbackId) {
  const seatsNum = Number(b.seatsBooked || b.seats || 1);
  const amountNum = Number(b.amount || b.fare || b.totalAmount || 0);
  const statusStr = String(b.status || "pending").toLowerCase();
  const createdStr = b.createdAt ? new Date(b.createdAt).toLocaleString() : "—";
  const completedStr = b.completedAt ? new Date(b.completedAt).toLocaleString() : "—";
  const fromLoc = b.pickupLocation || b.origin || "—";
  const toLoc = b.dropoffLocation || b.destination || "—";
  const passengerName = b.passenger?.fullName || b.employeeName || b.requestedBy || "Employee";

  const passengers = Array.isArray(b.passengers) && b.passengers.length
    ? b.passengers.map((p) =>
        typeof p === "string"
          ? { name: p, email: "—", phone: "—", boarding: fromLoc, dropoff: toLoc, amount: amountNum }
          : {
              name: p.fullName || p.name || "Passenger",
              email: p.email || "—",
              phone: p.phoneNumber || p.phone || "—",
              boarding: p.boarding || fromLoc,
              dropoff: p.dropoff || toLoc,
              amount: Number(p.amount || amountNum),
            }
      )
    : b.passenger || b.employeeName
    ? [{
        name: passengerName,
        email: b.passenger?.email || "—",
        phone: b.passenger?.phoneNumber || "—",
        boarding: fromLoc,
        dropoff: toLoc,
        amount: amountNum,
      }]
    : [];

  return {
    id: b.id || b.bookingReference || fallbackId || "—",
    status: statusStr,
    route: { from: fromLoc, to: toLoc },
    date: b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : createdStr,
    driver: {
      name: b.driver?.fullName || b.driverName || "Unassigned",
      email: b.driver?.email || "—",
      phone: b.driver?.phoneNumber || "—",
      vehicle: b.vehicle?.model ? `${b.vehicle.model} . ${b.vehicle.plateNumber || ""}` : b.vehicle || "—",
    },
    seats: `${seatsNum} Seat${seatsNum === 1 ? "" : "s"}`,
    amount: amountNum,
    tripIdLabel: b.bookingReference || b.id || fallbackId || "—",
    paymentMethod: b.paymentMethod || "Corporate Wallet",
    distance: b.distance ? `${b.distance}` : "—",
    duration: b.duration ? `${b.duration}` : "—",
    summary: {
      status: statusStr,
      totalAmount: amountNum,
      paidBy: b.paymentMethod || "Corporate Wallet",
      bookedBy: passengerName,
      passengerCount: passengers.length,
      seatsBooked: `${seatsNum}`,
      tripType: b.tripType || "Corporate Ride",
      createdAt: createdStr,
      completedAt: completedStr,
    },
    passengers,
    timeline: Array.isArray(b.timeline)
      ? b.timeline
      : b.createdAt
      ? [{ title: `Trip ${capitalize(statusStr)}`, time: createdStr }]
      : [],
  };
}

async function fetchTripDetail() {
  const tripId = getTripIdFromUrl();
  if (!tripId) return;

  try {
    let tripData = null;
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(tripId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      tripData = json.data || json;
    }

    if (!tripData || (!tripData.id && !tripData.pickupLocation)) {
      const histRes = await fetch(`${API_BASE}/bookings/history`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (histRes.ok) {
        const histJson = await histRes.json();
        const list = Array.isArray(histJson.data) ? histJson.data : Array.isArray(histJson) ? histJson : [];
        tripData = list.find((item) => item.id === tripId || item.bookingReference === tripId) || null;
      }
    }

    if (tripData) {
      renderTripView(mapApiTrip(tripData, tripId));
    }
  } catch (err) {
    console.error("Failed to fetch trip details:", err);
  }
}

if (requireAuth()) {
  hydrateUserHeader();
  renderTripView(getEmptyTrip(getTripIdFromUrl()));
  setupSidebarNav();
  setupMiscControls();
  fetchTripDetail();
}
