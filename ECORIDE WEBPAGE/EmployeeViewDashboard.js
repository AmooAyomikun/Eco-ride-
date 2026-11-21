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

const PAGE_SIZE = 7;
const DEPARTMENTS = ["Marketing", "Operations", "Finance", "Sales", "HR", "Support"];

const state = {
  employees: [],
  filtered: [],
  currentPage: 1,
  searchTerm: "",
  departmentFilter: "All",
  statusFilter: "All",
};

function normalizeEmployee(emp, idx) {
  const fullName = emp.name || emp.fullName || emp.user?.fullName || `${emp.user?.firstName || "Employee"} ${emp.user?.lastName || idx + 1}`.trim();
  const email = emp.email || emp.user?.email || "—";
  const statusRaw = String(emp.status || "ACTIVE").toLowerCase();
  const joinedDate = emp.joined || (emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—");

  return {
    id: emp.id || emp.employeeId || `EMP-${idx + 1}`,
    name: fullName,
    department: emp.department || "Operations",
    email,
    status: statusRaw === "inactive" ? "inactive" : "active",
    joined: joinedDate,
  };
}

// GET /corporate/employees
async function fetchEmployees() {
  try {
    const res = await fetch(`${API_BASE}/corporate/employees`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const result = await res.json();
    const list = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.employees)
      ? result.employees
      : Array.isArray(result)
      ? result
      : [];

    if (res.ok) {
      state.employees = list.map(normalizeEmployee);
      applyFilters();
    }
  } catch (err) {
    console.error("Error fetching employees:", err);
  }
}

// POST /corporate/employees
async function createEmployee(payload) {
  const res = await fetch(`${API_BASE}/corporate/employees`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Could not add employee.");
  }
  return data;
}

// PATCH /corporate/employees/:id
async function updateEmployee(employeeId, updates) {
  const res = await fetch(`${API_BASE}/corporate/employees/${encodeURIComponent(employeeId)}`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Could not update employee.");
  }
  return data;
}

// DELETE /corporate/employees/:id
async function deleteEmployee(employeeId) {
  const res = await fetch(`${API_BASE}/corporate/employees/${encodeURIComponent(employeeId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Could not remove employee.");
  }
  return data;
}

function applyFilters() {
  state.filtered = state.employees.filter((emp) => {
    const matchesSearch =
      state.searchTerm === "" ||
      emp.name.toLowerCase().includes(state.searchTerm) ||
      emp.email.toLowerCase().includes(state.searchTerm) ||
      emp.department.toLowerCase().includes(state.searchTerm);
    const matchesDept = state.departmentFilter === "All" || emp.department === state.departmentFilter;
    const matchesStatus = state.statusFilter === "All" || emp.status === state.statusFilter.toLowerCase();
    return matchesSearch && matchesDept && matchesStatus;
  });
  state.currentPage = 1;
  renderTable();
}

function getPageItems() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  return state.filtered.slice(start, start + PAGE_SIZE);
}

function renderTable() {
  const tbody = document.getElementById("employees-table-body");
  const pageItems = getPageItems();

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="ph ph-users"></i><p>No employees found in your corporate account yet. Click "Add Employee" to attach a team member.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((emp) => `
      <tr data-id="${emp.id}">
        <td>
          <div class="emp-name-cell">
            <img src="Assets/Driver.jpg" alt="${emp.name}">
            <span>${emp.name}</span>
          </div>
        </td>
        <td class="emp-dept">${emp.department}</td>
        <td class="emp-email">${emp.email}</td>
        <td><span class="status-badge ${emp.status}">${emp.status === "active" ? "Active" : "Inactive"}</span></td>
        <td class="emp-joined">${emp.joined}</td>
        <td>
          <button class="row-actions-btn" data-id="${emp.id}" aria-label="Row actions">
            <span class="dots-outline"><span></span><span></span><span></span></span>
          </button>
        </td>
      </tr>
    `).join("");
  }

  tbody.querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".row-actions-btn")) return;
      window.location.href = `EmployeeDetail.html?id=${encodeURIComponent(row.dataset.id)}`;
    });
  });

  tbody.querySelectorAll(".row-actions-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRowMenu(e.currentTarget, btn.dataset.id);
    });
  });

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("employees-pagination");
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(state.currentPage * PAGE_SIZE, total);

  const pageButtons = [];
  const maxVisible = 3;
  let startPage = Math.max(1, state.currentPage - 1);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    pageButtons.push(p);
  }

  container.innerHTML = `
    <span>Showing ${start} to ${end} of ${total} employees</span>
    <div class="pagination-controls">
      <button class="page-btn" id="prev-page" ${state.currentPage === 1 ? "disabled" : ""}><i class="ph ph-caret-left"></i></button>
      ${startPage > 1 ? `<button class="page-btn" data-page="1">1</button>${startPage > 2 ? `<span class="page-ellipsis">•••</span>` : ""}` : ""}
      ${pageButtons.map((p) => `<button class="page-btn ${p === state.currentPage ? "active" : ""}" data-page="${p}">${p}</button>`).join("")}
      ${endPage < totalPages ? `${endPage < totalPages - 1 ? `<span class="page-ellipsis">•••</span>` : ""}<button class="page-btn" data-page="${totalPages}">${totalPages}</button>` : ""}
      <button class="page-btn" id="next-page" ${state.currentPage === totalPages ? "disabled" : ""}><i class="ph ph-caret-right"></i></button>
    </div>
  `;

  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentPage = Number(btn.dataset.page);
      renderTable();
    });
  });

  document.getElementById("prev-page").addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTable();
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTable();
    }
  });
}

function openRowMenu(anchorEl, employeeId) {
  const menu = document.getElementById("row-menu");
  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX - 115}px`;
  menu.classList.add("open");
  menu.dataset.employeeId = employeeId;
}

function closeRowMenu() {
  document.getElementById("row-menu").classList.remove("open");
}

function setupRowMenuActions() {
  const menu = document.getElementById("row-menu");
  menu.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const employeeId = menu.dataset.employeeId;
      const action = btn.dataset.action;
      closeRowMenu();

      if (action === "view") {
        window.location.href = `EmployeeDetail.html?id=${encodeURIComponent(employeeId)}`;
      } else if (action === "edit") {
        const emp = state.employees.find((e) => e.id === employeeId);
        if (emp) openEmployeeModal("edit", emp);
      } else if (action === "deactivate") {
        const emp = state.employees.find((e) => e.id === employeeId);
        if (emp && confirm(`Deactivate ${emp.name}?`)) {
          try {
            await updateEmployee(employeeId, { status: "INACTIVE" });
            fetchEmployees();
          } catch (err) {
            console.error("Error deactivating employee:", err);
            alert(err.message || "Could not deactivate employee.");
          }
        }
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !e.target.closest(".row-actions-btn")) {
      closeRowMenu();
    }
  });
}

function setupFilterDropdown(containerId, options, onSelect) {
  const container = document.getElementById(containerId);
  const btn = container.querySelector(".filter-btn");

  const menu = document.createElement("div");
  menu.className = "filter-menu";
  menu.innerHTML = options.map((opt) => `<button data-value="${opt}" class="${opt === "All" ? "selected" : ""}">${opt}</button>`).join("");
  container.appendChild(menu);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".filter-dropdown.open").forEach((el) => {
      if (el !== container) el.classList.remove("open");
    });
    container.classList.toggle("open");
  });

  menu.querySelectorAll("button").forEach((optBtn) => {
    optBtn.addEventListener("click", () => {
      menu.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      optBtn.classList.add("selected");
      container.classList.remove("open");
      onSelect(optBtn.dataset.value);
    });
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) container.classList.remove("open");
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll(".emp-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isAll = tab.dataset.tab === "all";
      document.getElementById("all-employees-view").style.display = isAll ? "block" : "none";
      document.getElementById("invitations-view").style.display = isAll ? "none" : "block";
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

let modalMode = "add";
let editingEmployeeId = null;

function openEmployeeModal(mode, emp = null) {
  modalMode = mode;
  editingEmployeeId = emp ? emp.id : null;

  const overlay = document.getElementById("employee-modal-overlay");
  const titleEl = document.getElementById("employee-modal-title");
  const userIdField = document.getElementById("emp-userid-field");
  const userIdInput = document.getElementById("emp-modal-userid");
  const codeField = document.getElementById("emp-code-field");
  const deptSelect = document.getElementById("emp-modal-department");
  const posInput = document.getElementById("emp-modal-position");
  const codeInput = document.getElementById("emp-modal-code");
  const submitBtn = document.getElementById("employee-modal-submit");

  if (mode === "edit" && emp) {
    titleEl.textContent = `Edit ${emp.name}`;
    userIdField.style.display = "none";
    userIdInput.required = false;
    codeField.style.display = "none";
    deptSelect.value = DEPARTMENTS.includes(emp.department) ? emp.department : "Operations";
    posInput.value = emp.position || "Staff";
    submitBtn.textContent = "Save Changes";
  } else {
    titleEl.textContent = "Add Employee";
    userIdField.style.display = "block";
    userIdInput.required = true;
    userIdInput.value = "";
    codeField.style.display = "block";
    codeInput.value = "";
    deptSelect.value = "Operations";
    posInput.value = "";
    submitBtn.textContent = "Add Employee";
  }

  overlay.classList.add("open");
}

function setupEmployeeModal() {
  const overlay = document.getElementById("employee-modal-overlay");
  const closeBtn = document.getElementById("employee-modal-close");
  const cancelBtn = document.getElementById("employee-modal-cancel");
  const form = document.getElementById("employee-modal-form");

  const closeModal = () => overlay.classList.remove("open");
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const department = document.getElementById("emp-modal-department").value;
    const position = document.getElementById("emp-modal-position").value.trim() || "Staff";
    const submitBtn = document.getElementById("employee-modal-submit");
    submitBtn.disabled = true;

    try {
      if (modalMode === "edit" && editingEmployeeId) {
        const res = await updateEmployee(editingEmployeeId, { department, position, status: "ACTIVE" });
        alert(res.message || "Employee updated successfully.");
      } else {
        const userId = document.getElementById("emp-modal-userid").value.trim();
        const employeeId = document.getElementById("emp-modal-code").value.trim() || undefined;
        const res = await createEmployee({ userId, department, position, employeeId });
        alert(res.message || "Employee attached successfully.");
      }
      closeModal();
      fetchEmployees();
    } catch (err) {
      console.error("Employee modal error:", err);
      alert(err.message || "Operation failed. Please check your inputs.");
    } finally {
      submitBtn.disabled = false;
    }
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
  document.getElementById("add-employee-btn").addEventListener("click", () => {
    openEmployeeModal("add");
  });

  const topSearch = document.getElementById("search-input");
  if (topSearch) {
    topSearch.addEventListener("input", (e) => {
      state.searchTerm = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }
}

document.getElementById("employee-search").addEventListener("input", (e) => {
  state.searchTerm = e.target.value.trim().toLowerCase();
  applyFilters();
});

setupFilterDropdown("department-filter", ["All", ...DEPARTMENTS], (value) => {
  state.departmentFilter = value;
  applyFilters();
});
setupFilterDropdown("status-filter", ["All", "Active", "Inactive"], (value) => {
  state.statusFilter = value;
  applyFilters();
});

if (requireAuth()) {
  hydrateUserHeader();
  setupEmployeeModal();
  setupRowMenuActions();
  setupTabs();
  setupSidebarNav();
  setupMiscControls();
  applyFilters();
  fetchEmployees();
}
