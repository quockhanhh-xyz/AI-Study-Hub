/**
 * Public Profile Page Controller
 */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  // Check authentication status
  let isAuthenticated = false;
  if (window.authReady) {
    isAuthenticated = await window.authReady;
  }

  // Get target userId from query string
  const urlParams = new URLSearchParams(window.location.search);
  const userIdStr = urlParams.get("userId");
  if (!userIdStr) {
    window.location.href = "dashboard.html";
    return;
  }
  const targetUserId = parseInt(userIdStr, 10);

  // DOM Elements
  const profileLoading = document.getElementById("profileLoading");
  const profilePrivateAlert = document.getElementById("profilePrivateAlert");
  const profileContainer = document.getElementById("profileContainer");

  const avatarEl = document.getElementById("profileAvatar");
  const fullNameEl = document.getElementById("profileFullName");
  const schoolNameEl = document.getElementById("profileSchoolName");
  const majorEl = document.getElementById("profileMajor");
  const bioEl = document.getElementById("profileBio");
  const joinedDateEl = document.getElementById("profileJoinedDate");
  const roleBadgeEl = document.getElementById("profileRoleBadge");

  const metaSchoolRow = document.getElementById("metaSchoolRow");
  const metaMajorRow = document.getElementById("metaMajorRow");

  const statPublicDocs = document.getElementById("statPublicDocs");
  const statFollowers = document.getElementById("statFollowers");
  const statFollowing = document.getElementById("statFollowing");
  const statUpvotes = document.getElementById("statUpvotes");

  const actionContainer = document.getElementById("profileActionContainer");

  const docSearch = document.getElementById("docSearch");
  const docSubject = document.getElementById("docSubject");
  const docFileType = document.getElementById("docFileType");

  const docsLoading = document.getElementById("docsLoading");
  const docsGrid = document.getElementById("docsGrid");
  const docsEmptyState = document.getElementById("docsEmptyState");
  const docsPagination = document.getElementById("docsPagination");

  // State
  let currentPage = 0;
  const pageSize = 12;
  let currentProfile = null;

  // Formatting date helper
  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function getInitials(fullName) {
    const names = (fullName || "User").trim().split(/\s+/);
    if (names.length > 1) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names.length > 0 && names[0] ? names[0][0].toUpperCase() : "U";
  }

  // Load target public profile
  async function loadProfile() {
    try {
      const response = await window.profileApi.getPublicProfile(targetUserId);
      if (response && response.success && response.data) {
        currentProfile = response.data;
        renderProfile(currentProfile);
        profileLoading.style.display = "none";
        profileContainer.style.display = "block";
        await loadSubjects();
        if (typeof docFileType !== "undefined" && docFileType) {
          docFileType.dispatchEvent(new Event("syncCustom"));
        }
        loadDocuments();
      } else {
        showPrivateProfileAlert();
      }
    } catch (error) {
      console.error("Error fetching public profile:", error);
      showPrivateProfileAlert();
    }
  }

  function showPrivateProfileAlert() {
    profileLoading.style.display = "none";
    profilePrivateAlert.style.display = "block";
    profileContainer.style.display = "none";
  }

  // Render profile metadata
  function renderProfile(profile) {
    fullNameEl.textContent = profile.fullName;
    joinedDateEl.textContent = formatDate(profile.joinedAt);

    // Avatar
    if (profile.avatarUrl) {
      avatarEl.innerHTML = `<img src="${profile.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar" />`;
    } else {
      avatarEl.textContent = getInitials(profile.fullName);
    }

    // Role badge
    roleBadgeEl.textContent = profile.userId === 1 ? "System Administrator" : "Contributor Member";

    // Bio
    if (profile.bio) {
      bioEl.textContent = profile.bio;
      bioEl.style.display = "block";
    } else {
      bioEl.style.display = "none";
    }

    // School Name
    if (profile.schoolName) {
      schoolNameEl.textContent = profile.schoolName;
      metaSchoolRow.style.display = "flex";
    } else {
      metaSchoolRow.style.display = "none";
    }

    // Major
    if (profile.major) {
      majorEl.textContent = profile.major;
      metaMajorRow.style.display = "flex";
    } else {
      metaMajorRow.style.display = "none";
    }

    // Statistics
    statPublicDocs.textContent = profile.publicDocumentCount;
    statFollowers.textContent = profile.followersCount;
    statFollowing.textContent = profile.followingCount;
    statUpvotes.textContent = profile.upvotesCount || 0;

    // Follow / Unfollow Actions
    renderFollowButton(profile);
  }

  function renderFollowButton(profile) {
    actionContainer.innerHTML = "";

    if (profile.isMyProfile) {
      const badge = document.createElement("span");
      badge.className = "status-box status-info";
      badge.style.margin = "0";
      badge.textContent = "My Profile";
      actionContainer.appendChild(badge);
      return;
    }

    if (!isAuthenticated) {
      const loginBtn = document.createElement("a");
      loginBtn.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      loginBtn.className = "btn btn-primary";
      loginBtn.textContent = "Log in to Follow";
      actionContainer.appendChild(loginBtn);
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    if (profile.followedByMe) {
      btn.className = "btn btn-secondary";
      btn.style.background = "#fee2e2";
      btn.style.borderColor = "#fecaca";
      btn.style.color = "#ef4444";
      btn.textContent = "Unfollow";
      btn.addEventListener("click", () => handleFollowToggle(false));
    } else {
      btn.className = "btn btn-primary";
      btn.textContent = "Follow";
      btn.addEventListener("click", () => handleFollowToggle(true));
    }
    actionContainer.appendChild(btn);
  }

  async function handleFollowToggle(shouldFollow) {
    try {
      let response;
      if (shouldFollow) {
        response = await window.profileApi.followUser(targetUserId);
      } else {
        response = await window.profileApi.unfollowUser(targetUserId);
      }

      if (response && response.success && response.data) {
        currentProfile.followedByMe = response.data.followedByMe;
        currentProfile.followersCount = response.data.followersCount;
        statFollowers.textContent = currentProfile.followersCount;
        renderFollowButton(currentProfile);

        if (typeof window.showToast === "function") {
          window.showToast(shouldFollow ? "Following contributor." : "Unfollowed contributor.", "success");
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      if (typeof window.showToast === "function") {
        window.showToast(error.message || "Failed to toggle follow. Please try again.", "error");
      }
    }
  }

  // Load public subjects
  async function loadSubjects() {
    try {
      const response = await get("/api/subjects/public", { skipUnauthorizedRedirect: true });
        response.data.forEach(sub => {
          const opt = document.createElement("option");
          opt.value = sub.subjectId;
          opt.textContent = sub.subjectCode ? `${sub.subjectCode} - ${sub.subjectName}` : sub.subjectName;
          docSubject.appendChild(opt);
        });
        if (typeof docSubject !== "undefined" && docSubject) {
          docSubject.dispatchEvent(new Event("syncCustom"));
        }
      }
    } catch (e) {
      console.warn("Failed to load subjects dropdown:", e);
    }
  }

  // Load public documents list
  async function loadDocuments() {
    docsLoading.style.display = "block";
    docsGrid.style.display = "none";
    docsEmptyState.style.display = "none";
    docsPagination.innerHTML = "";

    const params = {
      page: currentPage,
      size: pageSize,
      subjectId: docSubject.value || null,
      fileType: docFileType.value || null,
      keyword: docSearch.value.trim() || null
    };

    try {
      const response = await window.profileApi.getPublicDocuments(targetUserId, params);
      docsLoading.style.display = "none";

      if (response && response.success && response.data && response.data.content && response.data.content.length > 0) {
        renderDocuments(response.data.content);
        renderPagination(response.data.totalPages);
        docsGrid.style.display = "grid";
      } else {
        docsEmptyState.style.display = "block";
      }
    } catch (error) {
      console.error("Error fetching public documents:", error);
      docsLoading.style.display = "none";
      docsEmptyState.style.display = "block";
    }
  }

  function renderDocuments(docs) {
    docsGrid.innerHTML = "";

    docs.forEach(doc => {
      const card = document.createElement("a");
      card.className = "document-card";
      card.href = `document-detail.html?id=${doc.documentId}&from=community`;

      // Header: File type icon + title
      const header = document.createElement("div");
      header.className = "comm-card-header";

      const iconContainer = document.createElement("div");
      if (window.getFileTypeIcon) {
        iconContainer.innerHTML = window.getFileTypeIcon(doc.fileType);
      }
      const iconWrapper = iconContainer.firstElementChild;
      if (iconWrapper) {
        iconWrapper.style.width = "20px";
        iconWrapper.style.height = "20px";
        header.appendChild(iconWrapper);
      }

      const titleEl = document.createElement("h3");
      titleEl.textContent = doc.title || doc.fileName || "Untitled Document";
      titleEl.title = doc.title || doc.fileName;
      header.appendChild(titleEl);
      card.appendChild(header);

      // Body: Subject tag
      const body = document.createElement("div");
      body.className = "comm-card-body";

      if (doc.subjectName || doc.subjectCode) {
        const subjectTag = document.createElement("div");
        subjectTag.className = "comm-card-subject-tag";
        const tagText = doc.subjectCode ? `${doc.subjectCode} - ${doc.subjectName}` : doc.subjectName;
        subjectTag.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/>
          </svg>
          <span>${tagText}</span>
        `;
        body.appendChild(subjectTag);
      }
      card.appendChild(body);

      // Footer: Date & Views
      const footer = document.createElement("div");
      footer.className = "comm-card-footer";

      const dateSpan = document.createElement("span");
      dateSpan.className = "comm-card-date";
      dateSpan.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        ${formatDate(doc.createdAt)}
      `;
      footer.appendChild(dateSpan);

      const metricsDiv = document.createElement("div");
      metricsDiv.className = "comm-card-metrics";

      const viewsSpan = document.createElement("span");
      viewsSpan.className = "comm-card-metric-item";
      viewsSpan.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>${doc.viewCount || 0}</span>
      `;
      metricsDiv.appendChild(viewsSpan);
      footer.appendChild(metricsDiv);
      card.appendChild(footer);

      docsGrid.appendChild(card);
    });
  }

  function renderPagination(totalPages) {
    docsPagination.innerHTML = "";
    if (totalPages <= 1) return;

    for (let i = 0; i < totalPages; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm " + (i === currentPage ? "btn-primary" : "btn-secondary");
      btn.textContent = i + 1;
      btn.addEventListener("click", () => {
        currentPage = i;
        loadDocuments();
      });
      docsPagination.appendChild(btn);
    }
  }

  // Filter Event Listeners
  let searchDebounce = null;
  docSearch.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentPage = 0;
      loadDocuments();
    }, 400);
  });

  docSubject.addEventListener("change", () => {
    currentPage = 0;
    loadDocuments();
  });

  docFileType.addEventListener("change", () => {
    currentPage = 0;
    loadDocuments();
  });

  // Startup Load
  await loadProfile();
});
