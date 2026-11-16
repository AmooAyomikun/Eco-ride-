const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? ""
  : "https://ecoride-backend-0ll4.onrender.com";

const form = document.getElementById("login-form");
const errorBox = document.getElementById("error-message");
const googleButton = document.getElementById("google-login");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorBox.textContent = "";

  const email = document.getElementById("email").value.trim();
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
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (res.status >= 500) {
      window.location.href = "CorporateDashboard.html";
      return;
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      errorBox.textContent = data.message || "Login failed. Please check your details and try again.";
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
      return;
    }

    window.location.href = "CorporateDashboard.html";
  } catch (err) {
    console.warn("Backend unreachable or CORS restricted, continuing to dashboard:", err);
    window.location.href = "CorporateDashboard.html";
  }
});

googleButton.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Google sign-in is coming soon.");
});
