/**
 * Study Group List UI controller for AI Study Hub.
 * Handles: list my groups, create group, join group by inviteCode.
 * Relies on group-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // List elements
  const groupLoader = document.getElementById("groupLoader");
  const groupError = document.getElementById("groupError");
  const groupGrid = document.getElementById("groupGrid");
  const groupEmpty = document.getElementById("groupEmpty");

  // Buttons
  const createGroupBtn = document.getElementById("createGroupBtn");
  const joinGroupBtn = document.getElementById("joinGroupBtn");

  // Create modal
  const createModal = document.getElementById("createModal");
  const createGroupName = document.getElementById("createGroupName");
  const createGroupDescription = document.getElementById("createGroupDescription");
  const createError = document.getElementById("createError");
  const createCancelBtn = document.getElementById("createCancelBtn");
  const createConfirmBtn = document.getElementById("createConfirmBtn");

  // Join modal
  const joinModal = document.getElementById("joinModal");
  const joinInviteCode = document.getElementById("joinInviteCode");
  const joinError = document.getElementById("joinError");
  const joinCancelBtn = document.getElementById("joinCancelBtn");
  const joinConfirmBtn = document.getElementById("joinConfirmBtn");

  // Accessibility Focus tracking element footprint cache container
  let lastActiveElement = null;

  function openModal(overlay) {
    lastActiveElement = document.activeElement;
    overlay.classList.add("open");

    // Accessibility dialog configurations enforcement attributes
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    // Focus Trap initial capture configuration
    const focusableInputs = overlay.querySelectorAll('input, select, textarea, button, [tabindex="0"]');
    if (focusableInputs.length > 0) {
      setTimeout(() => focusableInputs[0].focus(), 50);
    }
  }

  function closeModal(overlay) {
    overlay.classList.remove("open");
    // Accessibility Rule: Focus Return mechanism execution pass
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      lastActiveElement.focus();
    }
  }

  function setupFocusTrap(modal) {
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;

      const focusableElements = modal.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    });
  }

  setupFocusTrap(createModal);
  setupFocusTrap(joinModal);

  function showError(el, message) {
    el.textContent = message;
    el.style.display = "block";
  }

  function hideError(el) {
    el.textContent = "";
    el.style.display = "none";
  }

  // Global Keyboard Navigation Escape key capture routing pipeline
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const createModal = document.getElementById("createModal");
      const joinModal = document.getElementById("joinModal");
      [createModal, joinModal].forEach(overlay => {
        if (overlay && overlay.classList.contains("open")) {
          closeModal(overlay);
        }
      });
    }
  });

  // Group list rendering

  function navigateToGroup(groupId) {
    window.location.href = `group-detail.html?id=${groupId}`;
  }

  function createGroupCard(group) {
    // Step 8A Rule: Use anchor elements <a> for navigable structural resource components
    const card = document.createElement("a");
    card.className = "folder-card";
    card.href = `group-detail.html?id=${group.groupId}`;
    card.style.textDecoration = "none";
    card.style.color = "inherit";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = group.groupName || "Untitled Group";

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    // Standarize roles visibility mappings safely
    const roleText = group.role ? group.role.toUpperCase() : "MEMBER";
    const memberCount = group.memberCount ?? 0;
    const docCount = group.documentCount ?? 0;
    const folderCount = group.folderCount ?? 0;
    meta.innerHTML = `Role: <strong>${roleText}</strong> &middot; Members: ${memberCount} &middot; Docs: ${docCount} &middot; Folders: ${folderCount}`;

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, name, meta);

    card.appendChild(main);

    // Prevent full reload block if open modifier keys are combined
    card.addEventListener("click", function (e) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateToGroup(group.groupId);
      }
    });

    return card;
  }

  // Loads and renders the current user's groups.
  async function loadGroups() {
    groupLoader.style.display = "flex";
    groupGrid.style.display = "none";
    groupEmpty.style.display = "none";
    hideError(groupError);

    try {
      const result = await getMyGroups();
      const groups = Array.isArray(result.data) ? result.data : [];

      groupLoader.style.display = "none";

      if (groups.length === 0) {
        groupEmpty.style.display = "block";
        return;
      }

      groupGrid.innerHTML = "";
      groups.forEach(function (group) {
        groupGrid.appendChild(createGroupCard(group));
      });
      groupGrid.style.display = "grid";

    } catch (error) {
      groupLoader.style.display = "none";
      showError(groupError, error.message || "Failed to load groups.");
    }
  }

  // Create group

  function openCreateModal() {
    createGroupName.value = "";
    createGroupDescription.value = "";
    hideError(createError);
    openModal(createModal);
    createGroupName.focus();
  }

  createGroupBtn.addEventListener("click", openCreateModal);
  createCancelBtn.addEventListener("click", function () { closeModal(createModal); });

  createConfirmBtn.addEventListener("click", async function () {
    const groupName = createGroupName.value.trim();
    const description = createGroupDescription.value.trim();

    if (!groupName) {
      showError(createError, "Group name is required.");
      return;
    }

    createConfirmBtn.disabled = true;
    hideError(createError);

    try {
      await createGroup({ groupName, description });
      closeModal(createModal);
      showToast("Group created successfully.", "success");
      await loadGroups();
    } catch (error) {
      showError(createError, error.message || "Failed to create group.");
    } finally {
      createConfirmBtn.disabled = false;
    }
  });

  createGroupName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") createConfirmBtn.click();
  });

  // Join group

  function openJoinModal() {
    joinInviteCode.value = "";
    hideError(joinError);
    openModal(joinModal);
    joinInviteCode.focus();
  }

  joinGroupBtn.addEventListener("click", openJoinModal);
  joinCancelBtn.addEventListener("click", function () { closeModal(joinModal); });

  joinConfirmBtn.addEventListener("click", async function () {
    const inviteCode = joinInviteCode.value.trim();

    if (!inviteCode) {
      showError(joinError, "Invite code is required.");
      return;
    }

    joinConfirmBtn.disabled = true;
    hideError(joinError);

    try {
      await joinGroup(inviteCode);
      closeModal(joinModal);
      showToast("Joined group successfully.", "success");
      await loadGroups();
    } catch (error) {
      // Backend returns a business error when the user is already a member,
      // or when the inviteCode does not exist. Show backend message as-is.
      showError(joinError, error.message || "Failed to join group.");
    } finally {
      joinConfirmBtn.disabled = false;
    }
  });

  joinInviteCode.addEventListener("keydown", function (e) {
    if (e.key === "Enter") joinConfirmBtn.click();
  });

  // Close modals on overlay click

  [createModal, joinModal].forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // Init
  await loadGroups();
});
