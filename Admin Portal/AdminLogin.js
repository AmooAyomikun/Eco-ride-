const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

const form = document.querySelector(".login-container form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const showPasswordIcon = document.getElementById("show-password");
const googleButton = document.querySelector(".click");
const forgotLink = document.querySelector(".options a");

const errorBox = document.createElement("p");
errorBox.style.color = "#dc2626";
errorBox.style.fontSize = "13px";
errorBox.style.marginTop = "8px";
errorBox.style.textAlign = "center";
form.appendChild(errorBox);

if (showPasswordIcon && passwordInput) {
  showPasswordIcon.style.cursor = "pointer";
  showPasswordIcon.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    showPasswordIcon.classList.toggle("ph-eye", !isPassword);
    showPasswordIcon.classList.toggle("ph-eye-slash", isPassword);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorBox.textContent = "Please enter your email and password.";
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : "Sign In";
  if (submitBtn) {
    submitBtn.textContent = "Signing in...";
    submitBtn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier: email, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.message || data.error || "Invalid email or password.";
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
      return;
    }

    if (data.token) {
      localStorage.setItem("ecoride_admin_token", data.token);
    }
    if (data.user) {
      localStorage.setItem("ecoride_admin_user", JSON.stringify(data.user));
    }

    window.location.href = "index.html";
  } catch (err) {
    console.error("Admin login error:", err);
    errorBox.textContent = "Something went wrong. Check your connection and try again.";
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
});

if (googleButton) {
  googleButton.addEventListener("click", (e) => {
    e.preventDefault();
    errorBox.textContent = "Google sign-in is not yet enabled on the backend. Please sign in with your admin email and password.";
  });
}

if (forgotLink) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    errorBox.textContent = "Contact your Super Admin or backend administrator to reset your admin password.";
  });
}

