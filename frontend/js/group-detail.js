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
  let isChatTabInitialized = false;
  const chatLoader = document.getElementById("chatLoader");
  const chatError = document.getElementById("chatError");
  const chatEmpty = document.getElementById("chatEmpty");
  const chatMessageList = document.getElementById("chatMessageList");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");

  let chatMessages = [];
  let isSendingMessage = false;

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
    editGroupBtn.style.display = isOwner ? "inline-flex" : "none";
    const dangerZoneSection = document.getElementById("dangerZoneSection");
    if (dangerZoneSection) {
      dangerZoneSection.style.display = isOwner ? "block" : "none";
    }
    deleteGroupBtn.style.display = isOwner ? "inline-flex" : "none";

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
    members.forEach(function (member) {
      memberList.appendChild(createMemberRow(member));
    });

    const memberSectionTitle = document.getElementById("memberSectionTitle");
    if (memberSectionTitle) {
      memberSectionTitle.textContent = `Members (${members.length})`;
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
    card.appendChild(avatarWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const titleEl = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${doc.documentId}`;
    titleLink.textContent = doc.title || doc.originalFileName || "Untitled";
    titleLink.style.color = "inherit";
    titleLink.style.textDecoration = "none";
    titleEl.appendChild(titleLink);
    header.appendChild(titleEl);

    const desc = document.createElement("p");
    desc.className = "document-description";
    if (doc.description && doc.description.trim() !== "No description provided.") {
      desc.textContent = doc.description;
    } else {
      desc.style.display = "none";
    }

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
    uploaderItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Uploaded by: <strong>${contributorName}</strong>`;
    meta.append(uploaderItem);

    content.append(header, desc, meta);
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
      window.location.href = `document-detail.html?id=${doc.documentId}`;
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
        return;
      }

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
      window.location.href = `shared-folder-detail.html?folderId=${folder.folderId}`;
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
        return;
      }

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
    safeTextRender(bubble, msg.content);

    row.append(meta, bubble);
    return row;
  }

  function updateSendButtonState() {
    const hasContent = chatInput.value.trim().length > 0;
    chatSendBtn.disabled = isSendingMessage || !hasContent;
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

    // Lost access mid-session (removed/left member, group deleted) — lock the composer.
    if (error.status === 403 || error.status === 404) {
      chatInput.disabled = true;
      chatSendBtn.disabled = true;
    }
  }

  async function handleSendMessage() {
    const content = chatInput.value.trim();
    if (!content || isSendingMessage) return;

    isSendingMessage = true;
    chatSendBtn.disabled = true;
    chatInput.disabled = true;
    hideError(chatError);

    try {
      const result = await sendGroupMessage(groupId, content);
      chatMessages = mergeMessagesById(chatMessages, [result.data]);
      renderChatMessages({ forceScroll: true, smooth: true });
      chatInput.value = "";
    } catch (error) {
      showError(chatError, getGroupChatErrorMessage(error));
    } finally {
      isSendingMessage = false;
      chatInput.disabled = false;
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
    hideError(editError);
    openModal(editModal);
    editGroupName.focus();
  });

  editCancelBtn.addEventListener("click", function () { closeModal(editModal); });

  editConfirmBtn.addEventListener("click", async function () {
    const groupName = editGroupName.value.trim();
    const description = editGroupDescription.value.trim();

    if (!groupName) {
      showError(editError, "Group name is required.");
      return;
    }

    editConfirmBtn.disabled = true;
    hideError(editError);

    try {
      await updateGroup(groupId, { groupName, description });
      closeModal(editModal);
      showToast("Group updated.", "success");
      await loadGroupDetail();
    } catch (error) {
      showError(editError, error.message || "Failed to update group.");
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

  // Close modals on overlay click

  [editModal, deleteModal].forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // Setup focus traps
  setupFocusTrap(editModal);
  setupFocusTrap(deleteModal);

  // Global Escape key modal closer
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      [editModal, deleteModal].forEach(function (overlay) {
        if (overlay && overlay.classList.contains("open")) {
          closeModal(overlay);
        }
      });
    }
  });

  // Init
  await loadGroupDetail();
  await loadGroupDocuments();
  await loadGroupFolders();
});
