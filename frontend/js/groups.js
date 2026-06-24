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

  // Modal helpers

  function openModal(overlay) { overlay.classList.add("open"); }
  function closeModal(overlay) { overlay.classList.remove("open"); }

  function showError(el, message) {
    el.textContent = message;
    el.style.display = "block";
  }

  function hideError(el) {
    el.textContent = "";
    el.style.display = "none";
  }

  // Group list rendering

  function navigateToGroup(groupId) {
    window.location.href = `group-detail.html?id=${groupId}`;
  }

  function createGroupCard(group) {
    const card = document.createElement("div");
    card.className = "folder-card";
    card.style.cursor = "pointer";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = group.groupName || "Untitled Group";

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    // API GET /api/groups/my only returns: groupId, groupName, description,
    // inviteCode, ownerId, status, role — there is no memberCount field.
    meta.textContent = group.role || "";

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, name, meta);

    card.appendChild(main);

    card.addEventListener("click", function () {
      navigateToGroup(group.groupId);
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
