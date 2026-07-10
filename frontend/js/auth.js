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

      // Trigger confetti celebration from the message position
      if (typeof confetti === "function") {
        const msgEl = document.getElementById("loginMessage");
        let originX = 0.5;
        let originY = 0.6;
        if (msgEl) {
          const rect = msgEl.getBoundingClientRect();
          originX = (rect.left + rect.width / 2) / window.innerWidth;
          originY = (rect.top + rect.height / 2) / window.innerHeight;
        }

        confetti({
          particleCount: 150,
          spread: 80,
          ticks: 300,
          origin: { x: originX, y: originY },
          colors: ['#FF7E00', '#FFC107', '#4361EE', '#3A0CA3']
        });
      }

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
      }, 600);
    } catch (error) {
      setMessage("loginMessage", error.message, "error");
    } finally {
      resetButtonState(submitBtn);
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

    const registerForm = document.getElementById("registerForm");
    const verifyOtpForm = document.getElementById("otpForm");
    const resendOtpButton = document.getElementById("resendBtn");
    const loginForm = document.getElementById("loginForm");

    if (registerForm) registerForm.addEventListener("submit", handleRegister);
    if (verifyOtpForm) verifyOtpForm.addEventListener("submit", handleVerifyOtp);
    if (resendOtpButton) {
      resendOtpButton.addEventListener("click", handleResendOtp);
      startResendCooldown(resendOtpButton);
    }
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    // Toggle Password Visibility
    const EYE_OPEN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF7E00"/><stop offset="100%" stop-color="#FFC107"/></linearGradient></defs><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="url(#eyeGradient)"/></svg>`;
    const EYE_CLOSED = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="eyeGradientClosed" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF7E00"/><stop offset="100%" stop-color="#FFC107"/></linearGradient></defs><path d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3h-.17zm-4.3.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm14.47 2.2c-.34 1.15-1 2.19-1.8 3.03l-1.46-1.46c.55-.66 1.01-1.42 1.33-2.26-1.5-3.8-5.26-6.5-9.67-6.5-.94 0-1.85.12-2.72.35L5.78 3.2 4.37 4.61l15.01 15.02 1.41-1.41-2.79-2.79v-.01zM2.81 7.28C1.86 8.65 1.25 10.26 1 12c1.73 4.39 6 7.5 11 7.5 1.3 0 2.54-.2 3.71-.56l-1.63-1.63C13.41 17.75 12.72 17.9 12 17.9c-2.76 0-5-2.24-5-5 0-.72.15-1.41.41-2.08L4.22 7.63c-.5.42-.99.86-1.41 1.35v-.01z" fill="url(#eyeGradientClosed)"/></svg>`;

    document.querySelectorAll(".btn-toggle-password").forEach(function (btn) {
      // Set initial icon
      btn.innerHTML = EYE_CLOSED;

      btn.addEventListener("click", function () {
        const input = this.previousElementSibling;
        if (input && input.tagName === "INPUT") {
          if (input.type === "password") {
            input.type = "text";
            this.innerHTML = EYE_OPEN;
          } else {
            input.type = "password";
            this.innerHTML = EYE_CLOSED;
          }
        }
      });
    });
    // OTP Input Logic (6-box)
    const otpInputs = document.querySelectorAll(".otp-input");
    const hiddenOtpInput = document.getElementById("otp");

    if (otpInputs.length > 0 && hiddenOtpInput) {
      const updateHiddenOtp = () => {
        hiddenOtpInput.value = Array.from(otpInputs).map(input => input.value).join("");
      };

      otpInputs.forEach((input, index) => {
        // Handle paste
        if (index === 0) {
          input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData("text").trim().slice(0, 6);
            if (/^\d+$/.test(pasteData)) {
              pasteData.split("").forEach((char, i) => {
                if (otpInputs[i]) {
                  otpInputs[i].value = char;
                }
              });
              updateHiddenOtp();
              const focusIndex = Math.min(pasteData.length, 5);
              otpInputs[focusIndex].focus();
            }
          });
        }

        input.addEventListener("input", (e) => {
          const val = e.target.value;
          if (/[^0-9]/.test(val)) {
            e.target.value = val.replace(/[^0-9]/g, "");
            return;
          }
          updateHiddenOtp();
          if (val !== "" && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          }
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
            otpInputs[index - 1].value = "";
            updateHiddenOtp();
          } else if (e.key === "ArrowLeft" && index > 0) {
            otpInputs[index - 1].focus();
          } else if (e.key === "ArrowRight" && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          }
        });
      });
    }
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
