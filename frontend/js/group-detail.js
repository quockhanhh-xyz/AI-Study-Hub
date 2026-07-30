/**
 * Study Group Detail UI controller for AI Study Hub.
 * Handles: group info, member list, role-based actions (edit/delete/remove/leave),
 * group documents list with conditional Revoke action.
 * Relies on group-api.js and share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const groupId = getGroupIdFromUrl();

  if (!groupId) {
    window.location.href = "groups.html";
    return;
  }

  // Page elements
  const detailLoader = document.getElementById("detailLoader");
  const detailError = document.getElementById("detailError");
  const groupDetailContent = document.getElementById("groupDetailContent");

  const groupNameHeader = document.getElementById("groupNameHeader");
  const groupNameTitle = document.getElementById("groupNameTitle");
  const groupDescription = document.getElementById("groupDescription");
  const groupInviteCode = document.getElementById("groupInviteCode");
  const groupMyRole = document.getElementById("groupMyRole");

  const editGroupBtn = document.getElementById("editGroupBtn");
  const leaveGroupBtn = document.getElementById("leaveGroupBtn");
  const deleteGroupBtn = document.getElementById("deleteGroupBtn");

  const memberList = document.getElementById("memberList");

  const pendingMemberSection = document.getElementById("pendingMemberSection");
  const pendingMemberLoader = document.getElementById("pendingMemberLoader");
  const pendingMemberError = document.getElementById("pendingMemberError");
  const pendingMemberList = document.getElementById("pendingMemberList");
  const pendingMemberEmpty = document.getElementById("pendingMemberEmpty");

  const docLoader = document.getElementById("docLoader");
  const docError = document.getElementById("docError");
  const docGrid = document.getElementById("docGrid");
  const docEmpty = document.getElementById("docEmpty");
  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  // Group Detail Tabs (Members / Documents / Folders / Chat)
  const groupTabButtons = document.querySelectorAll("#groupTabHeader .tab-btn[data-tab]");
  const groupTabPanels = {
    members: document.getElementById("groupTabPanelMembers"),
    documents: document.getElementById("groupTabPanelDocuments"),
    folders: document.getElementById("groupTabPanelFolders"),
    chat: document.getElementById("groupTabPanelChat"),
  };

  // Invite Modal
  const inviteMemberBtn = document.getElementById("inviteMemberBtn");
  const inviteMemberModal = document.getElementById("inviteMemberModal");
  const closeInviteMemberModalBtn = document.getElementById("closeInviteMemberModal");
  const cancelInviteMemberBtn = document.getElementById("cancelInviteMemberBtn");
  const confirmInviteMemberBtn = document.getElementById("confirmInviteMemberBtn");
  const inviteMemberForm = document.getElementById("inviteMemberForm");
  const inviteEmailInput = document.getElementById("inviteEmailInput");
  const inviteDescriptionInput = document.getElementById("inviteDescriptionInput");
  const inviteMemberError = document.getElementById("inviteMemberError");
  const pendingInvitesSection = document.getElementById("pendingInvitesSection");
  const pendingInvitesLoader = document.getElementById("pendingInvitesLoader");
  const pendingInvitesError = document.getElementById("pendingInvitesError");
  const pendingInvitesList = document.getElementById("pendingInvitesList");

  // Share Modal
  const shareDocBtn = document.getElementById("shareDocBtn");
  const shareModal = document.getElementById("shareModal");
  const closeShareModalBtn = document.getElementById("closeShareModal");
  const cancelShareBtn = document.getElementById("cancelShareBtn");
  const confirmShareBtn = document.getElementById("confirmShareBtn");
  const shareItemSelect = document.getElementById("shareItemSelect");
  if (window.UIHelper && typeof window.UIHelper.convertSelectToCustomDropdown === 'function') {
    window.UIHelper.convertSelectToCustomDropdown(shareItemSelect);
  }
  const shareModalError = document.getElementById("shareModalError");
  let isChatTabInitialized = false;
  const chatLoader = document.getElementById("chatLoader");
  const chatError = document.getElementById("chatError");
  const chatEmpty = document.getElementById("chatEmpty");
  const chatMessageList = document.getElementById("chatMessageList");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");

  let chatMessages = [];
  let isSendingMessage = false;
  let chatAccessBlocked = false;

  // Edit modal
  const editModal = document.getElementById("editModal");
  const editGroupName = document.getElementById("editGroupName");
  const editGroupDescription = document.getElementById("editGroupDescription");
  const editError = document.getElementById("editError");
  const editCancelBtn = document.getElementById("editCancelBtn");
  const editConfirmBtn = document.getElementById("editConfirmBtn");

  // Delete modal
  const deleteModal = document.getElementById("deleteModal");
  const deleteError = document.getElementById("deleteError");
  const deleteCancelBtn = document.getElementById("deleteCancelBtn");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  // State
  let currentGroup = null;
  let myRole = null; // "OWNER" | "MEMBER"
  let lastActiveElement = null;

  // URL helper

  function getGroupIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  // Modal helpers

  function openModal(overlay) {
    lastActiveElement = document.activeElement;
    overlay.classList.add("open");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const focusable = overlay.querySelectorAll('input, select, textarea, button, [tabindex="0"]');
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }
  }

  function closeModal(overlay) {
    overlay.classList.remove("open");
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

  function showError(el, message) {
    el.textContent = message;
    el.style.display = "block";
  }

  function hideError(el) {
    el.textContent = "";
    el.style.display = "none";
  }

  // Step 13: detects backend quota errors (e.g. owned group limit) so we can
  // route them through the shared showQuotaError() helper.
  function isQuotaError(error) {
    return !!(error && typeof error.code === "string" && /LIMIT_EXCEEDED|QUOTA_EXCEEDED/.test(error.code));
  }

  // Resolves current user's id from session storage cached by layout.js / auth.js.
  function getCurrentUserId() {
    try {
      const raw = localStorage.getItem("currentUser");
      const user = JSON.parse(raw || "{}");
      return user.userId || null;
    } catch (e) {
      return null;
    }
  }

  // Group info rendering

  function renderGroupInfo(group) {
    currentGroup = group;
    myRole = group.currentUserRole || group.role || group.myRole || null;

    groupNameHeader.textContent = group.groupName || "Group";
    const groupNameTitleHeader = document.getElementById("groupNameTitleHeader");
    if (groupNameTitleHeader) {
      groupNameTitleHeader.textContent = group.groupName || "Untitled Group";
    }
    if (groupNameTitle) {
      groupNameTitle.textContent = group.groupName || "Untitled Group";
    }
    groupDescription.textContent = group.description || "No description provided.";

    // Step 8A Refactor: Add click-to-copy functionality for invite code
    groupInviteCode.textContent = group.inviteCode || "-";
    if (group.inviteCode && group.inviteCode !== "-") {
      groupInviteCode.style.cursor = "pointer";
      groupInviteCode.title = "Click to copy invite code";
      groupInviteCode.tabIndex = 0;

      groupInviteCode.onclick = function () {
        navigator.clipboard.writeText(group.inviteCode)
          .then(() => {
            showToast("Invitation code copied to clipboard!", "success");
          })
          .catch(err => {
            console.error("Clipboard copy failed:", err);
            showToast("Failed to copy invite code.", "error");
          });
      };

      groupInviteCode.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigator.clipboard.writeText(group.inviteCode)
            .then(() => {
              showToast("Invitation code copied to clipboard!", "success");
            })
            .catch(err => {
              console.error("Clipboard copy failed:", err);
              showToast("Failed to copy invite code.", "error");
            });
        }
      };
    } else {
      groupInviteCode.style.cursor = "";
      groupInviteCode.title = "";
      groupInviteCode.removeAttribute("tabindex");
      groupInviteCode.onclick = null;
      groupInviteCode.onkeydown = null;
    }

    const displayRole = myRole || "MEMBER";
    groupMyRole.textContent = displayRole;

    const memberCount = group.memberCount !== undefined && group.memberCount !== null ? group.memberCount : (group.members ? group.members.length : 0);
    const docCount = group.documentCount !== undefined && group.documentCount !== null ? group.documentCount : 0;
    const folderCount = group.folderCount !== undefined && group.folderCount !== null ? group.folderCount : 0;

    const groupCounts = document.getElementById("groupCounts");
    if (groupCounts) {
      groupCounts.innerHTML = `&middot; <strong>${memberCount}</strong> Members &middot; <strong>${docCount}</strong> Documents &middot; <strong>${folderCount}</strong> Folders`;
    }

    // Step 8A Refactor: Update member count in the list section header
    const memberSectionTitle = document.getElementById("memberSectionTitle");
    if (memberSectionTitle) {
      memberSectionTitle.textContent = `Members (${memberCount})`;
    }

    // Apply real color classes to groupMyRole badge based on feedback
    groupMyRole.classList.remove("badge", "badge-primary", "badge-role-owner", "badge-role-member");
    groupMyRole.classList.add(displayRole === "OWNER" ? "badge-role-owner" : "badge-role-member");

    const isOwner = myRole === "OWNER";

    // OWNER-only actions
    editGroupBtn.style.display = isOwner ? "flex" : "none";
    const dangerZoneSection = document.getElementById("dangerZoneSection");
    if (dangerZoneSection) {
      dangerZoneSection.style.display = isOwner ? "block" : "none";
    }
    deleteGroupBtn.style.display = isOwner ? "inline-flex" : "none";
    
    inviteMemberBtn.style.display = isOwner ? "inline-flex" : "none";
    pendingInvitesSection.style.display = isOwner ? "block" : "none";

    // MEMBER-only action (OWNER does not use leave in MVP)
    leaveGroupBtn.style.display = !isOwner ? "inline-flex" : "none";
  }

  // Member list rendering

  function createMemberRow(member) {
    const row = document.createElement("div");
    row.className = "member-row";

    const main = document.createElement("div");
    main.className = "member-row-main";

    const name = document.createElement("span");
    name.className = "member-row-name";
    name.textContent = member.fullName || member.displayName || "Unknown User";

    const roleBadge = document.createElement("span");
    const isMemberOwner = member.role === "OWNER";
    roleBadge.className = isMemberOwner ? "badge-role-owner" : "badge-role-member";
    if (isMemberOwner) {
      roleBadge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" aria-hidden="true" focusable="false" style="vertical-align:-1px;margin-right:3px;"><path fill="currentColor" d="M3 19h18v2H3v-2zm.5-12 4 3 4.5-6 4.5 6 4-3-2 9H5.5l-2-9z"></path></svg>OWNER';
    } else {
      roleBadge.textContent = "MEMBER";
    }

    main.append(name, roleBadge);
    row.appendChild(main);

    // Only the OWNER can remove members, and never themselves.
    if (myRole === "OWNER" && member.role !== "OWNER") {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-danger btn-sm";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", async function () {
        const confirmed = await confirmAction({
          title: "Remove Member?",
          message: `Remove ${member.fullName || member.displayName || "this member"} from this group? They will immediately lose access to this group's documents and folders.`,
          confirmText: "Remove",
          danger: true
        });
        if (!confirmed) return;

        removeBtn.disabled = true;
        removeBtn.textContent = "Removing...";

        try {
          await removeGroupMember(groupId, member.userId);
          showToast(`${member.fullName || member.displayName || "Member"} removed from the group.`, "success");
          await loadGroupDetail();
        } catch (error) {
          showToast(error.message || "Failed to remove member.", "error");
          removeBtn.disabled = false;
          removeBtn.textContent = "Remove";
        }
      });
      row.appendChild(removeBtn);
    }

    return row;
  }

  function renderMembers(members) {
    memberList.innerHTML = "";
    const activeMembers = members.filter(member => member.status === "ACTIVE" || !member.status);
    activeMembers.forEach(function (member) {
      memberList.appendChild(createMemberRow(member));
    });

    const memberSectionTitle = document.getElementById("memberSectionTitle");
    if (memberSectionTitle) {
      memberSectionTitle.textContent = `Members (${activeMembers.length})`;
    }
  }

  function createPendingMemberRow(member) {
    const row = document.createElement("div");
    row.className = "member-row";

    const main = document.createElement("div");
    main.className = "member-row-main";

    const name = document.createElement("span");
    name.className = "member-row-name";
    name.textContent = member.fullName || member.displayName || "Unknown User";

    const statusBadge = document.createElement("span");
    statusBadge.className = "badge-role-member";
    statusBadge.style.color = "var(--warning, #b45309)";
    statusBadge.textContent = "PENDING";

    main.append(name, statusBadge);
    row.appendChild(main);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.className = "btn btn-primary btn-sm";
    approveBtn.textContent = "Approve";

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "btn btn-danger btn-sm";
    rejectBtn.textContent = "Reject";

    approveBtn.addEventListener("click", async function () {
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
      approveBtn.textContent = "Approving...";
      try {
        await approveGroupMember(groupId, member.userId);
        showToast(`${member.fullName || member.displayName || "Member"} approved.`, "success");
        await loadPendingMembers();
        await loadGroupDetail();
      } catch (error) {
        showToast(error.message || "Failed to approve member.", "error");
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        approveBtn.textContent = "Approve";
      }
    });

    rejectBtn.addEventListener("click", async function () {
      const confirmed = await confirmAction({
        title: "Reject Join Request?",
        message: `Reject ${member.fullName || member.displayName || "this user"}'s request to join this group?`,
        confirmText: "Reject",
        danger: true
      });
      if (!confirmed) return;

      approveBtn.disabled = true;
      rejectBtn.disabled = true;
      rejectBtn.textContent = "Rejecting...";
      try {
        await rejectGroupMember(groupId, member.userId);
        showToast(`${member.fullName || member.displayName || "Member"} rejected.`, "success");
        await loadPendingMembers();
        await loadGroupDetail();
      } catch (error) {
        showToast(error.message || "Failed to reject member.", "error");
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        rejectBtn.textContent = "Reject";
      }
    });

    actions.append(approveBtn, rejectBtn);
    row.appendChild(actions);

    return row;
  }

  function renderPendingMembers(members) {
    pendingMemberList.innerHTML = "";

    const pendingMemberSectionTitle = document.getElementById("pendingMemberSectionTitle");
    if (pendingMemberSectionTitle) {
      pendingMemberSectionTitle.textContent = `Pending Requests (${members.length})`;
    }

    if (members.length === 0) {
      pendingMemberList.style.display = "none";
      pendingMemberEmpty.style.display = "block";
    } else {
      pendingMemberList.style.display = "block";
      pendingMemberEmpty.style.display = "none";
      members.forEach(function (member) {
        pendingMemberList.appendChild(createPendingMemberRow(member));
      });
    }
  }

  function createPendingInviteRow(invite) {
    const row = document.createElement("div");
    row.className = "member-row";

    const main = document.createElement("div");
    main.className = "member-row-main";

    const name = document.createElement("span");
    name.className = "member-row-name";
    name.textContent = invite.email;

    const statusBadge = document.createElement("span");
    statusBadge.className = "badge-role-member";
    statusBadge.style.color = "var(--primary, #2563eb)";
    statusBadge.textContent = "INVITED";

    main.append(name, statusBadge);
    row.appendChild(main);
    
    // Add Revoke Button
    const actions = document.createElement("div");
    actions.className = "member-actions";

    const revokeBtn = document.createElement("button");
    revokeBtn.className = "btn btn-danger btn-sm";
    revokeBtn.textContent = "Revoke";
    revokeBtn.style.padding = "4px 8px";
    revokeBtn.style.fontSize = "12px";

    revokeBtn.addEventListener("click", () => {
      const modal = document.getElementById("revokeInviteModal");
      const confirmBtn = document.getElementById("confirmRevokeBtn");
      const cancelBtn = document.getElementById("cancelRevokeBtn");

      const onConfirm = async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Revoking...";
        try {
          await del(`/api/group-invites/${invite.id}/revoke`);
          showToast("Invitation revoked successfully", "success");
          await loadPendingInvites();
        } catch (error) {
          showToast(error.message || "Failed to revoke invitation", "danger");
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Revoke Invitation";
          closeModal(modal);
          cleanup();
        }
      };

      const onCancel = () => {
        closeModal(modal);
        cleanup();
      };

      const cleanup = () => {
        confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn.removeEventListener("click", onCancel);
      };

      confirmBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);
      
      openModal(modal);
    });

    actions.appendChild(revokeBtn);
    row.appendChild(actions);

    return row;
  }

  async function loadPendingInvites() {
    if (myRole !== "OWNER") {
      pendingInvitesSection.style.display = "none";
      return;
    }
    
    pendingInvitesLoader.style.display = "flex";
    pendingInvitesList.style.display = "none";
    hideError(pendingInvitesError);
    
    try {
      const response = await get(`/api/group-invites/groups/${groupId}/invites`);
      const groupInvites = response.data || [];
      
      pendingInvitesLoader.style.display = "none";
      pendingInvitesList.innerHTML = "";
      
      if (groupInvites.length === 0) {
        pendingInvitesSection.style.display = "none";
      } else {
        pendingInvitesSection.style.display = "block";
        pendingInvitesList.style.display = "block";
        groupInvites.forEach(inv => {
          pendingInvitesList.appendChild(createPendingInviteRow(inv));
        });
      }
    } catch (error) {
      pendingInvitesLoader.style.display = "none";
      showError(pendingInvitesError, error.message || "Failed to load pending invitations.");
    }
  }

  async function loadPendingMembers() {
    // Only the OWNER can see and manage pending join requests.
    if (myRole !== "OWNER") {
      pendingMemberSection.style.display = "none";
      return;
    }

    pendingMemberSection.style.display = "block";
    pendingMemberLoader.style.display = "flex";
    pendingMemberList.style.display = "none";
    pendingMemberEmpty.style.display = "none";
    hideError(pendingMemberError);

    try {
      const result = await getPendingMembers(groupId);
      const pendingMembers = Array.isArray(result.data) ? result.data : [];
      pendingMemberLoader.style.display = "none";
      renderPendingMembers(pendingMembers);
    } catch (error) {
      pendingMemberLoader.style.display = "none";
      // The endpoint has not been implemented by BE2 yet (returns 401/404).
      //Hide the entire section instead of showing a misleading error message, and never let 401 errors surface to the UI.
      if (error.status === 401 || error.status === 404) {
        pendingMemberSection.style.display = "none";
        return;
      }
      showError(pendingMemberError, error.message || "Failed to load pending requests.");
    }
  }

  // Group documents rendering

  function createDocCard(doc) {
    const card = document.createElement("article");
    card.className = "document-card";

    // Left Column: Contributor Avatar instead of file type icon
    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "contributor-avatar";
    const contributorName = doc.sharedByName || doc.uploadedByName || doc.ownerName || doc.displayName || doc.uploadedBy || "Unknown User";
    avatarWrapper.textContent = contributorName.trim().charAt(0).toUpperCase();
    avatarWrapper.title = `Uploaded by: ${contributorName}`;
    if (doc.sharedByUserId) {
      avatarWrapper.classList.add("uploader-link");
      avatarWrapper.dataset.userId = doc.sharedByUserId;
      avatarWrapper.style.cursor = "pointer";
    }
    card.appendChild(avatarWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const titleEl = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${doc.documentId}&from=group&groupId=${groupId}&tab=documents`;
    titleLink.textContent = doc.title || doc.originalFileName || "Untitled";
    titleLink.style.color = "inherit";
    titleLink.style.textDecoration = "none";
    titleEl.appendChild(titleLink);
    header.appendChild(titleEl);

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const formatDate = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    };

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatDate(doc.createdAt)}`;
    meta.append(dateItem);

    const uploaderItem = document.createElement("span");
    uploaderItem.className = "document-meta-item";
    uploaderItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Uploaded by: `;

    const strongEl = document.createElement("strong");
    strongEl.textContent = contributorName;
    if (doc.sharedByUserId) {
      strongEl.className = "uploader-link";
      strongEl.dataset.userId = doc.sharedByUserId;
      strongEl.style.cursor = "pointer";
      strongEl.style.textDecoration = "underline";
      strongEl.style.color = "var(--primary)";
    }
    uploaderItem.appendChild(strongEl);
    meta.append(uploaderItem);

    content.append(header, meta);
    card.appendChild(content);

    // Revoke is shown strictly based on backend's canRevoke flag
    if (doc.canRevoke === true) {
      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.className = "btn-revoke-inline";
      revokeBtn.textContent = "Revoke";
      revokeBtn.addEventListener("click", async function (e) {
        e.stopPropagation(); // Prevent card click event from navigating
        const confirmed = await confirmAction({
          title: "Revoke Document?",
          message: "This document will no longer be shared with this group.",
          confirmText: "Revoke",
          danger: true
        });
        if (!confirmed) return;

        try {
          await revokeGroupDocumentShare(doc.shareId);
          showToast("Document revoked from group.", "success");
          await loadGroupDocuments();
        } catch (error) {
          showToast(error.message || "Failed to revoke document.", "error");
        }
      });
      card.appendChild(revokeBtn);
    }

    card.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) {
        return;
      }
      window.location.href = `document-detail.html?id=${doc.documentId}&from=group&groupId=${groupId}`;
    });

    return card;
  }

  async function loadGroupDocuments() {
    docLoader.style.display = "flex";
    docGrid.style.display = "none";
    docEmpty.style.display = "none";
    hideError(docError);

    try {
      const result = await getGroupDocuments(groupId);
      const docs = Array.isArray(result.data) ? result.data : [];

      docLoader.style.display = "none";

      const docSectionTitle = document.getElementById("docSectionTitle");
      if (docSectionTitle) {
        docSectionTitle.textContent = `Shared Documents (${docs.length})`;
      }

      if (docs.length === 0) {
        docEmpty.style.display = "flex";
        if (shareDocBtn) shareDocBtn.style.display = "none";
        return;
      }

      if (shareDocBtn) shareDocBtn.style.display = "flex";
      docGrid.innerHTML = "";
      docs.forEach(function (doc) {
        docGrid.appendChild(createDocCard(doc));
      });
      docGrid.style.display = "grid";

    } catch (error) {
      docLoader.style.display = "none";
      showError(docError, error.message || "Failed to load group documents.");
    }
  }

  // Group folders rendering

  function createFolderCard(folder) {
    const card = document.createElement("div");
    card.className = "folder-card";
    card.style.cursor = "pointer";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1"></path></svg>';

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = folder.folderName || "Untitled Folder";

    const ownerMeta = document.createElement("p");
    ownerMeta.className = "folder-meta";
    ownerMeta.textContent = `Owner: ${folder.ownerName || folder.ownerEmail || "Unknown"}`;

    const sharedByMeta = document.createElement("p");
    sharedByMeta.className = "folder-meta";
    sharedByMeta.textContent = `Shared by: ${folder.sharedByName || folder.sharedByEmail || "Unknown"}`;

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, name, ownerMeta, sharedByMeta);

    card.append(main);

    if (folder.canRevoke === true) {
      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.className = "btn-revoke-inline";
      revokeBtn.textContent = "Revoke";
      revokeBtn.addEventListener("click", async function (e) {
        e.stopPropagation(); // Prevent card click from triggering navigation
        const confirmed = await confirmAction({
          title: "Revoke Folder?",
          message: "This folder will no longer be shared with this group.",
          confirmText: "Revoke",
          danger: true
        });
        if (!confirmed) return;

        try {
          await revokeGroupFolderShare(folder.shareId);
          showToast("Folder revoked from group.", "success");
          await loadGroupFolders();
        } catch (error) {
          showToast(error.message || "Failed to revoke folder.", "error");
        }
      });
      card.appendChild(revokeBtn);
    }

    // Clicking anywhere on the card opens the shared folder detail page.
    card.addEventListener("click", function () {
      window.location.href = `shared-folder-detail.html?folderId=${folder.folderId}&from=group&groupId=${groupId}&tab=folders`;
    });

    return card;
  }

  async function loadGroupFolders() {
    folderLoader.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
    hideError(folderError);

    try {
      const result = await getGroupFolders(groupId);
      const folders = Array.isArray(result.data) ? result.data : [];

      folderLoader.style.display = "none";

      const folderSectionTitle = document.getElementById("folderSectionTitle");
      if (folderSectionTitle) {
        folderSectionTitle.textContent = `Shared Folders (${folders.length})`;
      }

      if (folders.length === 0) {
        folderEmpty.style.display = "flex";
        if (shareFolderBtn) shareFolderBtn.style.display = "none";
        return;
      }

      if (shareFolderBtn) shareFolderBtn.style.display = "flex";
      folderGrid.innerHTML = "";
      folders.forEach(function (folder) {
        folderGrid.appendChild(createFolderCard(folder));
      });
      folderGrid.style.display = "grid";

    } catch (error) {
      folderLoader.style.display = "none";
      showError(folderError, error.message || "Failed to load group folders.");
    }
  }

  function switchGroupTab(tabName) {
    groupTabButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    Object.keys(groupTabPanels).forEach(function (key) {
      groupTabPanels[key].style.display = key === tabName ? "block" : "none";
    });

    // Contract requirement: only load chat history when the Chat tab is opened.
    if (tabName === "chat" && !isChatTabInitialized) {
      isChatTabInitialized = true;
      loadChatMessages();
    }
  }

  groupTabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchGroupTab(btn.dataset.tab);
    });
  });

  // Load group detail (info + members)
  // ─────────────────────────────────────────────────────────────
  // GROUP CHAT (Step 12)
  // ─────────────────────────────────────────────────────────────

  function isChatNearBottom(threshold = 80) {
    return chatMessageList.scrollHeight - chatMessageList.scrollTop - chatMessageList.clientHeight < threshold;
  }

  function renderChatMessages(options) {
    const opts = options || {};
    // Capture scroll position BEFORE wiping the list, so polling doesn't yank
    // the view away while the user is reading older messages.
    const shouldScroll = opts.forceScroll || isChatNearBottom();

    chatMessageList.innerHTML = "";

    if (chatMessages.length === 0) {
      chatEmpty.style.display = "flex";
      chatMessageList.style.display = "none";
      return;
    }

    chatEmpty.style.display = "none";
    chatMessageList.style.display = "flex";

    chatMessages.forEach(function (msg) {
      chatMessageList.appendChild(createChatMessageRow(msg));
    });

    if (shouldScroll) {
      if (opts.smooth) {
        chatMessageList.scrollTo({ top: chatMessageList.scrollHeight, behavior: "smooth" });
      } else {
        chatMessageList.scrollTop = chatMessageList.scrollHeight;
      }
    }
  }

  function createChatMessageRow(msg) {
    const row = document.createElement("div");
    row.className = "chat-message-row " + (msg.isMine ? "chat-message-mine" : "chat-message-other");
    row.dataset.messageId = msg.messageId;

    const meta = document.createElement("div");
    meta.className = "chat-message-meta";

    const senderName = document.createElement("span");
    senderName.className = "chat-message-sender";
    safeTextRender(senderName, msg.senderName || "Unknown");

    const roleBadge = document.createElement("span");
    roleBadge.className = msg.senderRole === "OWNER" ? "badge-role-owner" : "badge-role-member";
    safeTextRender(roleBadge, msg.senderRole || "MEMBER");

    const timeEl = document.createElement("span");
    timeEl.className = "chat-message-time";
    safeTextRender(timeEl, formatMessageTime(msg.createdAt));

    meta.append(senderName, roleBadge, timeEl);

    const bubble = document.createElement("div");
    bubble.className = "chat-message-bubble";
    parseChatMentions(bubble, msg.content);

    row.append(meta, bubble);
    return row;
  }

  function updateSendButtonState() {
    const hasContent = chatInput.value.trim().length > 0;
    chatInput.disabled = chatAccessBlocked;
    chatSendBtn.disabled = chatAccessBlocked || isSendingMessage || !hasContent;
  }

  // Tracks whether we're still waiting for the first poll to complete, so we know
  // when to hide the loader and force-scroll to the bottom for the initial render.
  let isInitialChatLoad = true;

  function loadChatMessages() {
    chatLoader.style.display = "flex";
    chatMessageList.style.display = "none";
    chatEmpty.style.display = "none";
    hideError(chatError);
    isInitialChatLoad = true;

    // startGroupChatPolling() fires an immediate poll before starting the 5s interval —
    // that immediate poll IS the initial load, so no separate getGroupMessages() call is needed.
    startGroupChatPolling(groupId, handleIncomingMessages, handlePollingError);
  }

  function handleIncomingMessages(incomingMessages) {
    const wasInitialLoad = isInitialChatLoad;
    isInitialChatLoad = false;
    chatLoader.style.display = "none";

    chatMessages = mergeMessagesById(chatMessages, incomingMessages);
    renderChatMessages({ forceScroll: wasInitialLoad });
  }

  function handlePollingError(error) {
    isInitialChatLoad = false;
    chatLoader.style.display = "none";
    showError(chatError, getGroupChatErrorMessage(error));

    // Lost access mid-session (removed/left member, group deleted) — lock the composer permanently.
    if (error.status === 403 || error.status === 404) {
      chatAccessBlocked = true;
      updateSendButtonState();
    }
  }

  async function handleSendMessage() {
    if (chatAccessBlocked) return;

    const content = chatInput.value.trim();
    if (!content || isSendingMessage) return;

    isSendingMessage = true;
    hideError(chatError);
    updateSendButtonState();

    try {
      const result = await sendGroupMessage(groupId, content);
      chatMessages = mergeMessagesById(chatMessages, [result.data]);
      renderChatMessages({ forceScroll: true, smooth: true });
      chatInput.value = "";
    } catch (error) {
      showError(chatError, getGroupChatErrorMessage(error));

      // The send itself revealed the user lost access — lock the composer permanently.
      if (error.status === 403 || error.status === 404) {
        chatAccessBlocked = true;
      }
    } finally {
      isSendingMessage = false;
      updateSendButtonState();
    }
  }

  chatSendBtn.addEventListener("click", handleSendMessage);

  chatInput.addEventListener("input", updateSendButtonState);

  chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Initial button state
  updateSendButtonState();

  // ─────────────────────────────────────────────────────────────
  // CHAT DOCUMENT MENTION
  // ─────────────────────────────────────────────────────────────

  const chatMentionBtn = document.getElementById("chatMentionBtn");
  const chatMentionDropdown = document.getElementById("chatMentionDropdown");
  const chatMentionList = document.getElementById("chatMentionList");
  let isMentionDropdownOpen = false;

  function toggleMentionDropdown() {
    isMentionDropdownOpen = !isMentionDropdownOpen;
    chatMentionDropdown.style.display = isMentionDropdownOpen ? "flex" : "none";
    if (isMentionDropdownOpen) {
      loadMentionDocuments();
    }
  }

  async function loadMentionDocuments() {
    chatMentionList.innerHTML = `<div class="chat-mention-empty">Loading documents...</div>`;
    try {
      const result = await getGroupDocuments(groupId);
      const docs = Array.isArray(result.data) ? result.data : [];

      if (docs.length === 0) {
        chatMentionList.innerHTML = `<div class="chat-mention-empty">No documents found in this group.</div>`;
        return;
      }

      chatMentionList.innerHTML = "";
      docs.forEach(doc => {
        const item = document.createElement("div");
        item.className = "chat-mention-item";

        const icon = document.createElement("div");
        icon.className = "chat-mention-item-icon";
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`;

        const info = document.createElement("div");
        info.className = "chat-mention-item-info";

        const name = document.createElement("div");
        name.className = "chat-mention-item-name";
        name.textContent = doc.title || "Untitled";

        info.appendChild(name);
        item.appendChild(icon);
        item.appendChild(info);

        item.addEventListener("click", () => {
          const mentionTag = `[doc:${doc.documentId}:${doc.title || "Untitled"}] `;
          chatInput.value = chatInput.value + mentionTag;
          chatInput.focus();
          updateSendButtonState();
          toggleMentionDropdown();
        });

        chatMentionList.appendChild(item);
      });
    } catch (error) {
      chatMentionList.innerHTML = `<div class="chat-mention-empty" style="color:var(--danger)">Failed to load documents</div>`;
    }
  }

  if (chatMentionBtn) {
    chatMentionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMentionDropdown();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (isMentionDropdownOpen && !chatMentionBtn.contains(e.target) && !chatMentionDropdown.contains(e.target)) {
      toggleMentionDropdown();
    }
  });

  // Safely parse [doc:ID:Title] into a clickable DOM anchor.
  function parseChatMentions(container, text) {
    if (!text) return;

    // Regex matches [doc:ID:Title]
    const regex = /\[doc:(\w+):([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Append text before the match
      if (match.index > lastIndex) {
        container.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
      }

      const docId = match[1];
      const docTitle = match[2];

      // Create pill anchor
      const anchor = document.createElement("a");
      anchor.className = "chat-doc-mention";
      anchor.href = `document-detail.html?id=${encodeURIComponent(docId)}&from=group&groupId=${groupId}&tab=chat`;

      anchor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="14" width="14" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`;
      const titleSpan = document.createElement("span");
      titleSpan.textContent = docTitle;
      anchor.appendChild(titleSpan);

      container.appendChild(anchor);

      lastIndex = regex.lastIndex;
    }

    // Append remaining text
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
  }

  async function loadGroupDetail() {
    detailLoader.style.display = "flex";
    groupDetailContent.style.display = "none";
    hideError(detailError);

    try {
      const result = await getGroupById(groupId);
      const group = result.data;

      detailLoader.style.display = "none";
      groupDetailContent.style.display = "block";

      renderGroupInfo(group);
      renderMembers(Array.isArray(group.members) ? group.members : []);
      await loadPendingMembers();
      await loadPendingInvites();

    } catch (error) {
      detailLoader.style.display = "none";
      // Backend blocks users who are not a member of the group (403/404).
      // Show the backend message and do not render the detail panel.
      const isAccessDenied = error.status === 403 || error.status === 404;
      showError(
        detailError,
        isAccessDenied
          ? "You are not a member of this group, so you cannot view its details, documents, or folders."
          : (error.message || "You do not have access to this group.")
      );
    }
  }

  // Edit group (OWNER only)

  editGroupBtn.addEventListener("click", function () {
    editGroupName.value = currentGroup.groupName || "";
    editGroupDescription.value = currentGroup.description || "";
    const editRequiresApproval = document.getElementById("editRequiresApproval");
    if (editRequiresApproval) {
        editRequiresApproval.checked = currentGroup.requiresApproval === true;
    }
    hideError(editError);
    openModal(editModal);
    editGroupName.focus();
  });

  editCancelBtn.addEventListener("click", function () { closeModal(editModal); });

  editConfirmBtn.addEventListener("click", async function () {
    const groupName = editGroupName.value.trim();
    const description = editGroupDescription.value.trim();
    const editRequiresApproval = document.getElementById("editRequiresApproval");
    const requiresApproval = editRequiresApproval ? editRequiresApproval.checked : false;

    if (!groupName) {
      showError(editError, "Group name is required.");
      return;
    }

    editConfirmBtn.disabled = true;
    hideError(editError);

    try {
      await updateGroup(groupId, { groupName, description, requiresApproval });
      closeModal(editModal);
      showToast("Group updated.", "success");
      await loadGroupDetail();
    } catch (error) {
      if (isQuotaError(error) && typeof window.showQuotaError === "function") {
        window.showQuotaError(error);
        showError(editError, window.getQuotaErrorMessage ? window.getQuotaErrorMessage(error) : error.message);
      } else {
        showError(editError, error.message || "Failed to update group.");
      }
    } finally {
      editConfirmBtn.disabled = false;
    }
  });

  // Delete group (OWNER only)

  deleteGroupBtn.addEventListener("click", function () {
    hideError(deleteError);
    openModal(deleteModal);
  });

  deleteCancelBtn.addEventListener("click", function () { closeModal(deleteModal); });

  deleteConfirmBtn.addEventListener("click", async function () {
    deleteConfirmBtn.disabled = true;
    hideError(deleteError);

    try {
      await deleteGroup(groupId);
      showToast("Group deleted.", "success");
      window.location.href = "groups.html";
    } catch (error) {
      showError(deleteError, error.message || "Failed to delete group.");
      deleteConfirmBtn.disabled = false;
    }
  });

  // Leave group (MEMBER only — OWNER uses Delete instead, per Step 6A rules)

  leaveGroupBtn.addEventListener("click", async function () {
    const confirmed = await confirmAction({
      title: "Leave Group?",
      message: "You will lose access to this group's documents.",
      confirmText: "Leave",
      danger: true
    });
    if (!confirmed) return;

    try {
      await leaveGroup(groupId);
      showToast("You left the group.", "success");
      window.location.href = "groups.html";
    } catch (error) {
      showToast(error.message || "Failed to leave group.", "error");
    }
  });

  // Invite Member logic
  inviteMemberBtn.addEventListener("click", function () {
    inviteEmailInput.value = "";
    if (inviteDescriptionInput) inviteDescriptionInput.value = "";
    hideError(inviteMemberError);
    openModal(inviteMemberModal);
    inviteEmailInput.focus();
  });
  
  closeInviteMemberModalBtn.addEventListener("click", function () { closeModal(inviteMemberModal); });
  cancelInviteMemberBtn.addEventListener("click", function () { closeModal(inviteMemberModal); });

  inviteMemberForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = inviteEmailInput.value.trim();
    const description = inviteDescriptionInput ? inviteDescriptionInput.value.trim() : "";
    if (!email) return;

    confirmInviteMemberBtn.disabled = true;
    confirmInviteMemberBtn.textContent = "Sending...";
    hideError(inviteMemberError);

    try {
      const response = await post(`/api/groups/${groupId}/invites/email`, { email, description });
      showToast("Invitation sent successfully", "success");
      closeModal(inviteMemberModal);
      await loadGroupDetail();
    } catch (error) {
      showError(inviteMemberError, error.message);
    } finally {
      confirmInviteMemberBtn.disabled = false;
      confirmInviteMemberBtn.textContent = "Send Invite";
    }
  });

  // Share Doc/Folder logic
  const shareTypeRadios = document.querySelectorAll('input[name="shareType"]');
  const shareItemSelectLabel = document.getElementById("shareItemSelectLabel");

  async function loadShareItems(type) {
    shareItemSelect.innerHTML = `<option value="">Loading your ${type}s...</option>`;
    shareItemSelectLabel.textContent = `Select ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    try {
      const response = await get(`/api/${type}s/my`);
      shareItemSelect.innerHTML = `<option value="">Select a ${type} to share</option>`;
      (response.data || []).forEach(item => {
        const opt = document.createElement("option");
        opt.value = type === "document" ? item.documentId : item.folderId;
        opt.textContent = type === "document" ? (item.title || "Untitled Document") : (item.folderName || "Untitled Folder");
        shareItemSelect.appendChild(opt);
      });
      shareItemSelect.dispatchEvent(new Event("syncCustom"));
    } catch (error) {
      showError(shareModalError, error.message);
    }
  }

  shareTypeRadios.forEach(radio => {
    radio.addEventListener("change", function () {
      if (this.checked) loadShareItems(this.value);
    });
  });

  function openShareModalFor(type) {
    hideError(shareModalError);
    const radio = document.querySelector(`input[name="shareType"][value="${type}"]`);
    if (radio) radio.checked = true;
    loadShareItems(type);
    openModal(shareModal);
  }

  if (shareDocBtn) {
    shareDocBtn.addEventListener("click", () => openShareModalFor("document"));
  }
  const shareDocBtnEmpty = document.getElementById("shareDocBtnEmpty");
  if (shareDocBtnEmpty) {
    shareDocBtnEmpty.addEventListener("click", () => openShareModalFor("document"));
  }

  const shareFolderBtn = document.getElementById("shareFolderBtn");
  if (shareFolderBtn) {
    shareFolderBtn.addEventListener("click", () => openShareModalFor("folder"));
  }
  const shareFolderBtnEmpty = document.getElementById("shareFolderBtnEmpty");
  if (shareFolderBtnEmpty) {
    shareFolderBtnEmpty.addEventListener("click", () => openShareModalFor("folder"));
  }

  closeShareModalBtn.addEventListener("click", function () { closeModal(shareModal); });
  cancelShareBtn.addEventListener("click", function () { closeModal(shareModal); });

  confirmShareBtn.addEventListener("click", async function () {
    const selectedId = shareItemSelect.value;
    if (!selectedId) {
      showError(shareModalError, "Please select an item to share");
      return;
    }
    
    confirmShareBtn.disabled = true;
    confirmShareBtn.textContent = "Sharing...";
    hideError(shareModalError);

    const type = document.querySelector('input[name="shareType"]:checked').value;

    try {
      if (type === "document") {
        await post(`/api/documents/${selectedId}/shares/groups`, {
          groupId: parseInt(groupId, 10),
          permissions: "VIEW"
        });
        showToast("Document shared successfully", "success");
        closeModal(shareModal);
        await loadGroupDocuments();
      } else {
        await post(`/api/folders/${selectedId}/shares/groups`, {
          groupId: parseInt(groupId, 10),
          permissions: "VIEW"
        });
        showToast("Folder shared successfully", "success");
        closeModal(shareModal);
        await loadGroupFolders();
      }
    } catch (error) {
      showError(shareModalError, error.message);
    } finally {
      confirmShareBtn.disabled = false;
      confirmShareBtn.textContent = "Share";
    }
  });

  // Close modals on overlay click

  [editModal, deleteModal, inviteMemberModal, shareModal].forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // Setup focus traps
  setupFocusTrap(editModal);
  setupFocusTrap(deleteModal);
  setupFocusTrap(inviteMemberModal);
  setupFocusTrap(shareModal);

  // Global Escape key modal closer
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      [editModal, deleteModal, inviteMemberModal, shareModal].forEach(function (overlay) {
        if (overlay && overlay.classList.contains("open")) {
          closeModal(overlay);
        }
      });
    }
  });

  // Init
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab");
  if (initialTab && ["members", "documents", "folders", "chat"].includes(initialTab)) {
    switchGroupTab(initialTab);
  }
  
  await loadGroupDetail();
  await loadGroupDocuments();
  await loadGroupFolders();
});
