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

  function setupFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    // Check validity on input changes
    form.addEventListener("input", () => {
      submitBtn.disabled = !form.checkValidity();
    });
    
    // Initial check
    submitBtn.disabled = !form.checkValidity();
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
    const rememberMe = document.getElementById("loginRememberMe")?.checked ?? false;

    if (!email || !password) {
      setMessage("loginMessage", "Please enter your email and password.", "error");
      return;
    }

    setMessage("loginMessage", "Logging in...", "info");
    toggleButtonState(submitBtn, true, "Logging in...");

    try {
      await post("/api/auth/login", { email, password, rememberMe });
      const sessionCheck = await get("/api/auth/me", { skipUnauthorizedRedirect: true });
      const user = sessionCheck?.data;

      if (!user) {
        localStorage.removeItem("currentUser");
        throw new Error("Login succeeded but the browser did not store the session cookie. Please clear site data and log in again.");
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

      setMessage("loginMessage", "Login successfully.", "success");

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
        const isAdmin = (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');
        let target = isAdmin ? "admin-dashboard.html" : "dashboard.html";
        const redirectValue = getRedirectParam();

        if (redirectValue) {
          try {
            const parsed = new URL(redirectValue, window.location.href);
            if (parsed.origin === window.location.origin && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
              let parsedTarget = parsed.pathname + parsed.search + parsed.hash;
              if (isAdmin && !parsedTarget.includes('admin-')) {
                  // Admin user but redirect target is not an admin page. Ignore redirect.
              } else {
                  target = parsedTarget;
              }
            } else {
              console.warn("Mismatched open-redirect origin or protocol detected.");
            }
          } catch (e) {
            console.warn("Invalid redirect origin context detected, falling back to default.", e);
          }
        }
        window.location.href = target;
      }, 1500);
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

  function initializeForgotPasswordFlow() {
    const forgotLink = document.getElementById("forgotPasswordLink");
    const modal = document.getElementById("forgotPasswordModal");
    const closeBtn = document.getElementById("closeForgotModalBtn");
    
    const step1 = document.getElementById("forgotStep1");
    const step2 = document.getElementById("forgotStep2");
    
    const form1 = document.getElementById("forgotForm1");
    const form2 = document.getElementById("forgotForm2");
    
    const msg1 = document.getElementById("forgotMessage1");
    const msg2 = document.getElementById("forgotMessage2");
    
    const forgotEmailInput = document.getElementById("forgotEmail");
    
    if (!forgotLink || !modal || !closeBtn) return;
    
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      modal.style.display = "flex";
      step1.style.display = "block";
      step2.style.display = "none";
      if (msg1) msg1.style.display = "none";
      if (msg2) msg2.style.display = "none";
      form1.reset();
      form2.reset();
    });
    
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
    
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
    
    form1.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = forgotEmailInput.value.trim();
      if (!email) return;
      
      const submitBtn = document.getElementById("sendOtpBtn");
      toggleButtonState(submitBtn, true, "Sending...");
      
      if (msg1) {
        msg1.textContent = "Processing...";
        msg1.className = "helper-text info";
        msg1.style.display = "block";
      }
      
      try {
        await post("/api/auth/forgot-password", { email });
        toggleButtonState(submitBtn, false);
        
        step1.style.display = "none";
        step2.style.display = "block";
        if (msg2) {
          msg2.textContent = "If this email exists, a reset code has been sent.";
          msg2.className = "helper-text success";
          msg2.style.display = "block";
        }
      } catch (error) {
        toggleButtonState(submitBtn, false);
        if (msg1) {
          msg1.textContent = error.message || "Failed to process forgot password. Please try again.";
          msg1.className = "helper-text error";
          msg1.style.display = "block";
        }
      }
    });
    
    form2.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = forgotEmailInput.value.trim();
      const otp = document.getElementById("resetOtp").value.trim();
      const newPassword = document.getElementById("resetNewPassword").value;
      const confirmPassword = document.getElementById("resetConfirmPassword").value;
      
      const submitBtn = document.getElementById("resetSubmitBtn");
      
      if (!otp || !newPassword || !confirmPassword) {
        if (msg2) {
          msg2.textContent = "All fields are required.";
          msg2.className = "helper-text error";
          msg2.style.display = "block";
        }
        return;
      }
      
      if (newPassword !== confirmPassword) {
        if (msg2) {
          msg2.textContent = "Passwords do not match.";
          msg2.className = "helper-text error";
          msg2.style.display = "block";
        }
        return;
      }
      
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        if (msg2) {
          msg2.textContent = "Password must be at least 8 characters, including at least 1 letter and 1 number.";
          msg2.className = "helper-text error";
          msg2.style.display = "block";
        }
        return;
      }
      
      toggleButtonState(submitBtn, true, "Resetting...");
      if (msg2) {
        msg2.textContent = "Resetting password...";
        msg2.className = "helper-text info";
        msg2.style.display = "block";
      }
      
      try {
        await post("/api/auth/reset-password", { email, otp, newPassword, confirmPassword });
        toggleButtonState(submitBtn, false);
        
        if (msg2) {
          msg2.textContent = "Password reset successfully! Redirecting to login...";
          msg2.className = "helper-text success";
          msg2.style.display = "block";
        }
        
        setTimeout(() => {
          modal.style.display = "none";
          const loginEmail = document.getElementById("loginEmail");
          if (loginEmail) {
            loginEmail.value = email;
            loginEmail.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, 1500);
      } catch (error) {
        toggleButtonState(submitBtn, false);
        if (msg2) {
          msg2.textContent = error.message || "Reset failed. Please check OTP and try again.";
          msg2.className = "helper-text error";
          msg2.style.display = "block";
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    initializeForgotPasswordFlow();
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

    setupFormValidation("registerForm");
    setupFormValidation("otpForm");
    setupFormValidation("loginForm");

    setupPasswordToggles();

    // OTP Input Logic (6-box)
    const otpInputs = document.querySelectorAll(".otp-input");
    const hiddenOtpInput = document.getElementById("otp");

    if (otpInputs.length > 0 && hiddenOtpInput) {
      const updateHiddenOtp = () => {
        hiddenOtpInput.value = Array.from(otpInputs).map(input => input.value).join("");
      };

      otpInputs.forEach((input, index) => {
        // Handle paste on any input
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
            
            // Trigger input event to re-validate form
            hiddenOtpInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });

        input.addEventListener("input", (e) => {
          const val = e.target.value;
          if (/[^0-9]/.test(val)) {
            e.target.value = val.replace(/[^0-9]/g, "");
            return;
          }
          updateHiddenOtp();
          // Trigger input event for validation
          hiddenOtpInput.dispatchEvent(new Event("input", { bubbles: true }));
          
          if (val !== "" && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          }
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
            otpInputs[index - 1].value = "";
            updateHiddenOtp();
            hiddenOtpInput.dispatchEvent(new Event("input", { bubbles: true }));
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

function requireAdminAuth() {
  if (!requireAuth()) return false;

  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ROLE_ADMIN') {
      window.location.href = "dashboard.html";
      return false;
    }
  } catch (e) {
    console.error("Error parsing currentUser in requireAdminAuth", e);
    return false;
  }
  return true;
}

function requireUserAuth() {
  if (!requireAuth()) return false;

  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser.role === 'ADMIN' || currentUser.role === 'ROLE_ADMIN') {
      window.location.href = "admin-dashboard.html";
      return false;
    }
  } catch (e) {
    console.error("Error parsing currentUser in requireUserAuth", e);
    return false;
  }
  return true;
}

window.requireAuth = requireAuth;
window.requireAdminAuth = requireAdminAuth;
window.requireUserAuth = requireUserAuth;
