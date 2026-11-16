const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? ""
  : "https://ecoride-backend-0ll4.onrender.com";
const FORGOT_PASSWORD_PATH = "/api/v1/auth/forgot-password";

const form = document.getElementById("forgot-password-form");
const statusBox = document.getElementById("status-message");
const resendLink = document.getElementById("resend-reset-link");
const emailInput = document.getElementById("email");

const RESET_COOLDOWN_MS = 30 * 1000;

function getCooldownRemaining(email) {
  const lastSent = Number(localStorage.getItem(`resetLastSent:${email}`)) || 0;
  const elapsed = Date.now() - lastSent;
  return Math.max(0, RESET_COOLDOWN_MS - elapsed);
}

function markResetSent(email) {
  localStorage.setItem(`resetLastSent:${email}`, String(Date.now()));
}

function showStatus(message, isError = true) {
  statusBox.textContent = message;
  statusBox.classList.toggle("status-error", isError);
  statusBox.classList.toggle("status-success", !isError);
}

async function requestReset(email, { isResend = false } = {}) {
  if (!email) {
    showStatus("Please enter your email address.");
    return;
  }

  const remaining = getCooldownRemaining(email);
  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    showStatus(`Please wait ${seconds}s before requesting another link.`);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}${FORGOT_PASSWORD_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showStatus(data.message || "Couldn't send the reset link. Please try again.");
      return;
    }

    markResetSent(email);
    showStatus(
      isResend
        ? "A new reset link has been sent to your email."
        : "If an account exists for that email, a reset link has been sent.",
      false
    );
  } catch (err) {
    console.error("Forgot password error:", err);
    showStatus("Something went wrong. Check your connection and try again.");
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  requestReset(emailInput.value.trim(), { isResend: false });
});

resendLink.addEventListener("click", (e) => {
  e.preventDefault();
  requestReset(emailInput.value.trim(), { isResend: true });
});
