/**
 * Notification UI Logic - Step B
 * Manages the rendering of the floating top header, notification bell, unread badge, and dropdown list.
 */

let notificationsList = [];
let unreadNotificationCount = 0;

document.addEventListener("DOMContentLoaded", async () => {
    // Wait for the auth check in layout.js to complete
    if (window.authReady) {
        const isAuthenticated = await window.authReady;
        if (isAuthenticated) {
            initGlobalHeader();
            initNotifications();
        }
    }
});

function initGlobalHeader() {
    const mainContent = document.querySelector(".main-content");
    if (!mainContent) return;
    const isDocumentDetailPage = mainContent.classList.contains("detail-main");

    let globalHeader = document.getElementById("globalHeaderWidgets");
    let isFloating = false;

    if (!globalHeader) {
        globalHeader = document.getElementById("globalTopBar");
        if (!globalHeader) {
            globalHeader = document.createElement("header");
            globalHeader.className = "global-top-bar-floating";
            globalHeader.id = "globalTopBar";
            if (!isDocumentDetailPage) {
                globalHeader.style.cssText = `
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    min-height: auto !important;
                `;
            }
            isFloating = true;
        } else {
            isFloating = true;
        }
    }

    if (globalHeader.querySelector(".notification-container")) return; // Prevent duplicates

    // Create notification container
    const notifContainer = document.createElement("div");
    notifContainer.className = "notification-container";

    // Bell button
    const bellBtn = document.createElement("button");
    bellBtn.className = "notification-bell-btn";
    bellBtn.id = "notificationBellBtn";
    bellBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" aria-hidden="true" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
    `;

    // Dropdown UI
    const dropdown = document.createElement("div");
    dropdown.className = "notification-dropdown";
    dropdown.id = "notificationDropdown";
    dropdown.innerHTML = `
        <div class="notification-dropdown-header">
            <h3>Notifications</h3>
            <button class="mark-all-read-btn" id="markAllReadBtn">Mark all as read</button>
        </div>
        <div class="notification-list" id="notificationList">
            <div class="notification-empty">No notifications</div>
        </div>
    `;

    notifContainer.appendChild(bellBtn);
    notifContainer.appendChild(dropdown);

    // Profile chip
    const currentUserRaw = localStorage.getItem("currentUser");
    let currentUser = {};
    try {
        currentUser = JSON.parse(currentUserRaw || "{}");
    } catch (e) {}

    const fullName = getHeaderDisplayName(currentUser);
    const initials = getHeaderInitials(fullName);

    const profileChip = document.createElement("div");
    profileChip.className = "user-profile-chip";
    // Wrap click action on profileChip to navigate to correct profile page based on role
    profileChip.addEventListener("click", () => {
        if (currentUser.role === "ADMIN") {
            window.location.href = "admin-profile.html";
        } else {
            window.location.href = "profile.html";
        }
    });

    renderSafeProfileChipContent(profileChip, currentUser, initials, fullName);

    const headerContent = document.createElement("div");
    headerContent.className = "global-top-bar-right";
    headerContent.appendChild(notifContainer);
    headerContent.appendChild(profileChip);

    globalHeader.appendChild(headerContent);

    if (isFloating) {
        mainContent.insertBefore(globalHeader, mainContent.firstChild);
    }

    if (isDocumentDetailPage && typeof window.renderContextualTopBar === "function") {
        window.renderContextualTopBar(window.currentDocumentDetailForTopBar || null);
    }
}

function getHeaderDisplayName(currentUser = {}) {
    const email = String(currentUser.email || "").trim();
    const rawName = String(currentUser.fullName || currentUser.name || currentUser.displayName || "").trim();
    let displayName = rawName;

    if (email && displayName.includes(email)) {
        displayName = displayName.replace(email, "").trim();
    }

    displayName = displayName.replace(/\s+/g, " ").trim();

    if (!displayName && email) {
        displayName = email.split("@")[0];
    }

    return displayName || "User";
}

function getHeaderInitials(displayName = "User") {
    const names = String(displayName).trim().split(/\s+/).filter(Boolean);

    if (names.length > 1) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }

    if (names.length === 1) {
        return names[0].slice(0, 2).toUpperCase();
    }

    return "U";
}

function renderSafeProfileChipContent(profileChip, currentUser, initials, fullName) {
    profileChip.innerHTML = ""; // Clear existing

    if (currentUser.avatarUrl) {
        const img = document.createElement("img");
        img.src = currentUser.avatarUrl;
        img.className = "user-avatar-img";
        img.alt = `${fullName} avatar`;
        img.style.width = "32px";
        img.style.height = "32px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        profileChip.appendChild(img);
    } else {
        const initialsDiv = document.createElement("div");
        initialsDiv.className = "user-avatar-initials";
        initialsDiv.textContent = initials;
        profileChip.appendChild(initialsDiv);
    }

    const infoContainer = document.createElement("div");
    infoContainer.className = "user-profile-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "user-profile-name";
    nameSpan.textContent = fullName;
    infoContainer.appendChild(nameSpan);

    profileChip.appendChild(infoContainer);
}

function refreshHeaderProfileChip() {
    const profileChip = document.querySelector(".user-profile-chip");
    if (!profileChip) return;

    const currentUserRaw = localStorage.getItem("currentUser");
    let currentUser = {};
    try {
        currentUser = JSON.parse(currentUserRaw || "{}");
    } catch (e) {}

    const fullName = getHeaderDisplayName(currentUser);
    const initials = getHeaderInitials(fullName);

    renderSafeProfileChipContent(profileChip, currentUser, initials, fullName);
}

window.refreshHeaderProfileChip = refreshHeaderProfileChip;

function initNotifications() {
    // Dropdown close on outside click
    document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("notificationDropdown");
        const container = document.querySelector(".notification-container");
        if (dropdown && container && !container.contains(e.target)) {
            dropdown.classList.remove("open");
        }
    });

    const bellBtn = document.getElementById("notificationBellBtn");
    if (bellBtn) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById("notificationDropdown");
            if (dropdown) dropdown.classList.toggle("open");
        });
    }

    const markAllBtn = document.getElementById("markAllReadBtn");
    if (markAllBtn) {
        markAllBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await handleMarkAllRead();
        });
    }

    // Initial fetch
    fetchAndRenderNotifications();

    // Poll every 30 seconds
    setInterval(fetchAndRenderNotifications, 30000);
}

async function fetchAndRenderNotifications() {
    if (typeof getNotifications !== "function") return;

    try {
        const [listRes, countRes] = await Promise.all([
            getNotifications(),
            typeof getUnreadNotificationCount === "function" ? getUnreadNotificationCount() : Promise.resolve({ data: 0 })
        ]);

        if (listRes && listRes.data) {
            notificationsList = listRes.data || [];

            // Backend returns count in data.count or unreadCount field depending on contract
            const countValue = countRes?.data?.count ?? countRes?.unreadCount;
            unreadNotificationCount = countValue !== undefined && countValue !== null ? Number(countValue) : notificationsList.filter(n => !n.read).length;
            updateBadge();
            renderNotificationList();
        }
    } catch (e) {
        // Fallback UI for failed API calls
        notificationsList = [];
        unreadNotificationCount = 0;
        updateBadge();
        const listEl = document.getElementById("notificationList");
        if (listEl) {
            listEl.innerHTML = `<div class="notification-empty" style="color:var(--danger)">Error loading notifications</div>`;
        }
    }
}

function updateBadge() {
    const badge = document.getElementById("notificationBadge");
    const markAllBtn = document.getElementById("markAllReadBtn");
    if (!badge) return;

    if (unreadNotificationCount > 0) {
        badge.textContent = unreadNotificationCount > 99 ? "99+" : unreadNotificationCount;
        badge.style.display = "flex";
        if (markAllBtn) markAllBtn.disabled = false;
    } else {
        badge.style.display = "none";
        if (markAllBtn) markAllBtn.disabled = true;
    }
}

function renderNotificationList() {
    const listEl = document.getElementById("notificationList");
    if (!listEl) return;

    listEl.innerHTML = "";

    if (notificationsList.length === 0) {
        listEl.innerHTML = `<div class="notification-empty">No notifications</div>`;
        return;
    }

    notificationsList.forEach(notif => {
        const item = document.createElement("div");
        item.className = "notification-item" + (notif.read ? "" : " unread");
        
        const hasAction = notif.targetType && notif.targetId;
        if (!hasAction && notif.type !== "GROUP_MEMBER_REMOVED" && notif.type !== "GROUP_DOCUMENT_REMOVED") {
            item.classList.add("no-action");
        }

        // Icon based on type
        let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>`;
        let iconColorClass = "info";

        if (notif.type === "GROUP_JOIN_REQUEST") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>`;
            iconColorClass = "info";
        } else if (notif.type === "GROUP_INVITE") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>`;
            iconColorClass = "info";
        } else if (notif.type === "GROUP_JOIN_APPROVED" || notif.type === "INVITE_ACCEPTED") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            iconColorClass = "success";
        } else if (notif.type === "GROUP_JOIN_REJECTED" || notif.type === "GROUP_MEMBER_REMOVED" || notif.type === "INVITE_DECLINED") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`;
            iconColorClass = "danger";
        } else if (notif.type === "GROUP_MEMBER_LEFT") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>`;
            iconColorClass = "warning";
        } else if (notif.type === "GROUP_DOCUMENT_REMOVED") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.158 0c-.36-.05-.72-.099-1.08-.148m-1.08-.148a50.11 50.11 0 00-10.42 0m10.42 0V4.25c0-.141-.101-.271-.241-.287a48.54 48.54 0 00-10.158 0c-.14.016-.241.146-.241.287v1.5" /></svg>`;
            iconColorClass = "warning";
        }

        const iconContainer = document.createElement("div");
        iconContainer.className = `notification-icon ${iconColorClass}`;
        iconContainer.innerHTML = iconSvg;

        const contentContainer = document.createElement("div");
        contentContainer.className = "notification-content";

        const message = document.createElement("p");
        message.className = "notification-message";
        message.textContent = notif.message;

        const time = document.createElement("span");
        time.className = "notification-time";
        time.textContent = formatTimeAgo(notif.createdAt);

        contentContainer.appendChild(message);
        
        if (notif.type === "GROUP_INVITE") {
            const btnContainer = document.createElement("div");
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "8px";
            btnContainer.style.marginTop = "8px";
            
            const acceptBtn = document.createElement("button");
            acceptBtn.className = "btn btn-primary btn-sm";
            acceptBtn.textContent = "Accept";
            acceptBtn.style.padding = "4px 8px";
            acceptBtn.style.fontSize = "12px";
            
            const declineBtn = document.createElement("button");
            declineBtn.className = "btn btn-secondary btn-sm";
            declineBtn.textContent = "Decline";
            declineBtn.style.padding = "4px 8px";
            declineBtn.style.fontSize = "12px";
            
            acceptBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                acceptBtn.disabled = true;
                declineBtn.disabled = true;
                acceptBtn.textContent = "Accepting...";
                try {
                    const response = await post(`/api/group-invites/${notif.targetId}/accept`, {});
                    if (typeof window.showToast === "function") window.showToast("Group invitation accepted!", "success");
                    await handleMarkRead(notif.notificationId);
                    window.location.href = `group-detail.html?id=${response.data}`;
                } catch (err) {
                    if (err.message === "Group members limit exceeded") {
                        if (typeof window.showToast === "function") window.showToast("The group is already full.", "error");
                    } else {
                        if (typeof window.showToast === "function") window.showToast(err.message || "Failed to accept invitation.", "error");
                    }
                    acceptBtn.disabled = false;
                    declineBtn.disabled = false;
                    acceptBtn.textContent = "Accept";
                }
            });

            declineBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                acceptBtn.disabled = true;
                declineBtn.disabled = true;
                declineBtn.textContent = "Declining...";
                try {
                    await post(`/api/group-invites/${notif.targetId}/decline`, {});
                    if (typeof window.showToast === "function") window.showToast("Group invitation declined.", "info");
                    await handleMarkRead(notif.notificationId);
                    fetchAndRenderNotifications();
                } catch (err) {
                    if (typeof window.showToast === "function") window.showToast("Failed to decline invitation.", "error");
                    acceptBtn.disabled = false;
                    declineBtn.disabled = false;
                    declineBtn.textContent = "Decline";
                }
            });

            btnContainer.appendChild(acceptBtn);
            btnContainer.appendChild(declineBtn);
            contentContainer.appendChild(btnContainer);
        }

        contentContainer.appendChild(time);

        item.appendChild(iconContainer);
        item.appendChild(contentContainer);

        // Click action
        item.addEventListener("click", async () => {
            if (!notif.read) {
                await handleMarkRead(notif.notificationId);
            }
            
            if (notif.type === "GROUP_MEMBER_REMOVED") {
                if (typeof window.showToast === "function") {
                    window.showToast("You were removed from this group, so group details, documents, folders, and chat are no longer available.", "warning");
                }
                return;
            }
            
            if (notif.type === "GROUP_DOCUMENT_REMOVED") {
                if (notif.targetType === "DOCUMENT") {
                    window.location.href = `document-detail.html?id=${notif.targetId}`;
                } else if (notif.targetType === "GROUP") {
                    window.location.href = `group-detail.html?id=${notif.targetId}`;
                } else {
                    if (typeof window.showToast === "function") {
                        window.showToast("This document was removed from group, but it may remain in your documents.", "info");
                    }
                }
                return;
            }
            
            if (hasAction) {
                if (notif.targetType === "GROUP") {
                    window.location.href = `group-detail.html?id=${notif.targetId}`;
                } else if (notif.targetType === "DOCUMENT") {
                    window.location.href = `document-detail.html?id=${notif.targetId}`;
                }
            }
        });

        listEl.appendChild(item);
    });
}

async function handleMarkRead(notificationId) {
    if (typeof markNotificationAsRead === "function") {
        await markNotificationAsRead(notificationId);
    }
    const notif = notificationsList.find(n => n.notificationId === notificationId);
    if (notif && !notif.read) {
        notif.read = true;
        unreadNotificationCount = Math.max(0, unreadNotificationCount - 1);
        updateBadge();
        renderNotificationList();
    }
}

async function handleMarkAllRead() {
    if (typeof markAllNotificationsAsRead === "function") {
        await markAllNotificationsAsRead();
    }
    notificationsList.forEach(n => n.read = true);
    unreadNotificationCount = 0;
    updateBadge();
    renderNotificationList();

    const dropdown = document.getElementById("notificationDropdown");
    if (dropdown) dropdown.classList.remove("open");
}

function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " min" + (interval > 1 ? "s" : "") + " ago";
    return "just now";
}
