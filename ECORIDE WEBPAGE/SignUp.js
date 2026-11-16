const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? ""
  : "https://ecoride-backend-0ll4.onrender.com";

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
  const countryCode = countryCodeEl ? countryCodeEl.value : "+234";
  const phoneNumberRaw = phoneNumberEl ? phoneNumberEl.value.trim() : "8012345678";

  if (password !== confirmPassword) {
    errorBox.textContent = "Passwords do not match.";
    return;
  }

  const phoneNumber = countryCode + phoneNumberRaw;

  localStorage.setItem("pendingRcNumber", rcNumber);
  localStorage.setItem("pendingCompanyName", companyName);
  localStorage.setItem("pendingEmail", email);

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: companyName,
        lastName: "",
        email: email,
        phoneNumber: phoneNumber,
        password: password,
        confirmPassword: confirmPassword,
      }),
    });

    if (res.status >= 500) {
      window.location.href = "EmailVerification.html";
      return;
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      errorBox.textContent = data.message || "Registration failed. Please try again.";
      return;
    }

    localStorage.setItem("pendingEmail", data.email || email);
    window.location.href = "EmailVerification.html";
  } catch (err) {
    console.warn("Backend unreachable or CORS restricted, continuing to verification:", err);
    window.location.href = "EmailVerification.html";
  }
});
