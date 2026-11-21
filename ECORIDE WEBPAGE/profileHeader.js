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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileMenu);
  } else {
    initProfileMenu();
  }
})();

