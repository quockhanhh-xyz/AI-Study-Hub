function setMessage(elementId, message) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = message;
  }
}

function getInputValue(inputId) {
  const input = document.getElementById(inputId);
  return input ? input.value.trim() : "";
}

/**
 * Build 1 target:
 * POST /api/auth/register
 * Request: { fullName, email, password }
 */
async function handleRegister(event) {
  event.preventDefault();

  const fullName = getInputValue("registerFullName");
  const email = getInputValue("registerEmail");
  const password = getInputValue("registerPassword");

  setMessage(
    "registerMessage",
    "Register API is not implemented in Build 0 yet.",
  );

  console.log("Register form data:", {
    fullName,
    email,
    password,
  });

  // Build 1 implementation:
  // try {
  //   const result = await apiRequest("/api/auth/register", {
  //     method: "POST",
  //     body: { fullName, email, password } // Đã bỏ JSON.stringify theo api.js mới
  //   });
  //   setMessage("registerMessage", "Register success!");
  //   localStorage.setItem("pendingVerifyEmail", email);
  //   window.location.href = "verify-otp.html";
  // } catch (error) {
  //   setMessage("registerMessage", `Register failed: ${error.message}`);
  // }
}

/**
 * Build 1 target:
 * POST /api/auth/verify-otp
 * Request: { email, otpCode }
 */
async function handleVerifyOtp(event) {
  event.preventDefault();

  const email = getInputValue("otpEmail");
  const otpCode = getInputValue("otpCode");

  setMessage("otpMessage", "Verify OTP API is not implemented in Build 0 yet.");

  console.log("Verify OTP form data:", {
    email,
    otpCode,
  });

  // Build 1 implementation:
  // try {
  //   const result = await apiRequest("/api/auth/verify-otp", {
  //     method: "POST",
  //     body: { email, otpCode }
  //   });
  //   setMessage("otpMessage", "Verify OTP success!");
  // } catch (error) {
  //   setMessage("otpMessage", `Verify OTP failed: ${error.message}`);
  // }
}

/**
 * Build 1 target:
 * POST /api/auth/resend-otp
 * Request: { email }
 */
async function handleResendOtp() {
  const email = getInputValue("otpEmail");

  setMessage("otpMessage", "Resend OTP API is not implemented in Build 0 yet.");

  console.log("Resend OTP email:", email);

  // Build 1 implementation:
  // try {
  //   const result = await apiRequest("/api/auth/resend-otp", {
  //     method: "POST",
  //     body: { email }
  //   });
  //   setMessage("otpMessage", "Resend OTP success!");
  // } catch (error) {
  //   setMessage("otpMessage", `Resend OTP failed: ${error.message}`);
  // }
}

/**
 * Build 1 target:
 * POST /api/auth/login
 * Request: { email, password }
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = getInputValue("loginEmail");
  const password = getInputValue("loginPassword");

  if (!email || !password) {
    setMessage("loginMessage", "Please enter your email and password.");
    return;
  }

  try {
    setMessage("loginMessage", "Logging in...");

    const result = await post("/api/auth/login", {
      email,
      password,
    });

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
      }),
    );

    setMessage("loginMessage", result.message || "Login successfully.");

    setTimeout(function () {
      window.location.href = "dashboard.html";
    }, 500);
  } catch (error) {
    setMessage("loginMessage", error.message);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");
  const verifyOtpForm = document.getElementById("verifyOtpForm");
  const resendOtpButton = document.getElementById("resendOtpButton");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  if (verifyOtpForm) {
    verifyOtpForm.addEventListener("submit", handleVerifyOtp);
  }

  if (resendOtpButton) {
    resendOtpButton.addEventListener("click", handleResendOtp);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});
