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

const REPORT_TYPES = [
  { icon: "ph-chart-bar", iconType: "ph", iconBg: "#dcfce7", iconColor: "#16a34a", title: "Trips Reports", sub: "View trips analytics" },
  { icon: "ph-wallet", iconType: "ph-fill", iconBg: "#fef9c3", iconColor: "#eab308", title: "Spend Report", sub: "Track spending" },
  { icon: "ph-users", iconType: "ph-fill", iconBg: "#cffafe", iconColor: "#06b6d4", title: "Employee Report", sub: "Employee Insights" },
  { icon: "ph-file-text", iconType: "ph", iconBg: "#fae8ff", iconColor: "#d946ef", title: "Custom Report", sub: "Build custom report" },
];

const state = {
  recentReports: JSON.parse(localStorage.getItem("ecoride_recent_reports") || "[]"),
  showAllReports: false,
  summaryPeriod: "Current Period",
  summary: [
    { icon: "ph-car", iconType: "ph", label: "Total Trips", value: "0", deltaHighlight: "0%", deltaText: "vs last period" },
    { icon: "ph-wallet", iconType: "ph", label: "Total Spent", value: "₦0", deltaHighlight: "0%", deltaText: "vs last period" },
    { icon: "ph-users", iconType: "ph-fill", label: "Active Employees", value: "0", deltaHighlight: "0%", deltaText: "vs last period" },
    { icon: "ph-file-text", iconType: "ph", label: "Total Bookings", value: "0", deltaHighlight: "0%", deltaText: "vs last period" },
    { icon: "ph-star", iconType: "ph-fill", label: "Average Rating", value: "0.0", deltaHighlight: "0%", deltaText: "vs last period" },
  ],
};

function saveRecentReports() {
  try {
    localStorage.setItem("ecoride_recent_reports", JSON.stringify(state.recentReports.slice(0, 20)));
  } catch (err) {
    console.error("Could not save reports:", err);
  }
}

function downloadReportCsv(report) {
  const rows = [
    ["Report Title", report.title],
    ["Details", report.generated],
    [],
    ["Metric", "Value"],
    ...state.summary.map((s) => [s.label, s.value]),
  ];
  const csvContent = rows
    .map((r) => r.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printReportPdf(report) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) {
    downloadReportCsv(report);
    return;
  }
  const rowsHtml = state.summary
    .map((s) => `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;">${s.label}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${s.value}</td></tr>`)
    .join("");
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>${report.title}</title></head>
    <body style="font-family:Arial,sans-serif;padding:32px;color:#112028;">
      <h2 style="margin-bottom:4px;">EcoRide Corporate — ${report.title}</h2>
      <p style="color:#6b7280;font-size:13px;margin-top:0;">${report.generated}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:24px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:2px solid #112028;">Metric</th>
            <th style="text-align:left;padding:10px;border-bottom:2px solid #112028;">Value</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function renderReportTypeCards(types) {
  const container = document.getElementById("report-type-cards");
  container.innerHTML = types.map((t) => `
    <button class="report-type-card" data-title="${t.title}">
      <span class="report-type-icon" style="background-color:${t.iconBg}; color:${t.iconColor};">
        <i class="${t.iconType} ${t.icon}"></i>
      </span>
      <span class="report-type-text">
        <span class="report-type-title">${t.title}</span>
        <span class="report-type-sub">${t.sub}</span>
      </span>
    </button>
  `).join("");

  const selectMap = {
    "Trips Reports": "Trips Report",
    "Spend Report": "Spend Report",
    "Employee Report": "Employee Report",
    "Custom Report": "All Reports",
  };

  container.querySelectorAll(".report-type-card").forEach((card) => {
    card.addEventListener("click", () => {
      const select = document.getElementById("filter-report-type");
      if (select && selectMap[card.dataset.title]) {
        select.value = selectMap[card.dataset.title];
      }
      document.getElementById("generate-report-btn").click();
    });
  });
}

function renderRecentReports(reports) {
  const list = document.getElementById("recent-reports-list");
  if (!Array.isArray(reports) || reports.length === 0) {
    list.innerHTML = `<li class="recent-report-item" style="justify-content:center;color:#6b7280;padding:24px 0;font-size:13px;">No reports generated yet. Use Quick Filters to generate a report.</li>`;
    return;
  }

  const visibleReports = state.showAllReports ? reports : reports.slice(0, 5);

  list.innerHTML = visibleReports.map((r, i) => `
    <li class="recent-report-item">
      <span class="recent-report-icon"><i class="ph ph-file-text"></i></span>
      <div class="recent-report-meta">
        <div class="recent-report-title">${r.title}</div>
        <div class="recent-report-sub">${r.generated}</div>
      </div>
      <div class="report-download-group">
        <button class="report-pdf-btn" data-index="${i}">PDF</button>
        <button class="report-more-btn" data-index="${i}" title="Download CSV" aria-label="Download CSV"><i class="ph-bold ph-caret-down"></i></button>
      </div>
    </li>
  `).join("");

  list.querySelectorAll(".report-pdf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const report = visibleReports[Number(btn.dataset.index)];
      if (report) printReportPdf(report);
    });
  });
  list.querySelectorAll(".report-more-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const report = visibleReports[Number(btn.dataset.index)];
      if (report) downloadReportCsv(report);
    });
  });
}

function renderSummary(data) {
  document.getElementById("reports-summary-title").textContent = `Reports Summary (${data.summaryPeriod})`;

  const grid = document.getElementById("reports-summary-grid");
  grid.innerHTML = data.summary.map((s) => `
    <div class="reports-stat">
      <span class="reports-stat-icon"><i class="${s.iconType} ${s.icon}"></i></span>
      <div class="reports-stat-info">
        <span class="reports-stat-label">${s.label}</span>
        <span class="reports-stat-value">${s.value}</span>
        <span class="reports-stat-delta"><em>${s.deltaHighlight}</em> ${s.deltaText}</span>
      </div>
    </div>
  `).join("");
}

function setupGenerateReport() {
  document.getElementById("generate-report-btn").addEventListener("click", () => {
    const department = document.getElementById("filter-department").value;
    const reportType = document.getElementById("filter-report-type").value;
    const dateRange = document.getElementById("filter-date-range").value;
    const nowLabel = new Date().toLocaleString();

    state.recentReports.unshift({
      title: `${reportType} - ${department}`,
      generated: `Generated on ${nowLabel} (${dateRange})`,
    });
    saveRecentReports();
    renderRecentReports(state.recentReports);
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
  const toggleViewAll = () => {
    state.showAllReports = !state.showAllReports;
    document.getElementById("view-all-reports-bottom-btn").textContent = state.showAllReports
      ? "Show Less"
      : "View All Reports";
    renderRecentReports(state.recentReports);
  };
  document.getElementById("view-all-reports-btn").addEventListener("click", toggleViewAll);
  document.getElementById("view-all-reports-bottom-btn").addEventListener("click", toggleViewAll);

  const searchInput = document.querySelector(".search-bar input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        renderRecentReports(state.recentReports);
        return;
      }
      renderRecentReports(
        state.recentReports.filter((r) =>
          `${r.title} ${r.generated}`.toLowerCase().includes(q)
        )
      );
    });
  }
}

async function fetchReportsData() {
  try {
    const [dashRes, empRes, bookingsRes, historyRes] = await Promise.allSettled([
      fetch(`${API_BASE}/corporate/dashboard`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/corporate/employees`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/bookings`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
      fetch(`${API_BASE}/bookings/history`, { method: "GET", headers: getAuthHeaders(), credentials: "include" }),
    ]);

    let totalTrips = 0;
    let totalSpent = 0;
    let activeEmployees = 0;
    let totalBookings = 0;
    let avgRating = "0.0";

    if (dashRes.status === "fulfilled" && dashRes.value.ok) {
      const dashJson = await dashRes.value.json();
      const d = dashJson.data || dashJson;
      if (d) {
        totalTrips = Number(d.totalTrips ?? d.todayTrips ?? 0);
        totalSpent = Number(d.monthlySpend ?? d.totalSpend ?? 0);
        activeEmployees = Number(d.activeEmployees ?? d.totalEmployees ?? 0);
        totalBookings = Number(d.totalBookings ?? 0);
        if (d.averageRating !== undefined) avgRating = Number(d.averageRating).toFixed(1);
      }
    }

    if (empRes.status === "fulfilled" && empRes.value.ok) {
      const empJson = await empRes.value.json();
      if (Array.isArray(empJson.data)) {
        activeEmployees = empJson.data.filter(
          (e) => String(e.status || "ACTIVE").toLowerCase() !== "inactive"
        ).length;
      }
    }

    if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
      const bJson = await bookingsRes.value.json();
      const bList = Array.isArray(bJson.data) ? bJson.data : Array.isArray(bJson) ? bJson : [];
      totalBookings = Math.max(totalBookings, bList.length);
    }

    if (historyRes.status === "fulfilled" && historyRes.value.ok) {
      const hJson = await historyRes.value.json();
      const hList = Array.isArray(hJson.data) ? hJson.data : Array.isArray(hJson) ? hJson : [];
      totalTrips = Math.max(totalTrips, hList.length);
      if (totalSpent === 0 && hList.length > 0) {
        totalSpent = hList.reduce((sum, t) => sum + (Number(t.amount || t.fare || 0)), 0);
      }
    }

    state.summary = [
      { icon: "ph-car", iconType: "ph", label: "Total Trips", value: totalTrips.toLocaleString(), deltaHighlight: "0%", deltaText: "vs last period" },
      { icon: "ph-wallet", iconType: "ph", label: "Total Spent", value: `₦${totalSpent.toLocaleString()}`, deltaHighlight: "0%", deltaText: "vs last period" },
      { icon: "ph-users", iconType: "ph-fill", label: "Active Employees", value: activeEmployees.toLocaleString(), deltaHighlight: "0%", deltaText: "vs last period" },
      { icon: "ph-file-text", iconType: "ph", label: "Total Bookings", value: totalBookings.toLocaleString(), deltaHighlight: "0%", deltaText: "vs last period" },
      { icon: "ph-star", iconType: "ph-fill", label: "Average Rating", value: avgRating, deltaHighlight: "0%", deltaText: "vs last period" },
    ];
    renderSummary(state);
  } catch (err) {
    console.error("Failed to fetch reports summary:", err);
  }
}

if (requireAuth()) {
  hydrateUserHeader();
  renderReportTypeCards(REPORT_TYPES);
  renderRecentReports(state.recentReports);
  renderSummary(state);
  setupGenerateReport();
  setupSidebarNav();
  setupMiscControls();
  fetchReportsData();
}
