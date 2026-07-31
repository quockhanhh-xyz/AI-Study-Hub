/**
 * Account Settings Page Controller (Privacy Configurations & Change Password)
 */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  // Guard clause: wait for auth verification
  let isAuthenticated = false;
  if (window.authReady) {
    isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // State variable
  let currentProfileData = null;

  // DOM Elements - Navigation Tabs
  const navItems = document.querySelectorAll(".profile-nav-item");
  const configCards = ["profilePrivacyCard", "profilePasswordCard"];

  // DOM Elements - Privacy settings
  const privacyForm = document.getElementById("profilePrivacyForm");
  const privacyOverlay = document.getElementById("privacyFormOverlay");
  const privacyPublicEl = document.getElementById("privacyPublic");
  const privacySchoolEl = document.getElementById("privacySchool");
  const privacyMajorEl = document.getElementById("privacyMajor");
  const privacyBioEl = document.getElementById("privacyBio");
  const privacyDocsEl = document.getElementById("privacyDocs");

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

  // Populate privacy settings form checkboxes
  function populatePrivacySettings(profile) {
    if (privacyPublicEl) privacyPublicEl.checked = profile.profilePublic ?? true;
    if (privacySchoolEl) privacySchoolEl.checked = profile.showSchool ?? true;
    if (privacyMajorEl) privacyMajorEl.checked = profile.showMajor ?? true;
    if (privacyBioEl) privacyBioEl.checked = profile.showBio ?? true;
    if (privacyDocsEl) privacyDocsEl.checked = profile.showPublicDocuments ?? true;
  }

  // Fetch full user profile from backend
  async function loadUserSettings() {
    try {
      const response = await getProfile();
      if (response && response.data) {
        currentProfileData = response.data;
        populatePrivacySettings(currentProfileData);
      } else {
        showStatus("Failed to load account settings data", "error");
      }
    } catch (e) {
      console.error("Failed to load settings details:", e);
      showStatus("Failed to load user settings from server", "error");
    }
  }

  // Sub-sidebar Tab navigation listeners
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetId = item.getAttribute("data-target");
      if (!targetId) return;

      // Update active nav state
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      // Toggle display of target card forms
      configCards.forEach(cardId => {
        const cardEl = document.getElementById(cardId);
        if (cardEl) {
          cardEl.style.display = cardId === targetId ? "block" : "none";
        }
      });
    });
  });

  // Form Submit: Privacy settings update
  if (privacyForm) {
    privacyForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (privacyOverlay) privacyOverlay.style.display = "flex";

      const privacyPayload = {
        profilePublic: privacyPublicEl.checked,
        showSchool: privacySchoolEl.checked,
        showMajor: privacyMajorEl.checked,
        showBio: privacyBioEl.checked,
        showPublicDocuments: privacyDocsEl.checked
      };

      try {
        const response = await put("/api/users/me/profile-privacy", privacyPayload);
        if (response && response.success) {
          showStatus("Profile privacy settings updated successfully!", "success");
        } else {
          showStatus(response?.message || "Failed to update privacy settings", "error");
        }
      } catch (err) {
        console.error("Privacy settings update failed:", err);
        showStatus(err.message || "An unexpected error occurred during save", "error");
      } finally {
        if (privacyOverlay) privacyOverlay.style.display = "none";
      }
    });
  }

  // Form Submit: Change Password
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
        await changePassword(currentPassword, newPassword);

        // Clear form
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";

        showStatus("Password changed successfully!", "success");
      } catch (err) {
        console.error("Password change failed:", err);
        const errCode = err.code || "";
        if (errCode === "CURRENT_PASSWORD_INCORRECT") {
          showStatus("Current password is incorrect", "error");
        } else {
          showStatus(err.message || "An unexpected error occurred during password change", "error");
        }
      } finally {
        if (passwordOverlay) passwordOverlay.style.display = "none";
      }
    });
  }

  // Load configuration on startup
  await loadUserSettings();
});
