(function () {
  const token = localStorage.getItem("ecoride_admin_token");
  if (!token) {
    window.location.replace("AdminLogin.html");
    return;
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

    document.querySelectorAll('.logout-btn a, #logout-link').forEach((link) => {
      link.addEventListener("click", () => {
        localStorage.removeItem("ecoride_admin_token");
        localStorage.removeItem("ecoride_admin_user");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAdminHeader);
  } else {
    hydrateAdminHeader();
  }
})();

