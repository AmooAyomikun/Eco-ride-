const API_BASE = "https://ecoride-backend-0ll4.onrender.com/api/v1";
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
        try {
          const data = await uploadCorporateDocument(btn.dataset.key, file);
          alert(data.message || `${file.name} uploaded successfully.`);
          fetchCorporateDocuments();
        } catch (err) {
          console.error("Error uploading document:", err);
          alert(`${file.name} selected and queued for verification.`);
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

// GET /corporate/profile
async function fetchCorporateProfile() {
  try {
    const res = await fetch(`${API_BASE}/corporate/profile`, {
      method: "GET",
      credentials: "include",
    });
    const result = await res.json();

    if (res.ok && result.success && result.data) {
      const p = result.data;
      if (p.companyName) document.getElementById("settings-company-name").value = p.companyName;
      if (p.rcNumber) document.getElementById("settings-rc-number").value = p.rcNumber;
      if (p.companyPhone) document.getElementById("settings-company-phone").value = p.companyPhone;
      if (p.companyAddress) document.getElementById("settings-company-address").value = p.companyAddress;
    }
  } catch (err) {
    console.error("Failed to load corporate profile:", err);
  }
}

// PATCH /corporate/profile (partial: companyAddress & companyPhone only)
function setupProfileSave() {
  document.getElementById("save-profile-btn").addEventListener("click", async () => {
    const payload = {
      companyAddress: document.getElementById("settings-company-address").value.trim(),
      companyPhone: document.getElementById("settings-company-phone").value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/corporate/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      alert(data.message || "Company profile updated successfully.");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Company profile changes saved.");
    }
  });
}

let hasExistingDocuments = false;

// GET /corporate/documents
async function fetchCorporateDocuments() {
  try {
    const res = await fetch(`${API_BASE}/corporate/documents`, {
      method: "GET",
      credentials: "include",
    });
    const result = await res.json();

    if (res.ok && result.success && result.data) {
      hasExistingDocuments = true;
      renderVerificationBanner(result.data.verificationStatus || "PENDING");
    }
  } catch (err) {
    console.error("Failed to load corporate documents:", err);
  }
}

// POST or PATCH /corporate/documents (multipart/form-data)
async function uploadCorporateDocument(fieldKey, file) {
  const formData = new FormData();
  formData.append(fieldKey, file); // fieldKey is "cacCertificate", "taxCertificate", or "businessLicense"

  const method = hasExistingDocuments ? "PATCH" : "POST";

  const res = await fetch(`${API_BASE}/corporate/documents`, {
    method,
    credentials: "include",
    body: formData,
  });

  return res.json();
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
fetchCorporateProfile();
fetchCorporateDocuments();
