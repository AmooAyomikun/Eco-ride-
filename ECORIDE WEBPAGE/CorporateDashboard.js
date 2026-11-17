const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

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

const INITIAL_STATS = [
  {
    icon: "ph-user",
    iconClass: "green",
    label: "Active Employees",
    value: "0",
    deltaHighlight: "0%",
    deltaText: "vs last 7 days",
  },
  {
    icon: "ph-car-profile",
    iconFill: true,
    iconClass: "blue",
    label: "Today's Trips",
    value: "0",
    deltaHighlight: "0%",
    deltaText: "vs last 7 days",
  },
  {
    icon: "ph-coins",
    iconFill: true,
    iconClass: "green",
    label: "Monthly Transport Spend",
    value: "N0",
    deltaHighlight: "0%",
    deltaText: "vs last month",
  },
  {
    icon: "ph-calendar-check",
    iconClass: "dark-green",
    label: "Pending Ride Requests",
    value: "0",
    deltaText: "View and approve requests",
    action: true,
  },
];

const QUICK_ACTIONS = [
  { icon: "ph-car", iconType: "ph", iconClass: "green", title: "Create Ride", sub: "Schedule a ride" },
  { icon: "ph-user", iconType: "ph-fill", iconClass: "green", title: "Invite Employee", sub: "Add team member" },
  { icon: "ph-file-text", iconType: "ph-fill", iconClass: "blue", title: "Download Report", sub: "Get insights" },
];

const EMPTY_CHART = [
  { label: "Jan", value: 0 },
  { label: "Feb", value: 0 },
  { label: "Mar", value: 0 },
  { label: "Apr", value: 0 },
  { label: "May", value: 0 },
];

const BOOKING_AVATARS = [
  "Assets/Driver.jpg",
  "Assets/Admin 2.jpg",
  "Assets/Review.jpg",
];

function renderStatCards(stats) {
  const container = document.getElementById("stat-cards");
  container.innerHTML = stats.map((stat) => {
    const iconPrefix = stat.iconFill ? "ph-fill" : "ph";
    const footerHtml = stat.action
      ? `<span class="stat-action" data-action="pending-requests">${stat.deltaText}</span>`
      : `<span class="stat-delta"><em>${stat.deltaHighlight || "0%"}</em> ${stat.deltaText || ""}</span>`;

    return `
      <div class="stat-card">
        <div class="stat-card-main">
          <span class="stat-icon ${stat.iconClass || "green"}">
            <i class="${iconPrefix} ${stat.icon}"></i>
          </span>
          <div class="stat-card-info">
            <span class="stat-label">${stat.label}</span>
            <div class="stat-value">${stat.value}</div>
          </div>
        </div>
        ${footerHtml}
      </div>
    `;
  }).join("");

  const pendingAction = container.querySelector('[data-action="pending-requests"]');
  if (pendingAction) {
    pendingAction.addEventListener("click", () => {
      document.getElementById("requests-list").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

function renderBookings(bookings) {
  const list = document.getElementById("bookings-list");
  if (!Array.isArray(bookings) || bookings.length === 0) {
    list.innerHTML = `<li class="booking-item" style="justify-content:center;color:#6b7280;padding:18px 0;font-size:12px;">No upcoming bookings yet.</li>`;
    return;
  }

  list.innerHTML = bookings.map((b) => `
    <li class="booking-item">
      <div class="booking-icon"><i class="ph ph-calendar-plus"></i></div>
      <div class="booking-meta">
        <div class="booking-date">${b.date || b.createdAt || "Scheduled"}</div>
        <div class="booking-route">${b.from || b.pickupLocation || "Pickup"} <i class="ph ph-arrow-right"></i> ${b.to || b.dropoffLocation || "Dropoff"}</div>
      </div>
      <span class="seats-pill">${b.seats || b.seatsBooked || 1} Seats</span>
      <div class="avatars-stack">
        ${BOOKING_AVATARS.map((src) => `<img src="${src}" alt="Passenger">`).join("")}
        ${b.more ? `<span class="avatars-more">+${b.more}</span>` : ""}
      </div>
    </li>
  `).join("");
}

function renderRequests(requests) {
  const list = document.getElementById("requests-list");
  if (!Array.isArray(requests) || requests.length === 0) {
    list.innerHTML = `<li class="request-item" style="justify-content:center;color:#6b7280;padding:14px 0;font-size:12px;">No pending ride requests.</li>`;
    return;
  }

  list.innerHTML = requests.map((r) => `
    <li class="request-item" data-id="${r.id}">
      <img src="${r.avatar || "Assets/Review.jpg"}" alt="${r.name || "Employee"}" class="request-avatar">
      <div class="request-meta">
        <div class="request-name">${r.name || r.passenger?.fullName || "Employee"}</div>
        <div class="request-route">${r.from || r.pickupLocation || "Pickup"} <i class="ph ph-arrow-right"></i> ${r.to || r.dropoffLocation || "Dropoff"}</div>
      </div>
      <div class="request-datetime">
        <i class="ph ph-calendar-blank"></i>
        <span>${r.date || r.createdAt || "Pending"}</span>
      </div>
      <span class="request-seats">${r.seats || r.seatsBooked || 1} Seats</span>
      <div class="request-actions">
        <button class="approve-btn" data-id="${r.id}" data-decision="approved">Approve</button>
        <button class="decline-btn" data-id="${r.id}" data-decision="declined">Decline</button>
      </div>
    </li>
  `).join("");

  list.querySelectorAll(".approve-btn, .decline-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleRequestDecision(btn.dataset.id, btn.dataset.decision));
  });
}

async function handleRequestDecision(id, decision) {
  const item = document.querySelector(`.request-item[data-id="${id}"]`);
  if (!item) return;

  const endpointAction = decision === "approved" ? "accept" : "reject";
  try {
    await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}/${endpointAction}`, {
      method: "PATCH",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
    });
  } catch (err) {
    console.error(`Failed to ${endpointAction} booking:`, err);
  }

  const actions = item.querySelector(".request-actions");
  actions.innerHTML = `<span class="request-status-label ${decision}">
    ${decision === "approved" ? "Approved" : "Declined"}
  </span>`;
  item.classList.add("resolved");
}

function renderQuickActions(actions) {
  const container = document.getElementById("quick-actions");
  container.innerHTML = actions.map((a) => `
    <button class="quick-action-btn" data-action="${a.title}">
      <span class="quick-action-icon ${a.iconClass || "green"}">
        <i class="${a.iconType} ${a.icon}"></i>
      </span>
      <span class="quick-action-text">
        <span class="quick-action-title">${a.title}</span>
        <span class="quick-action-sub">${a.sub}</span>
      </span>
      <i class="ph ph-caret-right quick-action-arrow"></i>
    </button>
  `).join("");

  container.querySelectorAll(".quick-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.action === "Create Ride") {
        window.location.href = "CreateBooking.html";
      } else if (btn.dataset.action === "Invite Employee") {
        window.location.href = "EmployeeViewDashboard.html";
      } else if (btn.dataset.action === "Download Report") {
        window.location.href = "Reports.html";
      }
    });
  });
}

function renderChart(data) {
  const barsContainer = document.getElementById("chart-bars");
  const tooltip = document.getElementById("chart-tooltip");
  const chartItems = Array.isArray(data) && data.length ? data : EMPTY_CHART;
  const maxValue = Math.max(500000, ...chartItems.map((d) => Number(d.value) || 0));

  barsContainer.innerHTML = chartItems.map((d, i) => {
    const heightPct = Math.round(((Number(d.value) || 0) / maxValue) * 100);
    return `
      <div class="chart-bar-col" data-index="${i}">
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height: ${heightPct}%"></div>
        </div>
        <span class="chart-bar-label">${d.label}</span>
      </div>
    `;
  }).join("");

  const totalSpend = chartItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  tooltip.innerHTML = `<span>Total</span><strong>₦ ${totalSpend.toLocaleString()}</strong>`;

  const cols = barsContainer.querySelectorAll(".chart-bar-col");
  cols.forEach((col) => {
    col.addEventListener("mouseenter", () => {
      cols.forEach((c) => c.classList.remove("active"));
      col.classList.add("active");
      const d = chartItems[col.dataset.index];
      tooltip.innerHTML = `<span>${d.label}</span><strong>₦ ${(Number(d.value) || 0).toLocaleString()}</strong>`;
    });
    col.addEventListener("mouseleave", () => {
      col.classList.remove("active");
      tooltip.innerHTML = `<span>Total</span><strong>₦ ${totalSpend.toLocaleString()}</strong>`;
    });
  });
}

function renderWallet(wallet) {
  document.getElementById("wallet-balance").textContent = wallet.balance || "₦ 0.00";
}

function renderRoutes(routes) {
  const list = document.getElementById("routes-list");
  if (!Array.isArray(routes) || routes.length === 0) {
    list.innerHTML = `<li class="route-item" style="justify-content:center;color:#6b7280;padding:14px 0;font-size:12px;">No routes recorded yet.</li>`;
    return;
  }

  const maxTrips = Math.max(1, ...routes.map((r) => Number(r.trips) || 0));

  list.innerHTML = routes.map((r, i) => `
    <li class="route-item">
      <span class="route-rank">${i + 1}</span>
      <div class="route-meta">
        <div class="route-name">${r.from} <i class="ph ph-arrow-right"></i> ${r.to}</div>
        <div class="route-bar-track">
          <div class="route-bar-fill" style="width: ${((Number(r.trips) || 0) / maxTrips) * 90}%"></div>
        </div>
      </div>
      <span class="route-count">${r.trips}</span>
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

  document.getElementById("top-up-btn").addEventListener("click", () => {
    window.location.href = "Wallet.html";
  });

  document.getElementById("contact-support-btn").addEventListener("click", () => {
    alert("Contact Support is coming soon.");
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("ecoride_token");
    localStorage.removeItem("ecoride_user");
    window.location.href = "Login.html";
  });

  document.getElementById("view-all-requests").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "Bookings.html";
  });

  document.getElementById("date-range-btn").addEventListener("click", () => {
    alert("Date range picker is coming soon.");
  });
}

async function fetchDashboardOverview() {
  try {
    const [dashRes, profileRes, walletRes, empRes, bookingsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/corporate/dashboard`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/corporate/profile`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/wallets`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/corporate/employees`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/bookings`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
    ]);

    const stats = INITIAL_STATS.map((s) => ({ ...s }));

    if (profileRes.status === "fulfilled" && profileRes.value.ok) {
      const profileJson = await profileRes.value.json();
      const p = profileJson.data || profileJson;
      const companyName = p?.companyName;
      if (companyName) {
        document.querySelectorAll(".company-name, .admin-name").forEach((el) => {
          el.textContent = companyName;
        });
      }
    }

    if (walletRes.status === "fulfilled" && walletRes.value.ok) {
      const walletJson = await walletRes.value.json();
      const w = walletJson.data || walletJson;
      const balance = w?.balance ?? 0;
      renderWallet({ balance: `₦ ${Number(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` });
    }

    if (empRes.status === "fulfilled" && empRes.value.ok) {
      const empJson = await empRes.value.json();
      const empList = Array.isArray(empJson.data) ? empJson.data : Array.isArray(empJson.employees) ? empJson.employees : [];
      stats[0].value = String(empList.length);
    }

    if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
      const bookingsJson = await bookingsRes.value.json();
      const bList = Array.isArray(bookingsJson.data) ? bookingsJson.data : Array.isArray(bookingsJson.bookings) ? bookingsJson.bookings : [];
      renderBookings(bList.slice(0, 4));
      const pendingList = bList.filter((b) => String(b.status || "").toUpperCase() === "PENDING");
      stats[3].value = String(pendingList.length);
      renderRequests(pendingList.slice(0, 3));
    }

    if (dashRes.status === "fulfilled" && dashRes.value.ok) {
      const result = await dashRes.value.json();
      const d = result.data || result;
      if (d && typeof d === "object") {
        if (d.activeEmployees !== undefined || d.totalEmployees !== undefined) {
          stats[0].value = Number(d.activeEmployees ?? d.totalEmployees).toLocaleString();
        }
        if (d.todaysTrips !== undefined || d.totalTrips !== undefined) {
          stats[1].value = Number(d.todaysTrips ?? d.totalTrips).toLocaleString();
        }
        if (d.monthlySpend !== undefined || d.totalSpend !== undefined) {
          stats[2].value = `N${Number(d.monthlySpend ?? d.totalSpend).toLocaleString()}`;
        }
        if (d.pendingRequests !== undefined || d.pendingBookings !== undefined) {
          stats[3].value = String(d.pendingRequests ?? d.pendingBookings);
        }
        if (Array.isArray(d.upcomingBookings)) renderBookings(d.upcomingBookings);
        if (Array.isArray(d.recentRequests)) renderRequests(d.recentRequests);
        if (Array.isArray(d.monthlyChart || d.chart)) renderChart(d.monthlyChart || d.chart);
        if (Array.isArray(d.topRoutes || d.routes)) renderRoutes(d.topRoutes || d.routes);
      }
    }

    renderStatCards(stats);
  } catch (err) {
    console.error("Failed to fetch dashboard overview:", err);
  }
}

hydrateUserHeader();
renderStatCards(INITIAL_STATS);
renderBookings([]);
renderRequests([]);
renderQuickActions(QUICK_ACTIONS);
renderChart(EMPTY_CHART);
renderWallet({ balance: "₦ 0.00" });
renderRoutes([]);
setupSidebarNav();
setupMiscControls();
fetchDashboardOverview();
