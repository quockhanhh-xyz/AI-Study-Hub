/**
 * Study Group Detail UI controller for AI Study Hub.
 * Handles: group info, member list, role-based actions (edit/delete/remove/leave),
 * group documents list with conditional Revoke action.
 * Relies on group-api.js and share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {

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

  // URL helper

  function getGroupIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

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
    groupNameTitle.textContent = group.groupName || "Untitled Group";
    groupDescription.textContent = group.description || "No description provided.";
    groupInviteCode.textContent = group.inviteCode || "-";
    groupMyRole.textContent = myRole || "MEMBER";

    const isOwner = myRole === "OWNER";

    // OWNER-only actions
    editGroupBtn.style.display = isOwner ? "inline-block" : "none";
    deleteGroupBtn.style.display = isOwner ? "inline-block" : "none";

    // MEMBER-only action (OWNER does not use leave in MVP)
    leaveGroupBtn.style.display = !isOwner ? "inline-block" : "none";
  }

  // Member list rendering

  function createMemberRow(member) {
    const row = document.createElement("div");
    row.className = "member-row";

    const main = document.createElement("div");
    main.className = "member-row-main";

    const name = document.createElement("span");
    name.className = "member-row-name";
    name.textContent = member.fullName || member.email || "Unknown User";

    const roleBadge = document.createElement("span");
    roleBadge.className = member.role === "OWNER" ? "badge badge-primary" : "badge badge-success";
    roleBadge.textContent = member.role || "MEMBER";

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
          message: `Remove ${member.fullName || member.email} from this group?`,
          confirmText: "Remove",
          danger: true
        });
        if (!confirmed) return;

        try {
          await removeGroupMember(groupId, member.userId);
          showToast("Member removed.", "success");
          await loadGroupDetail();
        } catch (error) {
          showToast(error.message || "Failed to remove member.", "error");
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
  }

  // Group documents rendering

  function createDocCard(doc) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const badge = document.createElement("span");
    badge.className = "document-type-badge";
    badge.textContent = (doc.fileType || "FILE").toUpperCase();

    const titleEl = document.createElement("h3");
    titleEl.textContent = doc.title || doc.originalFileName || "Untitled";

    header.append(badge, titleEl);

    const desc = document.createElement("p");
    desc.className = "document-description";
    desc.textContent = doc.description || "No description provided.";

    const actions = document.createElement("div");
    actions.className = "document-actions";

    // Open: view the document detail (read-only — no edit/delete of the original document here)
    const viewBtn = document.createElement("a");
    viewBtn.href = `document-detail.html?id=${doc.documentId}`;
    viewBtn.className = "btn btn-primary document-detail-btn";
    viewBtn.textContent = "Open";
    actions.appendChild(viewBtn);

    // Download, if backend provides a direct file URL
    if (doc.fileUrl) {
      const downloadBtn = document.createElement("a");
      downloadBtn.href = doc.fileUrl;
      downloadBtn.target = "_blank";
      downloadBtn.rel = "noopener noreferrer";
      downloadBtn.className = "btn btn-secondary";
      downloadBtn.textContent = "Download";
      actions.appendChild(downloadBtn);
    }

    // Revoke is shown strictly based on backend's canRevoke flag —
    // never computed locally, since revoke permission depends on
    // document ownership vs. group ownership rules decided by the server.
    if (doc.canRevoke === true) {
      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.className = "btn btn-danger";
      revokeBtn.textContent = "Revoke";
      revokeBtn.addEventListener("click", async function () {
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
      actions.appendChild(revokeBtn);
    }

    card.append(header, desc, actions);
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

      if (docs.length === 0) {
        docEmpty.style.display = "block";
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

  // Load group detail (info + members)

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
      showError(detailError, error.message || "You do not have access to this group.");
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

  // Init
  await loadGroupDetail();
  await loadGroupDocuments();
});