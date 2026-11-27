// AdminMainDashboard.js
//
// ⚠️ MOCK DATA — no confirmed admin API endpoints yet (this is the
// separate standalone admin portal, not the corporate one — same
// situation applies: nothing here has been verified against a real
// backend). Everything below reads from mock arrays; swap for real
// fetch() calls once those endpoints exist.

const ADMIN_API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

function getAdminHeaders() {
  const token = localStorage.getItem("ecoride_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const MOCK_NOTIFICATIONS = [];

const MOCK_ACTIVITY_FEED = [];

const MOCK_REVENUE = [];

const MOCK_USER_BREAKDOWN = [
  { label: "Passengers", value: 0, color: "#f1c40f" },
  { label: "Drivers", value: 0, color: "#f39c12" },
  { label: "Corporate", value: 0, color: "#bdc3c7" },
];
  
  // ---------------------------------------------------------------
  // Notification bell + panel
  // ---------------------------------------------------------------
  function setupNotifications() {
    const bell = document.getElementById("notif-bell");
    const panel = document.getElementById("notif-panel");
    const dot = document.getElementById("notif-dot");
    const list = document.getElementById("notif-panel-list");
  
    list.innerHTML = MOCK_NOTIFICATIONS.length
      ? MOCK_NOTIFICATIONS.map((n) => `
      <li class="notif-panel-item">
        <i class="ph-fill ${n.icon}"></i>
        <div>
          <div class="notif-panel-item-title">${n.title}</div>
          <div class="notif-panel-item-time">${n.time}</div>
        </div>
      </li>
    `).join("")
      : `<li class="notif-panel-item"><div class="notif-panel-item-title" style="color:#6b7280;">No new notifications.</div></li>`;
  
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
      if (!panel.contains(e.target) && !bell.contains(e.target)) {
        panel.classList.remove("open");
      }
    });
  }
  
  // ---------------------------------------------------------------
  // Admin profile dropdown
  // ---------------------------------------------------------------
  function setupProfileDropdown() {
    const toggle = document.getElementById("admin-profile-toggle");
    const dropdown = document.getElementById("admin-dropdown");
  
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("notif-panel").classList.remove("open");
      dropdown.classList.toggle("open");
    });
  
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
        dropdown.classList.remove("open");
      }
    });
  }
  
  // ---------------------------------------------------------------
  // Activity feed table
  // ---------------------------------------------------------------
  function renderActivityFeed(items) {
    const tbody = document.getElementById("feed-table-body");
    if (!Array.isArray(items) || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:28px 12px;">No platform activity recorded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((item, i) => `
      <tr data-index="${i}">
        <td>
          <div class="feed-desc">
            <div><i class="ph-fill ${item.icon}"></i></div>
            <div><strong>${item.title}</strong><br><small>${item.sub}</small></div>
          </div>
        </td>
        <td><span class="badge purple-bg">${item.badge}</span></td>
        <td>
          <button class="feed-icon-btn" data-action="email" data-index="${i}" aria-label="Email"><i class="ph ph-envelope-simple"></i></button>
          <button class="feed-icon-btn" data-action="notify" data-index="${i}" aria-label="Notify"><i class="ph ph-bell"></i></button>
          <button class="feed-icon-btn" data-action="message" data-index="${i}" aria-label="Message"><i class="ph ph-chat-circle-dots"></i></button>
        </td>
        <td><span class="status-lbl ${item.status}">${item.statusLabel}</span></td>
        <td><small>${item.date}<br>${item.time}</small></td>
        <td>
          <div class="img"><img src="Assets/Driver.jpg">
          <strong class="name">${item.admin}</strong>
          </div>
        </td>
        <td><button class="feed-more-btn" data-index="${i}">•••</button></td>
      </tr>
    `).join("");
  
    tbody.querySelectorAll(".feed-icon-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = items[btn.dataset.index];
        const action = btn.dataset.action;
        // TODO: replace with real send-email / push-notification / message
        // API calls once those endpoints exist.
        alert(`${capitalize(action)} action for "${item.title}" is coming soon.`);
      });
    });
  
    tbody.querySelectorAll(".feed-more-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => openRowMenu(e.currentTarget, Number(btn.dataset.index)));
    });
  }
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // ---------------------------------------------------------------
  // Row-action menu (View Details / Dismiss)
  // ---------------------------------------------------------------
  function setupRowMenu(items) {
    const menu = document.getElementById("feed-row-menu");
  
    menu.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(menu.dataset.index);
        const item = items[index];
        const action = btn.dataset.action;
        closeRowMenu();
  
        if (action === "view") {
          // Link to whichever existing admin page is actually relevant
          // to this feed item, rather than a generic placeholder.
          window.location.href = item.linkTo;
        } else if (action === "dismiss") {
          const row = document.querySelector(`#feed-table-body tr[data-index="${index}"]`);
          if (row) row.style.opacity = "0.4";
        }
      });
    });
  
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !e.target.closest(".feed-more-btn")) {
        closeRowMenu();
      }
    });
  }
  
  function openRowMenu(anchorEl, index) {
    const menu = document.getElementById("feed-row-menu");
    const rect = anchorEl.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    menu.style.left = `${rect.left + window.scrollX - 110}px`;
    menu.classList.add("open");
    menu.dataset.index = index;
  }
  
  function closeRowMenu() {
    document.getElementById("feed-row-menu").classList.remove("open");
  }
  
  // ---------------------------------------------------------------
  // Revenue bar chart (built dynamically + hover tooltip)
  // ---------------------------------------------------------------
  function renderRevenueChart(data) {
    const container = document.getElementById("revenue-bar-chart");
    const tooltip = document.getElementById("bar-tooltip");
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:140px;color:#6b7280;font-size:13px;">No revenue data recorded yet.</div>`;
      return;
    }
    const maxValue = 500000; // matches the fixed y-axis scale (500k/300k/100k/0)
  
    data.forEach((d) => {
      const col = document.createElement("div");
      col.className = "bar-container";
      const heightPct = Math.round((d.value / maxValue) * 100);
      col.innerHTML = `<div class="bar" style="height: ${heightPct}%"></div><span>${d.label}</span>`;
  
      col.addEventListener("mouseenter", () => {
        tooltip.textContent = `${d.label}: $${d.value.toLocaleString()}`;
        tooltip.classList.add("visible");
      });
      col.addEventListener("mouseleave", () => {
        tooltip.classList.remove("visible");
      });
  
      container.appendChild(col);
    });
  }
  
  // ---------------------------------------------------------------
  // Donut chart hover tooltip (chart itself stays CSS conic-gradient;
  // this just adds a hover readout since segments aren't individually
  // targetable in pure CSS)
  // ---------------------------------------------------------------
  function setupDonutTooltip(breakdown) {
    const donut = document.getElementById("donut-chart");
    const tooltip = document.getElementById("donut-tooltip");
    const total = breakdown.reduce((sum, b) => sum + b.value, 0);
  
    donut.addEventListener("mouseenter", () => {
      tooltip.innerHTML = breakdown.map((b) => `${b.label}: ${b.value} (${total > 0 ? Math.round((b.value / total) * 100) : 0}%)`).join("<br>");
      tooltip.classList.add("visible");
    });
    donut.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
  }
  
  // ---------------------------------------------------------------
  // Misc controls
  // ---------------------------------------------------------------
  function setupMiscControls() {
    document.getElementById("contact-support-btn").addEventListener("click", () => {
      alert("Contact Support is coming soon.");
    });
  }
  
  // ---------------------------------------------------------------
  // Fetch live admin overview
  // ---------------------------------------------------------------
  async function fetchAdminOverview() {
    try {
      const [dashRes, usersRes, driversRes, passengersRes, corpRes] = await Promise.allSettled([
        fetch(`${ADMIN_API_BASE}/admin/dashboard`, { headers: getAdminHeaders(), credentials: "include" }),
        fetch(`${ADMIN_API_BASE}/admin/users`, { headers: getAdminHeaders(), credentials: "include" }),
        fetch(`${ADMIN_API_BASE}/admin/drivers`, { headers: getAdminHeaders(), credentials: "include" }),
        fetch(`${ADMIN_API_BASE}/admin/passengers`, { headers: getAdminHeaders(), credentials: "include" }),
        fetch(`${ADMIN_API_BASE}/admin/corporates`, { headers: getAdminHeaders(), credentials: "include" }),
      ]);

      const extractList = async (r) => {
        if (r.status !== "fulfilled" || !r.value.ok) return [];
        const j = await r.value.json();
        return Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : [];
      };

      const [users, drivers, passengers, corporates] = await Promise.all([
        extractList(usersRes),
        extractList(driversRes),
        extractList(passengersRes),
        extractList(corpRes),
      ]);

      let totalUsers = users.length || (drivers.length + passengers.length + corporates.length);
      let activeDrivers = drivers.filter((d) => String(d.verificationStatus || d.status || "").toUpperCase() === "APPROVED").length || drivers.length;
      let totalRevenue = 0;
      let totalOrders = 0;
      let activityItems = [];

      if (dashRes.status === "fulfilled" && dashRes.value.ok) {
        const dashJson = await dashRes.value.json();
        const d = dashJson.data || dashJson;
        if (d && typeof d === "object") {
          if (d.totalUsers !== undefined) totalUsers = Number(d.totalUsers);
          if (d.activeDrivers !== undefined) activeDrivers = Number(d.activeDrivers);
          if (d.totalRevenue !== undefined) totalRevenue = Number(d.totalRevenue);
          if (d.totalOrders !== undefined || d.totalBookings !== undefined) {
            totalOrders = Number(d.totalOrders ?? d.totalBookings);
          }
          if (Array.isArray(d.revenueChart || d.monthlyRevenue)) {
            renderRevenueChart(d.revenueChart || d.monthlyRevenue);
          }
          if (Array.isArray(d.activityFeed)) {
            activityItems = d.activityFeed;
          }
        }
      }

      const statValues = document.querySelectorAll(".stats-grid .stat-card h3");
      if (statValues[0]) statValues[0].textContent = totalUsers.toLocaleString();
      if (statValues[1]) statValues[1].textContent = activeDrivers.toLocaleString();
      if (statValues[2]) statValues[2].textContent = `₦${totalRevenue.toLocaleString()}`;
      if (statValues[3]) statValues[3].textContent = totalOrders.toLocaleString();

      const chartVal = document.querySelector(".user-breakdown .chart-value");
      if (chartVal) chartVal.textContent = totalUsers.toLocaleString();
      const revHeading = document.querySelector(".revenue-chart h4");
      if (revHeading) revHeading.textContent = `Total Revenue = ₦${totalRevenue.toLocaleString()}`;

      const listItems = document.querySelectorAll(".breakdown-list li");
      if (listItems[0]) listItems[0].innerHTML = `<span class="dot yellow"></span> ${passengers.length} passengers`;
      if (listItems[1]) listItems[1].innerHTML = `<span class="dot light-yellow"></span> ${drivers.length} drivers`;
      if (listItems[2]) listItems[2].innerHTML = `<span class="dot gray-dot"></span> ${corporates.length} corporate`;

      setupDonutTooltip([
        { label: "Passengers", value: passengers.length, color: "#f1c40f" },
        { label: "Drivers", value: drivers.length, color: "#f39c12" },
        { label: "Corporate", value: corporates.length, color: "#bdc3c7" },
      ]);

      if (activityItems.length === 0) {
        const pendingDrivers = drivers.filter((d) => String(d.verificationStatus || "").toUpperCase() === "PENDING").slice(0, 3);
        const pendingCorps = corporates.filter((c) => String(c.verificationStatus || "").toUpperCase() === "PENDING").slice(0, 3);
        activityItems = [
          ...pendingDrivers.map((d) => ({
            icon: "ph-car",
            title: "Driver Verification Pending",
            sub: d.user?.fullName || d.fullName || d.email || "Driver",
            badge: "Driver",
            status: "pending",
            statusLabel: "Pending",
            date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—",
            time: "",
            admin: "Admin",
            linkTo: "AdminVerificationPage.html",
          })),
          ...pendingCorps.map((c) => ({
            icon: "ph-buildings",
            title: "Corporate Verification Pending",
            sub: c.companyName || c.email || "Company",
            badge: "Corporate",
            status: "pending",
            statusLabel: "Pending",
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
            time: "",
            admin: "Admin",
            linkTo: "AdminVerificationPage.html",
          })),
        ];
      }

      renderActivityFeed(activityItems);
      setupRowMenu(activityItems);
    } catch (err) {
      console.error("Failed to fetch admin overview:", err);
    }
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  setupNotifications();
  setupProfileDropdown();
  renderActivityFeed(MOCK_ACTIVITY_FEED);
  setupRowMenu(MOCK_ACTIVITY_FEED);
  renderRevenueChart(MOCK_REVENUE);
  setupDonutTooltip(MOCK_USER_BREAKDOWN);
  setupMiscControls();
  fetchAdminOverview();