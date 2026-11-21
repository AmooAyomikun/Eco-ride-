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

function getEmployeeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function getEmptyEmployee(id) {
  return {
    name: "Employee",
    title: "—",
    department: "—",
    status: "active",
    employeeId: id || "—",
    joined: "—",
    type: "—",
    email: "—",
    manager: "—",
    workMode: "—",
    phone: "—",
    office: "—",
    summary: [
      { icon: "ph-car", iconType: "ph", label: "Total Trips", value: "0", deltaHighlight: "0%", deltaText: "vs last 7 days" },
      { icon: "ph-credit-card", iconType: "ph", label: "Total Spend", value: "₦0", deltaHighlight: "0%", deltaText: "vs last 7 days" },
      { icon: "ph-credit-card", iconType: "ph", label: "This Month Spend", value: "₦0", deltaHighlight: "0%", deltaText: "vs last 7 days" },
      { icon: "ph-star", iconType: "ph-fill", iconClass: "star", label: "Average rating", value: "0.0", deltaHighlight: "0%", deltaText: "vs last 7 days" },
    ],
    preferredRoutes: [],
    emergencyContact: {
      name: "—",
      relationship: "—",
      phone: "—",
    },
    activity: [],
  };
}

function renderProfile(emp) {
  document.getElementById("profile-name").textContent = emp.name;
  document.getElementById("profile-title").textContent = emp.title;
  document.getElementById("profile-dept").textContent = emp.department;

  const statusEl = document.getElementById("profile-status");
  statusEl.textContent = emp.status === "active" ? "Active" : "Inactive";
  statusEl.className = `profile-status-pill ${emp.status}`;

  document.getElementById("detail-empid").textContent = emp.employeeId;
  document.getElementById("detail-joined").textContent = emp.joined;
  document.getElementById("detail-type").textContent = emp.type;
  document.getElementById("detail-email").textContent = emp.email;
  document.getElementById("detail-manager").textContent = emp.manager;
  document.getElementById("detail-workmode").textContent = emp.workMode;
  document.getElementById("detail-phone").textContent = emp.phone;
  document.getElementById("detail-office").textContent = emp.office;
}

function renderSummary(summary) {
  const grid = document.getElementById("summary-grid");
  grid.innerHTML = summary.map((s) => `
    <div class="summary-item">
      <div class="summary-icon ${s.iconClass || ""}"><i class="${s.iconType} ${s.icon}"></i></div>
      <div class="summary-text">
        <span class="summary-label">${s.label}</span>
        <span class="summary-value">${s.value}</span>
        <span class="summary-delta"><em>${s.deltaHighlight}</em> ${s.deltaText}</span>
      </div>
    </div>
  `).join("");
}

function renderPreferredRoutes(routes) {
  const list = document.getElementById("preferred-routes");
  if (!Array.isArray(routes) || routes.length === 0) {
    list.innerHTML = `<li class="preferred-route-item" style="justify-content:center;color:#6b7280;font-size:12px;">No preferred routes recorded yet.</li>`;
    return;
  }
  list.innerHTML = routes.map((r) => `
    <li class="preferred-route-item">
      <span class="preferred-route-icon"><i class="ph ph-git-branch"></i></span>
      <span class="preferred-route-text">${r.from} <i class="ph ph-arrow-right"></i> ${r.to}</span>
      <span class="preferred-tag">Preferred</span>
    </li>
  `).join("");
}

function renderEmergencyContact(ec) {
  document.getElementById("emergency-contact").innerHTML = `
    <div><span class="ec-label">Name</span><span class="ec-value">${ec.name}</span></div>
    <div><span class="ec-label">Relationship</span><span class="ec-value">${ec.relationship}</span></div>
    <div><span class="ec-label">Phone</span><span class="ec-value">${ec.phone}</span></div>
  `;
}

function renderActivity(activity) {
  const list = document.getElementById("activity-list");
  if (!Array.isArray(activity) || activity.length === 0) {
    list.innerHTML = `<li class="activity-item" style="text-align:center;color:#6b7280;padding:18px 0;font-size:13px;">No recent activity found for this employee yet.</li>`;
    return;
  }
  list.innerHTML = activity.map((a) => {
    const subHtml = a.routeFrom
      ? `<div class="activity-sub">${a.routeFrom} <i class="ph ph-arrow-right"></i> ${a.routeTo}</div>`
      : `<div class="activity-sub">${a.sub}</div>`;

    return `
      <li class="activity-item">
        <div class="activity-row">
          <div class="activity-text-row">
            <span class="activity-icon"><i class="ph ${a.icon}"></i></span>
            <div>
              <div class="activity-title">${a.title}</div>
              ${subHtml}
            </div>
          </div>
          <span class="activity-time">${a.time}</span>
        </div>
      </li>
    `;
  }).join("");
}

let currentActivity = [];

function setupActivityFilter() {
  const select = document.getElementById("activity-filter");
  const categoryMap = {
    Trips: ["ph-car", "ph-check-circle", "ph-git-branch"],
    Bookings: ["ph-calendar-blank"],
    Payments: ["ph-wallet", "ph-file-text"],
  };

  select.addEventListener("change", () => {
    const value = select.value;
    if (value === "All Activity") {
      renderActivity(currentActivity);
      return;
    }
    const icons = categoryMap[value] || [];
    renderActivity(currentActivity.filter((a) => icons.includes(a.icon)));
  });
}

function setupDetailTabs() {
  const tabs = document.querySelectorAll(".detail-tab");
  const activityPanel = document.getElementById("activity-panel");
  const otherPanel = document.getElementById("other-tab-panel");
  const otherLabel = document.getElementById("other-tab-label");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      if (tab.dataset.tab === "activity") {
        activityPanel.style.display = "block";
        otherPanel.style.display = "none";
      } else {
        activityPanel.style.display = "none";
        otherPanel.style.display = "block";
        otherLabel.textContent = `${tab.textContent.trim()} view is coming soon.`;
      }
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
    window.location.href = "mailto:support@ecoride.com?subject=EcoRide%20Corporate%20Support";
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("ecoride_token");
    localStorage.removeItem("ecoride_user");
    window.location.href = "Login.html";
  });
  document.getElementById("edit-employee-btn").addEventListener("click", async () => {
    const employeeId = getEmployeeIdFromUrl();
    if (!employeeId) return;
    const currentDept = document.getElementById("profile-dept").textContent.replace(" Department", "").trim();
    const currentTitle = document.getElementById("profile-title").textContent.trim();
    const department = prompt("Update Department:", currentDept !== "—" ? currentDept : "Operations");
    if (department === null) return;
    const position = prompt("Update Position:", currentTitle !== "—" ? currentTitle : "Staff");
    if (position === null) return;
    try {
      const res = await fetch(`${API_BASE}/corporate/employees/${encodeURIComponent(employeeId)}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          department: department.trim() || "Operations",
          position: position.trim() || "Staff",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || data.error || "Could not update employee.");
        return;
      }
      alert(data.message || "Employee updated.");
      fetchEmployeeDetail();
    } catch (err) {
      console.error("Edit employee error:", err);
      alert("Network error while updating employee.");
    }
  });
  document.getElementById("more-actions-btn").addEventListener("click", async () => {
    const employeeId = getEmployeeIdFromUrl();
    if (!employeeId) return;
    const isCurrentlyActive = document.getElementById("profile-status").classList.contains("active");
    const nextStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    const actionLabel = isCurrentlyActive ? "Deactivate" : "Reactivate";
    if (!confirm(`${actionLabel} this employee?`)) return;
    try {
      const res = await fetch(`${API_BASE}/corporate/employees/${encodeURIComponent(employeeId)}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || data.error || `Could not ${actionLabel.toLowerCase()} employee.`);
        return;
      }
      fetchEmployeeDetail();
    } catch (err) {
      console.error("Status toggle error:", err);
    }
  });
  document.getElementById("view-all-activity").addEventListener("click", () => {
    document.getElementById("activity-filter").value = "All Activity";
    renderActivity(currentActivity);
  });
  document.getElementById("preferred-view-all").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "Trips.html";
  });
}

function renderEmployeeView(employeeData) {
  currentActivity = Array.isArray(employeeData.activity) ? employeeData.activity : [];
  renderProfile(employeeData);
  renderSummary(employeeData.summary);
  renderPreferredRoutes(employeeData.preferredRoutes);
  renderEmergencyContact(employeeData.emergencyContact);
  renderActivity(currentActivity);
}

async function fetchEmployeeDetail() {
  const employeeId = getEmployeeIdFromUrl();
  const baseData = getEmptyEmployee(employeeId);
  if (!employeeId) return;

  try {
    const res = await fetch(`${API_BASE}/corporate/employees/${encodeURIComponent(employeeId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const result = await res.json();
    if (res.ok && result.success && result.data) {
      const d = result.data;
      const tripsCount = Number(d.totalTrips ?? d.tripsCount ?? 0);
      const totalSpend = Number(d.totalSpend ?? 0);
      const monthSpend = Number(d.monthlySpend ?? d.thisMonthSpend ?? 0);
      const avgRating = d.averageRating !== undefined ? Number(d.averageRating).toFixed(1) : "0.0";

      renderEmployeeView({
        ...baseData,
        name: d.user?.fullName || d.fullName || d.name || baseData.name,
        title: d.position || d.role || baseData.title,
        department: d.department ? `${d.department} Department` : baseData.department,
        status: String(d.status || "ACTIVE").toLowerCase() === "inactive" ? "inactive" : "active",
        employeeId: d.employeeId || d.id || baseData.employeeId,
        joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : baseData.joined,
        type: d.employmentType || baseData.type,
        email: d.user?.email || d.email || baseData.email,
        manager: d.manager || baseData.manager,
        workMode: d.workMode || baseData.workMode,
        phone: d.user?.phoneNumber || d.phone || baseData.phone,
        office: d.office || baseData.office,
        summary: Array.isArray(d.summary) && d.summary.length ? d.summary : [
          { icon: "ph-car", iconType: "ph", label: "Total Trips", value: tripsCount.toLocaleString(), deltaHighlight: "0%", deltaText: "vs last 7 days" },
          { icon: "ph-credit-card", iconType: "ph", label: "Total Spend", value: `₦${totalSpend.toLocaleString()}`, deltaHighlight: "0%", deltaText: "vs last 7 days" },
          { icon: "ph-credit-card", iconType: "ph", label: "This Month Spend", value: `₦${monthSpend.toLocaleString()}`, deltaHighlight: "0%", deltaText: "vs last 7 days" },
          { icon: "ph-star", iconType: "ph-fill", iconClass: "star", label: "Average rating", value: avgRating, deltaHighlight: "0%", deltaText: "vs last 7 days" },
        ],
        preferredRoutes: Array.isArray(d.preferredRoutes) ? d.preferredRoutes : [],
        emergencyContact: d.emergencyContact || baseData.emergencyContact,
        activity: Array.isArray(d.activity) ? d.activity : [],
      });
    }
  } catch (err) {
    console.error("Failed to fetch employee details:", err);
  }
}

if (requireAuth()) {
  hydrateUserHeader();
  const initialEmployee = getEmptyEmployee(getEmployeeIdFromUrl());
  renderEmployeeView(initialEmployee);
  setupActivityFilter();
  setupDetailTabs();
  setupSidebarNav();
  setupMiscControls();
  fetchEmployeeDetail();
}
