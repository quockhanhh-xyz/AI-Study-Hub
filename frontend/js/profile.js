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

  // Fetch and populate schools dropdown
  async function initSchoolAndMajorDropdowns() {
    try {
      const schoolRes = await getActiveSchools();
      if (schoolRes && schoolRes.success) {
        schoolNameInput.innerHTML = '<option value="">Select School</option>';
        schoolRes.data.forEach(sch => {
          const opt = document.createElement("option");
          opt.value = sch.schoolId;
          opt.textContent = `${sch.schoolName} (${sch.shortName})`;
          schoolNameInput.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Failed to load schools list:", err);
    }
  }

  // Populate majors dropdown
  function populateMajorsSelect(majors) {
    majorInput.innerHTML = '<option value="">Select Major</option>';
    if (majors && majors.length > 0) {
      majors.forEach(maj => {
        const opt = document.createElement("option");
        opt.value = maj.majorId;
        opt.textContent = `${maj.majorName} (${maj.majorCode})`;
        majorInput.appendChild(opt);
      });
      majorInput.disabled = false;
    } else {
      majorInput.disabled = true;
    }
  }

  // School select change listener
  if (schoolNameInput) {
    schoolNameInput.addEventListener("change", async () => {
      const schoolId = schoolNameInput.value;
      if (schoolId) {
        try {
          const res = await getActiveMajors(schoolId);
          if (res && res.success) {
            populateMajorsSelect(res.data);
          }
        } catch (err) {
          console.error("Failed to load majors list:", err);
        }
      } else {
        majorInput.innerHTML = '<option value="">Select Major</option>';
        majorInput.disabled = true;
      }
    });
  }

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
    schoolNameInput.value = profile.schoolId || "";
    
    if (profile.schoolId) {
      getActiveMajors(profile.schoolId).then(res => {
        if (res && res.success) {
          populateMajorsSelect(res.data);
          majorInput.value = profile.majorId || "";
        }
      }).catch(err => console.error(err));
    } else {
      majorInput.innerHTML = '<option value="">Select Major</option>';
      majorInput.disabled = true;
    }
    studentCodeInput.value = profile.studentCode || "";
    graduationYearInput.value = profile.graduationYear || "";
    educationLevelInput.value = profile.educationLevel || "";
    if (educationLevelInput) {
      educationLevelInput.dispatchEvent(new Event("syncCustom"));
    }
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
        schoolId: schoolNameInput.value ? parseInt(schoolNameInput.value, 10) : null,
        majorId: majorInput.value ? parseInt(majorInput.value, 10) : null,
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
  initSchoolAndMajorDropdowns().then(() => {
    loadUserProfile();
  });

  // --- TAB LOGIC ---
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  function switchTab(tabId) {
    tabBtns.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
        btn.style.color = "#f05a28";
        btn.style.borderBottom = "2px solid #f05a28";
      } else {
        btn.classList.remove("active");
        btn.style.color = "#64748b";
        btn.style.borderBottom = "2px solid transparent";
      }
    });

    tabContents.forEach(content => {
      if (content.id === `tab-${tabId}`) {
        content.style.display = "block";
      } else {
        content.style.display = "none";
      }
    });

    if (tabId === "network") {
      loadNetworkData();
    } else if (tabId === "uploads") {
      loadUploadsData();
    }

    // Update URL without reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("tab", tabId);
    window.history.replaceState({}, "", newUrl);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Handle URL param on load - MOVED TO END OF FILE

  // --- NETWORK TAB LOGIC ---
  const btnShowFollowers = document.getElementById("btnShowFollowers");
  const btnShowFollowing = document.getElementById("btnShowFollowing");
  const networkListContainer = document.getElementById("networkListContainer");
  let currentNetworkView = "followers";

  if (btnShowFollowers) {
    btnShowFollowers.addEventListener("click", () => {
      currentNetworkView = "followers";
      btnShowFollowers.style.color = "#f05a28";
      btnShowFollowers.style.borderBottom = "2px solid #f05a28";
      btnShowFollowing.style.color = "#64748b";
      btnShowFollowing.style.borderBottom = "none";
      loadNetworkData();
    });
  }
  
  if (btnShowFollowing) {
    btnShowFollowing.addEventListener("click", () => {
      currentNetworkView = "following";
      btnShowFollowing.style.color = "#f05a28";
      btnShowFollowing.style.borderBottom = "2px solid #f05a28";
      btnShowFollowers.style.color = "#64748b";
      btnShowFollowers.style.borderBottom = "none";
      loadNetworkData();
    });
  }

  async function loadNetworkData() {
    if (!networkListContainer) return;
    networkListContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #64748b;">Loading...</div>`;
    
    try {
      const endpoint = currentNetworkView === "followers" ? "/api/users/me/followers" : "/api/users/me/following";
      const res = await get(endpoint);
      const list = res.data || [];
      
      if (list.length === 0) {
        networkListContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">You have no ${currentNetworkView} yet.</div>`;
        return;
      }
      
      let html = "";
      list.forEach(user => {
        const schoolStr = user.schoolName ? `<span style="font-size: 12px; color: #64748b; margin-right: 8px;">🎓 ${user.schoolName}</span>` : "";
        const majorStr = user.major ? `<span style="font-size: 12px; color: #64748b;">📚 ${user.major}</span>` : "";
        
        let avatarHtml = "";
        if (user.avatarUrl) {
          avatarHtml = `<img src="${user.avatarUrl}" alt="${user.fullName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`;
        } else {
          avatarHtml = `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #f05a28, #fbbf24); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${getInitials(user.fullName)}</div>`;
        }
        
        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${avatarHtml}
              <div>
                <a href="public-profile.html?userId=${user.userId}" style="font-weight: 600; color: #1e293b; text-decoration: none; font-size: 14px;">${user.fullName}</a>
                <div style="margin-top: 4px;">${schoolStr}${majorStr}</div>
              </div>
            </div>
            ${currentNetworkView === "following" ? 
              `<button class="btn btn-secondary btn-sm" onclick="unfollowUser(${user.userId}, this)">Unfollow</button>` : 
              `<a href="public-profile.html?userId=${user.userId}" class="btn btn-secondary btn-sm">View Profile</a>`
            }
          </div>
        `;
      });
      networkListContainer.innerHTML = html;
      
    } catch (err) {
      console.error("Failed to load network:", err);
      networkListContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">Failed to load data.</div>`;
    }
  }

  const unfollowConfirmModal = document.getElementById("unfollowConfirmModal");
  const cancelUnfollowBtn = document.getElementById("cancelUnfollowBtn");
  const confirmUnfollowBtn = document.getElementById("confirmUnfollowBtn");

  let currentUnfollowUserId = null;
  let currentUnfollowBtnElement = null;

  function openModal(overlay) {
    overlay.classList.add("open");
  }
  function closeModal(overlay) {
    overlay.classList.remove("open");
  }

  if (cancelUnfollowBtn && unfollowConfirmModal) {
    cancelUnfollowBtn.addEventListener("click", function() {
      closeModal(unfollowConfirmModal);
    });
  }

  if (confirmUnfollowBtn && unfollowConfirmModal) {
    confirmUnfollowBtn.addEventListener("click", async function() {
      if (!currentUnfollowUserId || !currentUnfollowBtnElement) return;
      const userId = currentUnfollowUserId;
      const btnElement = currentUnfollowBtnElement;
      
      closeModal(unfollowConfirmModal);
      
      try {
        btnElement.disabled = true;
        btnElement.textContent = "Unfollowing...";
        await del(`/api/users/${userId}/follow`);
        loadNetworkData(); // reload
      } catch(err) {
        console.error(err);
        alert("Failed to unfollow");
        btnElement.disabled = false;
        btnElement.textContent = "Unfollow";
      } finally {
        currentUnfollowUserId = null;
        currentUnfollowBtnElement = null;
      }
    });
  }

  // Handle overlay click to close
  if (unfollowConfirmModal) {
    unfollowConfirmModal.addEventListener("click", function(e) {
      if (e.target === unfollowConfirmModal) {
        closeModal(unfollowConfirmModal);
      }
    });
  }

  window.unfollowUser = function(userId, btnElement) {
    currentUnfollowUserId = userId;
    currentUnfollowBtnElement = btnElement;
    openModal(unfollowConfirmModal);
  };

  // Helper: Format Date String
  function formatDateUploads(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  // --- UPLOADS TAB LOGIC ---
  const uploadsListContainer = document.getElementById("uploadsListContainer");
  
  async function loadUploadsData() {
    if (!uploadsListContainer) return;
    uploadsListContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #64748b;">Loading...</div>`;
    
    // Change container grid style to match public profile
    uploadsListContainer.style.display = "grid";
    uploadsListContainer.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
    uploadsListContainer.style.gap = "20px";
    
    try {
      const userStr = localStorage.getItem("currentUser");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;
      
      const res = await get(`/api/users/${user.userId}/public-documents?size=100`, { skipUnauthorizedRedirect: true });
      const docs = res.data && res.data.content ? res.data.content : [];
      
      if (docs.length === 0) {
        uploadsListContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">You have not uploaded any public documents.</div>`;
        return;
      }
      
      let html = "";
      docs.forEach(doc => {
        const titleText = doc.title || doc.fileName || "Untitled Document";
        let iconHtml = "";
        if (window.getFileTypeIcon) {
            iconHtml = window.getFileTypeIcon(doc.fileType) || "";
        }
        
        let subjectTagHtml = "";
        if (doc.subjectName || doc.subjectCode) {
            const tagText = doc.subjectCode ? `${doc.subjectCode} - ${doc.subjectName}` : doc.subjectName;
            subjectTagHtml = `
            <div class="comm-card-subject-tag">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/>
                </svg>
                <span>${tagText}</span>
            </div>
            `;
        }
        
        html += `
          <a href="document-detail.html?id=${doc.documentId}&from=profile" class="document-card">
            <div class="comm-card-header">
              ${iconHtml}
              <h3 title="${titleText}">${titleText}</h3>
            </div>
            <div class="comm-card-body">
              ${subjectTagHtml}
            </div>
            <div class="comm-card-footer">
              <span class="comm-card-date">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                ${formatDateUploads(doc.createdAt)}
              </span>
              <div class="comm-card-metrics">
                <span class="comm-card-metric-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fbbf24" width="12" height="12"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  <span>${Number(doc.averageRating || 0).toFixed(1)}/5</span>
                </span>
                <span class="comm-card-metric-item">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>${doc.viewCount || 0}</span>
                </span>
              </div>
            </div>
          </a>
        `;
      });
      uploadsListContainer.innerHTML = html;
      
    } catch (err) {
      console.error("Failed to load uploads:", err);
      uploadsListContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #ef4444;">Failed to load documents.</div>`;
    }
  }

  // Handle URL param on load
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab");
  if (initialTab && ["details", "network", "uploads"].includes(initialTab)) {
    switchTab(initialTab);
  } else {
    // Default to details if no tab param or invalid param
    switchTab("details");
  }

});
