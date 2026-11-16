const MOCK_VERIFICATION_STATUS = "PENDING";

const MOCK_DOCUMENTS = [
  { key: "cacCertificate", name: "CAC Certificate", sub: "Not uploaded yet" },
  { key: "taxCertificate", name: "Tax Certificate", sub: "Not uploaded yet" },
  { key: "businessLicense", name: "Business License", sub: "Uploaded — pending review" },
];

const MOCK_NOTIFICATIONS = [
  { key: "ride-requests", title: "New Ride Requests", sub: "Get notified when employees request rides", on: true },
  { key: "low-balance", title: "Low Wallet Balance", sub: "Alert when wallet balance falls below threshold", on: true },
  { key: "weekly-report", title: "Weekly Summary Report", sub: "Receive a weekly activity digest by email", on: false },
  { key: "employee-invites", title: "Employee Invite Status", sub: "Notify when an invited employee joins", on: true },
];

const MOCK_ADMINS = [
  { name: "Tunde Adewale", email: "tunde@acme.com", role: "Super Admin" },
  { name: "Grace Eze", email: "grace@acme.com", role: "Admin" },
];

function renderVerificationBanner(status) {
  const banner = document.getElementById("verification-banner");
  const isApproved = status === "APPROVED";
  banner.className = `settings-verification-banner ${isApproved ? "approved" : ""}`;
  banner.innerHTML = isApproved
    ? `<i class="ph-fill ph-check-circle"></i> Your company profile is verified.`
    : `<i class="ph-fill ph-clock"></i> Your company profile is pending verification. Some features may be limited until approved.`;
}

function setupTabs() {
  const tabs = document.querySelectorAll(".settings-tab");
  const panels = {
    profile: document.getElementById("tab-profile"),
    documents: document.getElementById("tab-documents"),
    notifications: document.getElementById("tab-notifications"),
    team: document.getElementById("tab-team"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      Object.entries(panels).forEach(([key, el]) => {
        el.style.display = key === tab.dataset.tab ? "block" : "none";
      });
    });
  });
}

function setupProfileSave() {
  document.getElementById("save-profile-btn").addEventListener("click", () => {
    alert("Company profile changes saved.");
  });
}

function renderDocuments(docs) {
  const container = document.getElementById("doc-rows");
  container.innerHTML = docs.map((d) => `
    <div class="doc-row">
      <div class="doc-row-left">
        <span class="doc-icon"><i class="ph-fill ph-file-text"></i></span>
        <div>
          <div class="doc-name">${d.name}</div>
          <div class="doc-sub">${d.sub}</div>
        </div>
      </div>
      <button class="doc-upload-btn" data-key="${d.key}">Upload</button>
    </div>
  `).join("");

  container.querySelectorAll(".doc-upload-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert("Document upload is coming soon.");
    });
  });
}

function renderNotificationToggles(prefs) {
  const container = document.getElementById("toggle-rows");
  container.innerHTML = prefs.map((p) => `
    <div class="toggle-row">
      <div>
        <div class="toggle-row-title">${p.title}</div>
        <div class="toggle-row-sub">${p.sub}</div>
      </div>
      <button class="toggle-switch ${p.on ? "on" : ""}" data-key="${p.key}" aria-label="Toggle ${p.title}"></button>
    </div>
  `).join("");

  container.querySelectorAll(".toggle-switch").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("on");
    });
  });
}

function setupNotificationsSave() {
  document.getElementById("save-notifications-btn").addEventListener("click", () => {
    alert("Notification preferences saved.");
  });
}

function renderAdmins(admins) {
  const tbody = document.getElementById("admins-table-body");
  tbody.innerHTML = admins.map((a) => `
    <tr>
      <td>${a.name}</td>
      <td class="emp-email">${a.email}</td>
      <td><span class="role-badge ${a.role === "Super Admin" ? "admin" : ""}">${a.role}</span></td>
      <td><button class="row-actions-btn"><span class="dots-outline"><span></span><span></span><span></span></span></button></td>
    </tr>
  `).join("");
}

function setupInviteAdmin() {
  document.getElementById("invite-admin-btn").addEventListener("click", () => {
    alert("Invite Admin is coming soon.");
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
    window.location.href = "Login.html";
  });
}

renderVerificationBanner(MOCK_VERIFICATION_STATUS);
renderDocuments(MOCK_DOCUMENTS);
renderNotificationToggles(MOCK_NOTIFICATIONS);
renderAdmins(MOCK_ADMINS);
setupTabs();
setupProfileSave();
setupNotificationsSave();
setupInviteAdmin();
setupSidebarNav();
setupMiscControls();
