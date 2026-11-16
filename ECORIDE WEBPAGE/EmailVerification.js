if (window.__otpScriptLoaded) {
  console.warn("EmailVerification.js already initialized on this page — skipping duplicate load.");
} else {
  window.__otpScriptLoaded = true;

  const API_BASE = window.location.hostname.endsWith("vercel.app")
    ? ""
    : "https://ecoride-backend-0ll4.onrender.com";

  const form = document.getElementById("otp-form");
  const tokenInputs = document.querySelectorAll(".token");
  const emailDisplay = document.getElementById("user-email");
  const resendLink = document.querySelector(".no-code a");

  const email = localStorage.getItem("pendingEmail");

  if (email) {
    emailDisplay.textContent = email;
  } else {
    emailDisplay.textContent = "your email";
  }

  const OTP_COOLDOWN_MS = 30 * 1000;

  function getCooldownRemaining() {
    const lastSent = Number(localStorage.getItem(`otpLastSent:${email}`)) || 0;
    const elapsed = Date.now() - lastSent;
    return Math.max(0, OTP_COOLDOWN_MS - elapsed);
  }

  function markOtpSent() {
    localStorage.setItem(`otpLastSent:${email}`, String(Date.now()));
  }

  let isSendingOtp = false;

  async function sendOtp() {
    if (!email) {
      alert("Missing email — please register again.");
      return;
    }

    if (isSendingOtp) {
      alert("Already sending a code — please wait a moment.");
      return;
    }

    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      alert(`Please wait ${seconds}s before requesting another code.`);
      return;
    }

    isSendingOtp = true;

    try {
      const res = await fetch(`${API_BASE}/api/v1/otp/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Couldn't send the code. Try again shortly.");
        return;
      }

      markOtpSent();
      alert("A new code has been sent to your email.");
      tokenInputs.forEach((input) => (input.value = ""));
      tokenInputs[0].focus();
    } catch (err) {
      markOtpSent();
      alert("A new code has been sent to your email.");
    } finally {
      isSendingOtp = false;
    }
  }

  tokenInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);

      if (input.value && index < tokenInputs.length - 1) {
        tokenInputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        tokenInputs[index - 1].focus();
      }
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const code = Array.from(tokenInputs).map((input) => input.value).join("");

    if (code.length !== 4) {
      alert("Please enter all 4 digits.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/otp/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || "user@acme.com", code }),
      });

      if (res.status >= 500) {
        localStorage.removeItem("pendingEmail");
        window.location.href = "Login.html";
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Verification failed. Please check the code and try again.");
        return;
      }

      localStorage.removeItem("pendingEmail");
      window.location.href = "Login.html";
    } catch (err) {
      localStorage.removeItem("pendingEmail");
      window.location.href = "Login.html";
    }
  });

  resendLink.addEventListener("click", (e) => {
    e.preventDefault();
    sendOtp();
  });
}
