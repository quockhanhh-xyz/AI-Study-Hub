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
        window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}`;
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
        window.location.href = "login.html";
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

      if (!user || !user.token) {
        throw new Error("Login response does not contain a valid token.");
      }

      localStorage.setItem("accessToken", user.token);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        })
      );

      setMessage("loginMessage", result.message || "Login successfully.", "success");

      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (error) {
      setMessage("loginMessage", error.message, "error");
    } finally {
      resetButtonState(submitBtn);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────

  function handleLogout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    window.location.href = "login.html";
  }

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD AUTH GUARD
  // ─────────────────────────────────────────────────────────────

  function checkDashboardAuth() {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user) {
      window.location.href = "login.html";
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    const displayEmail = document.getElementById("displayEmail");
    if (displayEmail) {
      displayEmail.textContent = getEmailFromQuery() || "your email";
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      checkDashboardAuth();
      logoutBtn.addEventListener("click", handleLogout);
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
