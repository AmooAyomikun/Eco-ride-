(function () {
  const DEFAULT_AVATAR = "Assets/Admin.jpg";

  function getAvatarStorageKey() {
    try {
      const raw = localStorage.getItem("ecoride_user");
      if (raw) {
        const user = JSON.parse(raw);
        const id = user.id || user.email;
        if (id) return `ecoride_avatar_${id}`;
      }
    } catch (e) {}
    return "ecoride_avatar";
  }

  function getSavedAvatar() {
    try {
      const custom = localStorage.getItem(getAvatarStorageKey());
      if (custom) return custom;
      const raw = localStorage.getItem("ecoride_user");
      if (raw) {
        const user = JSON.parse(raw);
        return user.avatar || user.profilePicture || user.profileImage || user.logo || DEFAULT_AVATAR;
      }
    } catch (e) {}
    return DEFAULT_AVATAR;
  }

  function applyAvatarToHeader(src) {
    document.querySelectorAll(".admin-profile .avatar").forEach((img) => {
      img.onerror = () => {
        if (!img.src.endsWith(DEFAULT_AVATAR)) img.src = DEFAULT_AVATAR;
      };
      img.src = src || DEFAULT_AVATAR;
    });
  }

  function resizeImageToDataUrl(file, maxSize, callback) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxSize) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          }
        } else if (h > maxSize) {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function initProfileMenu() {
    const profileEl = document.querySelector(".admin-profile");
    if (!profileEl) return;

    applyAvatarToHeader(getSavedAvatar());
    profileEl.style.cursor = "pointer";
    profileEl.style.position = "relative";

    const menu = document.createElement("div");
    menu.className = "profile-dropdown-menu";
    menu.style.cssText = [
      "position:absolute",
      "top:calc(100% + 8px)",
      "right:0",
      "min-width:190px",
      "background:#ffffff",
      "border:1px solid #e5e7eb",
      "border-radius:10px",
      "box-shadow:0 12px 28px rgba(0,0,0,0.12)",
      "padding:6px",
      "display:none",
      "flex-direction:column",
      "gap:2px",
      "z-index:150",
    ].join(";");

    const makeItem = (label, iconClass, onClick, isDanger = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:8px",
        "width:100%",
        "padding:8px 10px",
        "border:none",
        "background:transparent",
        "border-radius:7px",
        "font-size:12.5px",
        "font-family:inherit",
        `color:${isDanger ? "#dc2626" : "#112028"}`,
        "cursor:pointer",
        "text-align:left",
      ].join(";");
      btn.innerHTML = `<i class="ph ${iconClass}"></i><span>${label}</span>`;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = isDanger ? "#fef2f2" : "#f3f7f4";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "transparent";
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.style.display = "none";
        onClick();
      });
      return btn;
    };

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file (PNG, JPG, or WEBP).");
        fileInput.value = "";
        return;
      }
      resizeImageToDataUrl(file, 200, (dataUrl) => {
        try {
          localStorage.setItem(getAvatarStorageKey(), dataUrl);
          applyAvatarToHeader(dataUrl);
        } catch (err) {
          console.error("Failed to save avatar:", err);
          alert("Image is too large to save locally. Please choose a smaller photo.");
        }
      });
      fileInput.value = "";
    });

    menu.appendChild(makeItem("Change Profile Photo", "ph-camera", () => fileInput.click()));
    menu.appendChild(
      makeItem("Reset Default Photo", "ph-arrow-counter-clockwise", () => {
        localStorage.removeItem(getAvatarStorageKey());
        applyAvatarToHeader(getSavedAvatar());
      })
    );
    menu.appendChild(
      makeItem("Company Settings", "ph-gear", () => {
        window.location.href = "CompanySettings.html";
      })
    );
    menu.appendChild(
      makeItem(
        "Logout",
        "ph-sign-out",
        () => {
          localStorage.removeItem("ecoride_token");
          localStorage.removeItem("ecoride_user");
          window.location.href = "Login.html";
        },
        true
      )
    );

    profileEl.appendChild(menu);

    profileEl.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    });

    document.addEventListener("click", (e) => {
      if (!profileEl.contains(e.target)) {
        menu.style.display = "none";
      }
    });
  }

  function initNotificationsBell() {
    const bellBtn = document.getElementById("notif-btn") || document.querySelector('.icon-btn[aria-label="Notifications"]');
    const token = localStorage.getItem("ecoride_token");
    if (!bellBtn || !token) return;

    const API_BASE = window.location.hostname.endsWith("vercel.app")
      ? "/api/v1"
      : "https://ecoride-backend-0ll4.onrender.com/api/v1";

    bellBtn.style.position = "relative";
    const dot = document.createElement("span");
    dot.style.cssText = "position:absolute;top:7px;right:7px;width:8px;height:8px;border-radius:50%;background:#ef4444;display:none;";
    bellBtn.appendChild(dot);

    const panel = document.createElement("div");
    panel.style.cssText = [
      "position:absolute",
      "top:calc(100% + 8px)",
      "right:0",
      "width:290px",
      "max-height:360px",
      "overflow-y:auto",
      "background:#ffffff",
      "border:1px solid #e5e7eb",
      "border-radius:12px",
      "box-shadow:0 14px 32px rgba(0,0,0,0.14)",
      "padding:10px",
      "display:none",
      "flex-direction:column",
      "gap:8px",
      "z-index:160",
      "text-align:left",
    ].join(";");
    bellBtn.appendChild(panel);

    let notifications = [];

    const renderPanel = () => {
      const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;
      dot.style.display = unreadCount > 0 ? "block" : "none";

      const headerHtml = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:1px solid #f3f4f6;">
          <strong style="font-size:13px;color:#112028;">Notifications${unreadCount ? ` (${unreadCount})` : ""}</strong>
          ${notifications.length ? `<button type="button" id="notif-read-all-btn" style="background:none;border:none;color:#2c8c3e;font-size:11.5px;font-weight:600;cursor:pointer;">Mark all read</button>` : ""}
        </div>
      `;

      const listHtml = notifications.length === 0
        ? `<div style="padding:18px 8px;text-align:center;color:#6b7280;font-size:12px;">No notifications yet.</div>`
        : notifications.map((n) => {
            const isRead = Boolean(n.isRead || n.read);
            return `
              <div data-notif-id="${n.id}" style="padding:8px;border-radius:8px;background:${isRead ? "#ffffff" : "#f0fdf4"};border:1px solid #f3f4f6;display:flex;justify-content:space-between;gap:8px;align-items:flex-start;cursor:pointer;">
                <div style="min-width:0;">
                  <div style="font-size:12px;font-weight:${isRead ? "500" : "700"};color:#112028;">${n.title || "Notification"}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">${n.message || n.body || ""}</div>
                </div>
                <button type="button" data-delete-notif="${n.id}" title="Delete" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:13px;padding:2px;"><i class="ph ph-x"></i></button>
              </div>
            `;
          }).join("");

      panel.innerHTML = headerHtml + listHtml;

      const readAllBtn = panel.querySelector("#notif-read-all-btn");
      if (readAllBtn) {
        readAllBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await fetch(`${API_BASE}/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          notifications = notifications.map((n) => ({ ...n, isRead: true, read: true }));
          renderPanel();
        });
      }

      panel.querySelectorAll("[data-notif-id]").forEach((row) => {
        row.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (e.target.closest("[data-delete-notif]")) return;
          const id = row.dataset.notifId;
          await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n));
          renderPanel();
        });
      });

      panel.querySelectorAll("[data-delete-notif]").forEach((delBtn) => {
        delBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = delBtn.dataset.deleteNotif;
          await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          notifications = notifications.filter((n) => n.id !== id);
          renderPanel();
        });
      });
    };

    const loadNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        notifications = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        renderPanel();
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.style.display = panel.style.display === "flex" ? "none" : "flex";
    });
    document.addEventListener("click", (e) => {
      if (!bellBtn.contains(e.target)) panel.style.display = "none";
    });

    loadNotifications();
  }

  function initAll() {
    initProfileMenu();
    initNotificationsBell();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

