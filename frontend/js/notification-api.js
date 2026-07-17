/**
 * Notification API Service - Step B
 * Uses skipUnauthorizedRedirect to prevent infinite redirect loops on unmapped endpoints.
 */

async function getNotifications() {
    try {
        const res = await get("/api/notifications/my", { skipUnauthorizedRedirect: true });
        return res;
    } catch (error) {
        console.warn("Failed to fetch notifications from backend:", error);
        throw error;
    }
}

async function getUnreadNotificationCount() {
    try {
        const res = await get("/api/notifications/unread-count", { skipUnauthorizedRedirect: true });
        return res;
    } catch (error) {
        console.warn("Failed to fetch unread notification count from backend:", error);
        throw error;
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        return await put(`/api/notifications/${notificationId}/read`, {}, { skipUnauthorizedRedirect: true });
    } catch (error) {
        console.warn("Failed to mark notification as read:", error);
        throw error;
    }
}

async function markAllNotificationsAsRead() {
    try {
        return await put("/api/notifications/read-all", {}, { skipUnauthorizedRedirect: true });
    } catch (error) {
        console.warn("Failed to mark all notifications as read:", error);
        throw error;
    }
}

// Expose functions globally
window.getNotifications = getNotifications;
window.getUnreadNotificationCount = getUnreadNotificationCount;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
