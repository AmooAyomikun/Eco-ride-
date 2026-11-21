(function () {
  const token = localStorage.getItem("ecoride_admin_token");
  if (!token) {
    window.location.replace("AdminLogin.html");
    return;
  }

  function setupResponsiveShell() {
    const sidebar = document.querySelector(".sidebar");
    const topTab = document.querySelector(".top-tab") || document.querySelector(".top-header") || document.querySelector("main > header");

    if (sidebar && topTab && !document.getElementById("admin-menu-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "admin-menu-btn";
      btn.className = "admin-menu-btn";
      btn.setAttribute("aria-label", "Toggle navigation");
      btn.innerHTML = '<i class="ph ph-list"></i>';
      topTab.insertBefore(btn, topTab.firstChild);

      const backdrop = document.createElement("div");
      backdrop.className = "admin-sidebar-backdrop";
      document.body.appendChild(backdrop);

      const closeSidebar = () => {
        sidebar.classList.remove("open");
        backdrop.classList.remove("active");
      };

      if (!document.getElementById("admin-sidebar-close")) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.id = "admin-sidebar-close";
        closeBtn.className = "admin-sidebar-close";
        closeBtn.setAttribute("aria-label", "Close navigation");
        closeBtn.innerHTML = '<i class="ph ph-x"></i>';
        closeBtn.addEventListener("click", closeSidebar);
        sidebar.insertBefore(closeBtn, sidebar.firstChild);
      }

      btn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        backdrop.classList.toggle("active");
      });

      backdrop.addEventListener("click", closeSidebar);

      sidebar.querySelectorAll(".nav-menu a").forEach((link) => {
        link.addEventListener("click", closeSidebar);
      });
    }
  }

  function hydrateAdminHeader() {
    try {
      const raw = localStorage.getItem("ecoride_admin_user");
      if (raw) {
        const user = JSON.parse(raw);
        const name = user.fullName || user.name || user.email;
        const role = user.role || "Super Admin";
        if (name) {
          document.querySelectorAll(".user-profile .user-name").forEach((el) => {
            el.textContent = name;
          });
        }
        document.querySelectorAll(".user-profile .user-role").forEach((el) => {
          el.textContent = role;
        });
      }
    } catch (e) {}

    document.querySelectorAll('.logout-btn a, #logout-link, a[href="AdminLogin.html"]').forEach((link) => {
      link.addEventListener("click", () => {
        localStorage.removeItem("ecoride_admin_token");
        localStorage.removeItem("ecoride_admin_user");
      });
    });

    setupResponsiveShell();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAdminHeader);
  } else {
    hydrateAdminHeader();
  }
})();
