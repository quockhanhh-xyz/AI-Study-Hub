/**
 * User Profile and Security settings manager
 * Uses helpers from account-api.js
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Guard clause: wait for auth verification
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // State variable
  let currentProfileData = null;

  // DOM Elements - Profile details
  const profileForm = document.getElementById("profileDetailsForm");
  const fullNameInput = document.getElementById("profileFullName");
  const phoneInput = document.getElementById("profilePhone");
  const schoolNameInput = document.getElementById("profileSchoolName");
  const majorInput = document.getElementById("profileMajor");
  const studentCodeInput = document.getElementById("profileStudentCode");
  const graduationYearInput = document.getElementById("profileGraduationYear");
  if (graduationYearInput) {
    graduationYearInput.max = String(new Date().getFullYear() + 10);
  }
  const educationLevelInput = document.getElementById("profileEducationLevel");
  const bioInput = document.getElementById("profileBio");
  const resetBtn = document.getElementById("profileResetBtn");
  const formOverlay = document.getElementById("profileFormOverlay");

  // DOM Elements - System read-only params
  const systemEmail = document.getElementById("systemEmail");
  const systemRole = document.getElementById("systemRole");
  const systemStatus = document.getElementById("systemStatus");
  const systemTier = document.getElementById("systemTier");
  const systemTierExpires = document.getElementById("systemTierExpires");
  const tierExpiresRow = document.getElementById("tierExpiresRow");
  const systemJoinedDate = document.getElementById("systemJoinedDate");

  // DOM Elements - Avatar
  const avatarInput = document.getElementById("avatarInput");
  const avatarInitials = document.getElementById("avatarInitials");
  const avatarPreviewWrapper = document.getElementById("avatarPreviewWrapper");

  // DOM Elements - Password Form
  const passwordForm = document.getElementById("changePasswordForm");
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const passwordOverlay = document.getElementById("passwordOverlay");

  // Status/Toast messages
  const statusBar = document.getElementById("profileStatusBar");

  // Helper: Display Status Message
  function showStatus(message, type = "success") {
    if (!statusBar) return;
    statusBar.innerHTML = `
      <div class="status-box status-${type}">
        <span>${message}</span>
      </div>
    `;
    statusBar.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      statusBar.innerHTML = "";
    }, 5000);
  }

  // Helper: Format Date String
  function formatJoinedDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  // Helper: Get initials of Name
  function getInitials(fullName) {
    const names = (fullName || "User").trim().split(/\s+/);
    if (names.length > 1) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length > 0 && names[0]) {
      return names[0][0].toUpperCase();
    }
    return "U";
  }

  // Render User Avatar and Initials Fallback
  function renderAvatar(avatarUrl, fullName) {
    if (!avatarPreviewWrapper) return;
    
    // Clear previous children
    avatarPreviewWrapper.innerHTML = "";

    if (avatarUrl) {
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.className = "avatar-img";
      img.alt = "Avatar";
      avatarPreviewWrapper.appendChild(img);
    } else {
      const initialsDiv = document.createElement("div");
      initialsDiv.className = "avatar-initials-large";
      initialsDiv.textContent = getInitials(fullName);
      avatarPreviewWrapper.appendChild(initialsDiv);
    }
  }

  // Fill profile details form inputs
  function populateProfileForm(profile) {
    fullNameInput.value = profile.fullName || "";
    phoneInput.value = profile.phone || "";
    schoolNameInput.value = profile.schoolName || "";
    majorInput.value = profile.major || "";
    studentCodeInput.value = profile.studentCode || "";
    graduationYearInput.value = profile.graduationYear || "";
    educationLevelInput.value = profile.educationLevel || "";
    bioInput.value = profile.bio || "";

    // Populate read-only system params
    systemEmail.textContent = profile.email || "-";
    systemRole.textContent = profile.role === "ADMIN" ? "Administrator" : "Standard User";
    systemStatus.textContent = profile.status || "-";
    systemTier.textContent = profile.tier || "-";

    if (profile.tier === "FREE" || !profile.tierExpiresAt) {
      if (tierExpiresRow) tierExpiresRow.style.display = "none";
    } else {
      if (tierExpiresRow) {
        tierExpiresRow.style.display = "flex";
        systemTierExpires.textContent = formatJoinedDate(profile.tierExpiresAt);
      }
    }

    systemJoinedDate.textContent = formatJoinedDate(profile.createdAt);
    
    // Render avatar
    renderAvatar(profile.avatarUrl, profile.fullName);
  }

  // Fetch full user profile from backend
  async function loadUserProfile() {
    try {
      const response = await getProfile();
      if (response && response.data) {
        currentProfileData = response.data;
        populateProfileForm(currentProfileData);
      } else {
        showStatus("Failed to load user profile data", "error");
      }
    } catch (e) {
      console.error("Failed to load profile details:", e);
      showStatus("Failed to load user profile details from server", "error");
    }
  }

  // Reset form to latest loaded state
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (currentProfileData) {
        populateProfileForm(currentProfileData);
        showStatus("Form fields reset to original profile details", "success");
      }
    });
  }

  // Form Submit: Profile details update
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const fullNameVal = fullNameInput.value.trim();
      if (fullNameVal.length < 2 || fullNameVal.length > 100) {
        showStatus("Full Name must be between 2 and 100 characters", "error");
        return;
      }

      const currentYear = new Date().getFullYear();
      const gradYearVal = graduationYearInput.value ? parseInt(graduationYearInput.value, 10) : null;
      if (gradYearVal !== null && (gradYearVal < 1900 || gradYearVal > currentYear + 10)) {
        showStatus(`Graduation year must be between 1900 and ${currentYear + 10}`, "error");
        return;
      }

      if (formOverlay) formOverlay.style.display = "flex";

      // Strict contract DTO matching: do NOT send email, status, tier, avatarUrl, role, dates
      const profilePayload = {
        fullName: fullNameVal,
        phone: phoneInput.value.trim() || null,
        schoolName: schoolNameInput.value.trim() || null,
        major: majorInput.value.trim() || null,
        studentCode: studentCodeInput.value.trim() || null,
        graduationYear: gradYearVal,
        educationLevel: educationLevelInput.value || null,
        bio: bioInput.value.trim() || null
      };

      try {
        const response = await updateProfile(profilePayload);
        if (response && response.data) {
          currentProfileData = response.data;
          
          // Re-populate and render updated stats
          populateProfileForm(currentProfileData);

          // Update localized cache so header chip and sidebar updates instantly
          const userStr = localStorage.getItem("currentUser");
          if (userStr) {
            try {
              const userObj = JSON.parse(userStr);
              userObj.fullName = currentProfileData.fullName;
              userObj.avatarUrl = currentProfileData.avatarUrl;
              localStorage.setItem("currentUser", JSON.stringify(userObj));
            } catch (err) {}
          }

          // Trigger dynamic header update
          if (typeof window.refreshHeaderProfileChip === "function") {
            window.refreshHeaderProfileChip();
          }

          showStatus("Profile details updated successfully!", "success");
        } else {
          showStatus(response?.message || "Failed to update profile", "error");
        }
      } catch (err) {
        console.error("Profile update failed:", err);
        showStatus(err.message || "An unexpected error occurred during save", "error");
      } finally {
        if (formOverlay) formOverlay.style.display = "none";
      }
    });
  }

  // Avatar Upload listener
  if (avatarInput) {
    avatarInput.addEventListener("change", async (e) => {
      const selectedFile = e.target.files[0];
      if (!selectedFile) return;

      // Validate format
      const validTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
      if (!validTypes.includes(selectedFile.type)) {
        showStatus("Invalid file format. Please upload PNG, JPG, JPEG, or WEBP.", "error");
        avatarInput.value = ""; // Reset
        return;
      }

      // Validate size (5MB = 5 * 1024 * 1024 bytes)
      if (selectedFile.size > 5 * 1024 * 1024) {
        showStatus("File is too large. Maximum allowed size is 5MB.", "error");
        avatarInput.value = "";
        return;
      }

      try {
        showStatus("Uploading profile avatar photo...", "checking");
        
        const response = await uploadAvatar(selectedFile);
        if (response && response.data) {
          currentProfileData = response.data;
          
          // Refresh avatar displays
          populateProfileForm(currentProfileData);

          // Update current user storage cache
          const userStr = localStorage.getItem("currentUser");
          if (userStr) {
            try {
              const userObj = JSON.parse(userStr);
              userObj.fullName = currentProfileData.fullName;
              userObj.avatarUrl = currentProfileData.avatarUrl;
              localStorage.setItem("currentUser", JSON.stringify(userObj));
            } catch (err) {}
          }

          // Trigger dynamic header profile chip rendering
          if (typeof window.refreshHeaderProfileChip === "function") {
            window.refreshHeaderProfileChip();
          }

          showStatus("Avatar uploaded successfully!", "success");
        } else {
          showStatus(response?.message || "Failed to upload avatar", "error");
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
        showStatus(err.message || "An unexpected error occurred during avatar upload", "error");
      } finally {
        avatarInput.value = ""; // Reset file select input
      }
    });
  }

  // Password Change listener
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Front-end Validations
      if (!currentPassword) {
        showStatus("Current password is required", "error");
        return;
      }

      if (newPassword.length < 8 || newPassword.length > 72) {
        showStatus("New password must be between 8 and 72 characters", "error");
        return;
      }

      // Password regex: at least 1 letter and 1 number
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^_-]*$/;
      if (!passwordRegex.test(newPassword)) {
        showStatus("New password must contain at least one letter and one number", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        showStatus("Confirm password does not match new password", "error");
        return;
      }

      if (passwordOverlay) passwordOverlay.style.display = "flex";

      try {
        const response = await changePassword(currentPassword, newPassword);
        
        // Clear password form inputs
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";

        showStatus("Password changed successfully!", "success");
      } catch (err) {
        console.error("Password change failed:", err);
        const errCode = err.code || "";
        const errMessage = err.message || "";

        if (errCode === "CURRENT_PASSWORD_INCORRECT") {
          showStatus("Current password is incorrect", "error");
        } else if (errCode === "PASSWORD_TOO_WEAK") {
          showStatus("New password is not strong enough (must contain letter and number)", "error");
        } else if (errCode === "AUTH_ACCOUNT_BLOCKED") {
          showStatus("Your account is blocked. Logging out...", "error");
          setTimeout(() => {
            localStorage.removeItem("currentUser");
            window.location.href = "login.html";
          }, 2000);
        } else {
          showStatus(errMessage || "Failed to change password. Please try again.", "error");
        }
      } finally {
        if (passwordOverlay) passwordOverlay.style.display = "none";
      }
    });
  }

  // Load user data on startup
  await loadUserProfile();
});
