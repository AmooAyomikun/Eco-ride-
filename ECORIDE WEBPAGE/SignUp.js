const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? "/api/v1"
  : "https://ecoride-backend-0ll4.onrender.com/api/v1";

const form = document.querySelector(".reg-con");
const errorBox = document.getElementById("error-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorBox.textContent = "";

  const companyName = document.getElementById("companyName").value.trim();
  const rcNumber = document.getElementById("rcNumber").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const countryCodeEl = document.getElementById("countryCode");
  const phoneNumberEl = document.getElementById("phoneNumber");
  const countryCode = countryCodeEl ? countryCodeEl.value : "";
  const phoneNumberRaw = phoneNumberEl ? phoneNumberEl.value.trim() : "";

  if (password !== confirmPassword) {
    errorBox.textContent = "Passwords do not match.";
    return;
  }

  const phoneNumber = phoneNumberRaw ? countryCode + phoneNumberRaw : "08031112233";

  localStorage.setItem("pendingRcNumber", rcNumber);
  localStorage.setItem("pendingCompanyName", companyName);
  localStorage.setItem("pendingEmail", email);

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: companyName,
        companyName,
        rcNumber,
        email,
        phoneNumber,
        password,
        confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      errorBox.textContent = data.message || "Registration failed. Please try again.";
      return;
    }

    localStorage.setItem("pendingEmail", data.email || email);
    window.location.href = "EmailVerification.html";
  } catch (err) {
    console.error("Registration error:", err);
    errorBox.textContent = "Something went wrong. Check your connection and try again.";
  }
});
