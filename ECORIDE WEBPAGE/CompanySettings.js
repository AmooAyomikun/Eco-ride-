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
      const nameInput = document.getElementById("settings-company-name");
      if (nameInput && user.companyName) nameInput.value = user.companyName;
      const rcInput = document.getElementById("settings-rc-number");
      if (rcInput && user.rcNumber) rcInput.value = user.rcNumber;
      const emailInput = document.getElementById("settings-company-email");
      if (emailInput && user.email) emailInput.value = user.email;
    }
  } catch (err) {
    console.error("Error reading stored user:", err);
  }
}

const DEFAULT_DOCUMENTS = [
  { key: "cacCertificate", name: "CAC Certificate", sub: "Not uploaded yet" },
  { key: "taxCertificate", name: "Tax Certificate", sub: "Not uploaded yet" },
  { key: "businessLicense", name: "Business License", sub: "Not uploaded yet" },
];

const MOCK_NOTIFICATIONS = [
  { key: "ride-requests", title: "New Ride Requests", sub: "Get notified when employees request rides", on: true },
  { key: "low-balance", title: "Low Wallet Balance", sub: "Alert when wallet balance falls below threshold", on: true },
  { key: "weekly-report", title: "Weekly Summary Report", sub: "Receive a weekly activity digest by email", on: false },
  { key: "employee-invites", title: "Employee Invite Status", sub: "Notify when an invited employee joins", on: true },
];

function renderVerificationBanner(status) {
  const banner = document.getElementById("verification-banner");
  const isApproved = String(status || "").toUpperCase() === "APPROVED";
  banner.className = `settings-verification-banner ${isApproved ? "approved" : ""}`;
  banner.innerHTML = isApproved
    ? `<i class="ph-fill ph-check-circle"></i> Your company profile is verified.`
    : `<i class="ph-fill ph-clock"></i> Your company profile is pending verification. Upload your corporate documents below.`;
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
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".pdf,.png,.jpg,.jpeg";
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;
        btn.textContent = "Uploading...";
        btn.disabled = true;
        try {
          const data = await uploadCorporateDocument(btn.dataset.key, file);
          alert(data.message || `${file.name} uploaded successfully.`);
          await fetchCorporateDocuments();
        } catch (err) {
          console.error("Error uploading document:", err);
          alert("Error uploading document. Please make sure you are logged in.");
        } finally {
          btn.textContent = "Upload";
          btn.disabled = false;
        }
      });
      fileInput.click();
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

function loadNotificationPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem("ecoride_notif_prefs") || "null");
    if (saved && typeof saved === "object") {
      return MOCK_NOTIFICATIONS.map((p) => ({
        ...p,
        on: saved[p.key] !== undefined ? Boolean(saved[p.key]) : p.on,
      }));
    }
  } catch (e) {}
  return MOCK_NOTIFICATIONS;
}

function setupNotificationsSave() {
  document.getElementById("save-notifications-btn").addEventListener("click", () => {
    const prefs = {};
    document.querySelectorAll("#toggle-rows .toggle-switch").forEach((btn) => {
      prefs[btn.dataset.key] = btn.classList.contains("on");
    });
    localStorage.setItem("ecoride_notif_prefs", JSON.stringify(prefs));
    alert("Notification preferences saved.");
  });
}

function renderAdmins() {
  const tbody = document.getElementById("admins-table-body");
  let adminName = "Corporate Admin";
  let adminEmail = "—";
  try {
    const user = JSON.parse(localStorage.getItem("ecoride_user") || "{}");
    if (user.companyName || user.fullName) adminName = user.companyName || user.fullName;
    if (user.email) adminEmail = user.email;
  } catch (e) {}

  tbody.innerHTML = `
    <tr>
      <td>${adminName}</td>
      <td class="emp-email">${adminEmail}</td>
      <td><span class="role-badge admin">CORPORATE_ADMIN</span></td>
      <td><button class="row-actions-btn"><span class="dots-outline"><span></span><span></span><span></span></span></button></td>
    </tr>
  `;
}

function setupInviteAdmin() {
  document.getElementById("invite-admin-btn").addEventListener("click", () => {
    alert("Multi-admin invitations require backend role-invite endpoint activation.");
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

  const changePwdBtn = document.getElementById("change-password-btn");
  if (changePwdBtn) {
    changePwdBtn.addEventListener("click", async () => {
      const currentPassword = document.getElementById("current-password-input").value;
      const newPassword = document.getElementById("new-password-input").value;
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        alert("Please enter your current password and a new password (at least 8 characters).");
        return;
      }
      changePwdBtn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
          method: "PATCH",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || data.error || "Could not update password.");
          return;
        }
        document.getElementById("current-password-input").value = "";
        document.getElementById("new-password-input").value = "";
        alert(data.message || "Password updated successfully.");
      } catch (err) {
        console.error("Change password error:", err);
        alert("Network error while changing password.");
      } finally {
        changePwdBtn.disabled = false;
      }
    });
  }
}

// GET /corporate/profile
async function fetchCorporateProfile() {
  try {
    const res = await fetch(`${API_BASE}/corporate/profile`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const result = await res.json();
    const p = result.data || result;

    if (res.ok && p) {
      if (p.companyName) {
        document.getElementById("settings-company-name").value = p.companyName;
        document.querySelectorAll(".company-name, .admin-name").forEach((el) => {
          el.textContent = p.companyName;
        });
      }
      if (p.rcNumber) document.getElementById("settings-rc-number").value = p.rcNumber;
      if (p.companyPhone) document.getElementById("settings-company-phone").value = p.companyPhone;
      if (p.companyAddress) document.getElementById("settings-company-address").value = p.companyAddress;
      if (p.industry) document.getElementById("settings-industry").value = p.industry;
    }
  } catch (err) {
    console.error("Failed to load corporate profile:", err);
  }
}

// PATCH /corporate/profile (with POST /corporate/profile fallback)
function setupProfileSave() {
  document.getElementById("save-profile-btn").addEventListener("click", async () => {
    const payload = {
      companyName: document.getElementById("settings-company-name").value.trim(),
      rcNumber: document.getElementById("settings-rc-number").value.trim(),
      companyAddress: document.getElementById("settings-company-address").value.trim(),
      companyPhone: document.getElementById("settings-company-phone").value.trim(),
      industry: document.getElementById("settings-industry").value,
    };

    try {
      let res = await fetch(`${API_BASE}/corporate/profile`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          companyAddress: payload.companyAddress,
          companyPhone: payload.companyPhone,
          industry: payload.industry,
        }),
      });

      if (res.status === 404 || res.status === 400) {
        res = await fetch(`${API_BASE}/corporate/profile`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || data.error || "Could not update company profile.");
        return;
      }
      alert(data.message || "Company profile updated on backend.");
      fetchCorporateProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile. Please check your login session.");
    }
  });
}

let hasExistingDocuments = false;

// GET /corporate/documents
async function fetchCorporateDocuments() {
  try {
    const res = await fetch(`${API_BASE}/corporate/documents`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const result = await res.json();
    const d = result.data || result;

    if (res.ok && d && (d.id || d.verificationStatus || d.cacCertificate || d.taxCertificate || d.businessLicense)) {
      hasExistingDocuments = true;
      renderVerificationBanner(d.verificationStatus || "PENDING");
      const updatedDocs = DEFAULT_DOCUMENTS.map((doc) => ({
        ...doc,
        sub: d[doc.key] ? "Uploaded — pending review" : "Not uploaded yet",
      }));
      renderDocuments(updatedDocs);
    }
  } catch (err) {
    console.error("Failed to load corporate documents:", err);
  }
}

// POST or PATCH /corporate/documents (multipart/form-data)
async function uploadCorporateDocument(fieldKey, file) {
  const formData = new FormData();
  formData.append(fieldKey, file);

  const method = hasExistingDocuments ? "PATCH" : "POST";

  const res = await fetch(`${API_BASE}/corporate/documents`, {
    method,
    headers: getAuthHeaders(),
    credentials: "include",
    body: formData,
  });

  return res.json();
}

if (requireAuth()) {
  hydrateUserHeader();
  renderVerificationBanner("PENDING");
  renderDocuments(DEFAULT_DOCUMENTS);
  renderNotificationToggles(loadNotificationPrefs());
  renderAdmins();
  setupTabs();
  setupProfileSave();
  setupNotificationsSave();
  setupInviteAdmin();
  setupSidebarNav();
  setupMiscControls();
  fetchCorporateProfile();
  fetchCorporateDocuments();
}
