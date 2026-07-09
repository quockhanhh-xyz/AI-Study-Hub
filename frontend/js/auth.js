(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────

  function setMessage(elementId, message, type = "info") {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.className = `helper-text ${type}`;
  }

  function getInputValue(inputId) {
    const input = document.getElementById(inputId);
    return input?.value?.trim() ?? "";
  }

  function getEmailFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("email") || "";
  }

  function toggleButtonState(button, isLoading, loadingText = "Processing...") {
    if (!button) return;
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : button.dataset.originalText;
  }

  function resetButtonState(button) {
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }

  function getRedirectParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") || "";
  }

  // ─────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const fullName = getInputValue("fullName");
    const email = getInputValue("email");
    const password = getInputValue("password");
    const confirmPassword = getInputValue("confirmPassword");

    if (!fullName || !email || !password) {
      setMessage("registerMessage", "Please fill in all information.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("registerMessage", "Invalid email format.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("registerMessage", "Passwords do not match.", "error");
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setMessage(
        "registerMessage",
        "Password must be at least 8 characters, including at least 1 letter and 1 number.",
        "error"
      );
      return;
    }

    setMessage("registerMessage", "Registering...", "info");
    toggleButtonState(submitBtn, true, "Registering...");

    try {
      await post("/api/auth/register", { fullName, email, password });

      setMessage("registerMessage", "Registration successful! Redirecting to OTP verification...", "success");

      setTimeout(() => {
        const redirectValue = getRedirectParam();
        const appendRedirect = redirectValue ? `&redirect=${encodeURIComponent(redirectValue)}` : "";
        window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}${appendRedirect}`;
      }, 1500);
    } catch (error) {
      setMessage("registerMessage", error.message || "Registration failed. Please try again.", "error");
    } finally {
      resetButtonState(submitBtn);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFY OTP
  // ─────────────────────────────────────────────────────────────

  async function handleVerifyOtp(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = getEmailFromQuery();
    const otpCode = getInputValue("otp");

    if (!email) {
      setMessage("otpMessage", "Email not found. Please register again.", "error");
      return;
    }

    if (!otpCode) {
      setMessage("otpMessage", "Please enter the OTP code.", "error");
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setMessage("otpMessage", "OTP code must be 6 digits.", "error");
      return;
    }

    setMessage("otpMessage", "Verifying...", "info");
    toggleButtonState(submitBtn, true, "Verifying...");

    try {
      await post("/api/auth/verify-otp", { email, otpCode });

      setMessage("otpMessage", "Verification successful! Redirecting to login...", "success");

      setTimeout(() => {
        const redirectValue = getRedirectParam();
        const appendRedirect = redirectValue ? `?redirect=${encodeURIComponent(redirectValue)}` : "";
        window.location.href = `login.html${appendRedirect}`;
      }, 1500);
    } catch (error) {
      setMessage("otpMessage", error.message || "Verification failed. Please try again.", "error");
    } finally {
      resetButtonState(submitBtn);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RESEND OTP
  // ─────────────────────────────────────────────────────────────

  function startResendCooldown(resendBtn) {
    let countdown = 60;
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend OTP (${countdown}s)`;

    const timer = setInterval(() => {
      countdown--;
      resendBtn.textContent = `Resend OTP (${countdown}s)`;
      if (countdown <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend OTP";
        delete resendBtn.dataset.originalText;
      }
    }, 1000);
  }

  async function handleResendOtp() {
    const email = getEmailFromQuery();
    const resendBtn = document.getElementById("resendBtn");

    if (!email) {
      setMessage("otpMessage", "Email not found. Please register again.", "error");
      return;
    }

    toggleButtonState(resendBtn, true, "Resending...");
    setMessage("otpMessage", "Resending OTP code...", "info");

    try {
      await post("/api/auth/resend-otp", { email });

      setMessage("otpMessage", "OTP code resent! Please check your email.", "success");
      startResendCooldown(resendBtn);
    } catch (error) {
      setMessage("otpMessage", error.message || "Resend failed. Please try again.", "error");
      resetButtonState(resendBtn);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = getInputValue("loginEmail");
    const password = getInputValue("loginPassword");

    if (!email || !password) {
      setMessage("loginMessage", "Please enter your email and password.", "error");
      return;
    }

    setMessage("loginMessage", "Logging in...", "info");
    toggleButtonState(submitBtn, true, "Logging in...");

    try {
      const result = await post("/api/auth/login", { email, password });
      const user = result.data;

      if (!user) {
        throw new Error("Login response payload data is missing.");
      }

      // Explicitly store user metadata for UI consumption, strictly excluding token details
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        })
      );

      setMessage("loginMessage", result.message || "Login successfully.", "success");

      setTimeout(function () {
        let target = "dashboard.html";
        const redirectValue = getRedirectParam();

        if (redirectValue) {
          try {
            const parsed = new URL(redirectValue, window.location.href);
            if (parsed.origin === window.location.origin && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
              target = parsed.pathname + parsed.search + parsed.hash;
            } else {
              console.warn("Mismatched open-redirect origin or protocol detected.");
            }
          } catch (e) {
            console.warn("Invalid redirect origin context detected, falling back to dashboard.", e);
          }
        }

        window.location.href = target;
      }, 500);
    } catch (error) {
      setMessage("loginMessage", error.message, "error");
    } finally {
      resetButtonState(submitBtn);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SHOW / HIDE PASSWORD
  // ─────────────────────────────────────────────────────────────

  function setupPasswordToggles() {
    const toggles = document.querySelectorAll(".password-toggle-btn");
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";

        const eyeIcon = btn.querySelector(".icon-eye");
        const eyeOffIcon = btn.querySelector(".icon-eye-off");
        if (eyeIcon) eyeIcon.style.display = willShow ? "none" : "block";
        if (eyeOffIcon) eyeOffIcon.style.display = willShow ? "block" : "none";

        btn.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    const displayEmail = document.getElementById("displayEmail");
    if (displayEmail) {
      displayEmail.textContent = getEmailFromQuery() || "your email";
    }

    const registerForm = document.getElementById("registerForm");
    const verifyOtpForm = document.getElementById("otpForm");
    const resendOtpButton = document.getElementById("resendBtn");
    const loginForm = document.getElementById("loginForm");

    if (registerForm) registerForm.addEventListener("submit", handleRegister);
    if (verifyOtpForm) verifyOtpForm.addEventListener("submit", handleVerifyOtp);
    if (resendOtpButton) resendOtpButton.addEventListener("click", handleResendOtp);
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
  });


})();

// ─────────────────────────────────────────────────────────────
// AUTH REFRESH HELPER
// ─────────────────────────────────────────────────────────────

/**
* Re-fetches the current user from backend and updates localStorage.
* Refresh current user after payment or tier changes.
* @returns {Promise<Object|null>} Updated user data or null on failure.
*/
async function refreshCurrentUser() {
  try {
    const result = await get("/api/auth/me", { skipUnauthorizedRedirect: true });
    if (result && result.data) {
      localStorage.setItem("currentUser", JSON.stringify(result.data));
      return result.data;
    }
    return null;
  } catch (error) {
    console.warn("Failed to refresh current user session:", error);
    return null;
  }
}

// Expose globally so payment flow and other page scripts can call it
window.refreshCurrentUser = refreshCurrentUser;

// ─────────────────────────────────────────────────────────────
// AUTH GUARD HELPER (Step 14)
// ─────────────────────────────────────────────────────────────

/**
 * Client-side auth guard.
 * Checks if user is logged in via localStorage. If not, redirects to login page.
 * Note: The true source of truth is the HttpOnly cookie, so API calls will still
 * return 401 and trigger a redirect if the cookie is expired.
 */
function requireAuth() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) {
    const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `login.html?redirect=${currentUrl}`;
    return false;
  }
  return true;
}

window.requireAuth = requireAuth;
