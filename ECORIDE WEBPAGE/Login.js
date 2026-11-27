const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

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
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier: email, email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      errorBox.textContent = data.message || "Login failed. Please check your details and try again.";
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
      return;
    }

    if (data.token) {
      localStorage.setItem("ecoride_token", data.token);
    }
    if (data.user) {
      localStorage.setItem("ecoride_user", JSON.stringify(data.user));
    }

    let nextUrl = "CorporateDashboard.html";
    if (data.token) {
      try {
        const statusRes = await fetch(`${API_BASE}/auth/onboarding-status`, {
          method: "GET",
          headers: { Authorization: `Bearer ${data.token}` },
          credentials: "include",
        });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          const step = statusJson.nextStep || statusJson.data?.nextStep;
          if (step === "VERIFY_EMAIL") {
            localStorage.setItem("pendingEmail", email);
            nextUrl = "EmailVerification.html";
          } else if (step === "COMPLETE_PROFILE") {
            nextUrl = "CompanySettings.html";
          }
        }
      } catch (err) {
        console.error("Onboarding status check failed:", err);
      }
    }

    window.location.href = nextUrl;
  } catch (err) {
    console.error("Login error:", err);
    errorBox.textContent = "Something went wrong. Check your connection and try again.";
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
});

googleButton.addEventListener("click", (e) => {
  e.preventDefault();
  errorBox.textContent = "Google sign-in is not yet enabled on the backend. Please sign in with your email and password.";
});
