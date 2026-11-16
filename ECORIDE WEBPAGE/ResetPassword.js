const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? ""
  : "https://ecoride-backend-0ll4.onrender.com";
const RESET_PASSWORD_PATH = "/api/v1/auth/reset-password";

const form = document.getElementById("reset-password-form");
const statusBox = document.getElementById("status-message");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-new-password");

function getResetToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

const resetToken = getResetToken();

function showStatus(message, isError = true) {
  statusBox.textContent = message;
  statusBox.classList.toggle("status-error", isError);
  statusBox.classList.toggle("status-success", !isError);
}

if (!resetToken) {
  showStatus("This reset link is missing or invalid. Please request a new one.");
  form.querySelector("button[type='submit']").disabled = true;
}

function setupPasswordToggle(iconId, inputEl) {
  const icon = document.getElementById(iconId);
  icon.addEventListener("click", () => {
    const isHidden = inputEl.type === "password";
    inputEl.type = isHidden ? "text" : "password";
    icon.classList.toggle("ph-eye", !isHidden);
    icon.classList.toggle("ph-eye-slash", isHidden);
  });
}

setupPasswordToggle("show-new-password", newPasswordInput);
setupPasswordToggle("show-confirm-password", confirmPasswordInput);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!resetToken) {
    showStatus("This reset link is missing or invalid. Please request a new one.");
    return;
  }

  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (newPassword.length < 8) {
    showStatus("Password should be at least 8 characters.");
    return;
  }
  if (newPassword !== confirmPassword) {
    showStatus("Passwords don't match.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}${RESET_PASSWORD_PATH}/${encodeURIComponent(resetToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showStatus(data.message || "Couldn't reset your password. The link may have expired — request a new one.");
      return;
    }

    showStatus("Password reset successfully. Redirecting to login...", false);
    setTimeout(() => {
      window.location.href = "Login.html";
    }, 2000);
  } catch (err) {
    console.error("Reset password error:", err);
    showStatus("Something went wrong. Check your connection and try again.");
  }
});
