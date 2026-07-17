/**
 * Notification API Service - Step B
 * Uses skipUnauthorizedRedirect to prevent infinite redirect loops on unmapped endpoints.
 */

async function getNotifications() {
    try {
        const res = await get("/api/notifications", { skipUnauthorizedRedirect: true });
        return res;
    } catch (error) {
        console.warn("Failed to fetch notifications from backend:", error);
        throw error;
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        return await post(`/api/notifications/${notificationId}/read`, {}, { skipUnauthorizedRedirect: true });
    } catch (error) {
        console.warn("Failed to mark notification as read:", error);
        throw error;
    }
}

async function markAllNotificationsAsRead() {
    try {
        return await post("/api/notifications/read-all", {}, { skipUnauthorizedRedirect: true });
    } catch (error) {
        console.warn("Failed to mark all notifications as read:", error);
        throw error;
    }
}

// Expose functions globally
window.getNotifications = getNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
