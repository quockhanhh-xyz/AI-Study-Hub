/**
 * Group Chat API Helper
 * Branch: feature/step-12-group-chat-api-helper
 * All functions use apiRequest() — no raw fetch allowed in page scripts.
 * IMPORTANT: Never render message content with innerHTML — always use textContent.
 */

/**
 * Standardized error messages for group chat HTTP error codes.
 * @param {Error} error - The error object from apiRequest().
 * @returns {string} Human-readable error message.
 */
function getGroupChatErrorMessage(error) {
    const status = error.status || error.statusCode;
    switch (status) {
        case 400: return "Message cannot be empty or exceed 1000 characters.";
        case 401: return "Please log in to access group chat.";
        case 403: return "You are not an active member of this group.";
        case 404: return "Group not found or has been deleted.";
        case 500: return "Chat service is currently unavailable. Please try again later.";
        default: return error.message || "An unexpected error occurred.";
    }
}

/**
 * Retrieves the latest chat messages for a specific group.
 * @param {string|number} groupId - The target group identifier.
 * @param {number} limit - Max number of messages to return (default 50, max 100).
 * @returns {Promise<Object>} List of messages sorted by createdAt ASC.
 */
async function getGroupMessages(groupId, limit = 50) {
    if (!groupId) throw new Error("Group ID is required.");
    return await apiRequest(`/api/groups/${groupId}/messages?limit=${limit}`, {
        method: "GET"
    });
}

/**
 * Retrieves messages after a specific messageId (optional — only if backend supports it).
 * @param {string|number} groupId - The target group identifier.
 * @param {string|number} afterMessageId - Only return messages with messageId > this value.
 * @param {number} limit - Max number of messages to return (default 50).
 * @returns {Promise<Object>} List of new messages sorted by createdAt ASC.
 */
async function getGroupMessagesAfter(groupId, afterMessageId, limit = 50) {
    if (!groupId) throw new Error("Group ID is required.");
    if (!afterMessageId) throw new Error("afterMessageId is required.");
    return await apiRequest(
        `/api/groups/${groupId}/messages?limit=${limit}&afterMessageId=${afterMessageId}`,
        { method: "GET" }
    );
}

/**
 * Sends a new chat message to a specific group.
 * Content is trimmed before sending. Must not be empty or exceed 1000 characters.
 * @param {string|number} groupId - The target group identifier.
 * @param {string} content - The message text content.
 * @returns {Promise<Object>} The created message data.
 */
async function sendGroupMessage(groupId, content) {
    if (!groupId) throw new Error("Group ID is required.");
    const trimmed = (content || "").trim();
    if (!trimmed) throw new Error("Message content cannot be empty.");
    if (trimmed.length > 1000) throw new Error("Message content cannot exceed 1000 characters.");
    return await apiRequest(`/api/groups/${groupId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed })
    });
}

// ─────────────────────────────────────────────────────────────
// POLLING HELPER
// ─────────────────────────────────────────────────────────────

/**
 * Tracks the active polling session for group chat.
 * Only one polling session is allowed at a time.
 */
let _groupChatPollingSession = null;

/**
 * Starts polling for new group messages every 3 seconds.
 * Prevents duplicate intervals — stops any existing session before starting a new one.
 * @param {string|number} groupId - The target group identifier.
 * @param {Function} callback - Called with the latest messages array on each successful poll.
 */
function startGroupChatPolling(groupId, onMessages, onError) {
    if (!groupId) throw new Error("Group ID is required for polling.");

    // Stop any existing session before starting a new one
    stopGroupChatPolling();

    let isRequestInFlight = false;

    const executePoll = async () => {
        if (isRequestInFlight) return;
        isRequestInFlight = true;
        try {
            const response = await getGroupMessages(groupId, 50);
            const messages = Array.isArray(response.data) ? response.data : [];
            if (typeof callback === "function") {
                callback(messages);
            }
         } catch (error) {
      if (error.status === 403 || error.status === 404) {
        stopGroupChatPolling();
      }
      onError?.(error);
        } finally {
            isRequestInFlight = false;
        }
    };

    executePoll();
    _groupChatPollingSession = setInterval(executePoll, 5000);
}

/**
 * Stops the active group chat polling session.
 */
function stopGroupChatPolling() {
    if (_groupChatPollingSession !== null) {
        clearInterval(_groupChatPollingSession);
        _groupChatPollingSession = null;
    }
}

// ─────────────────────────────────────────────────────────────
// MESSAGE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Merges two message arrays by messageId to prevent duplicates.
 * Incoming messages override existing ones with the same messageId.
 * @param {Array} existingMessages - Current list of messages.
 * @param {Array} incomingMessages - New messages from the server.
 * @returns {Array} Merged and sorted array by createdAt ASC.
 */
function mergeMessagesById(existingMessages, incomingMessages) {
    const map = new Map();
    (existingMessages || []).forEach(msg => map.set(msg.messageId, msg));
    (incomingMessages || []).forEach(msg => map.set(msg.messageId, msg));
    return Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
}

/**
 * Formats a message timestamp into a human-readable time string.
 * @param {string} isoString - ISO 8601 datetime string from backend.
 * @returns {string} Formatted time string e.g. "10:30 AM" or "Jul 3, 10:30 AM".
 */
function formatMessageTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    if (isToday) {
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/**
 * Safely renders text content into a DOM element using textContent.
 * Never uses innerHTML to prevent XSS attacks from message content.
 * @param {HTMLElement} element - The target DOM element.
 * @param {string} text - The text to render safely.
 */
function safeTextRender(element, text) {
    if (!element) return;
    element.textContent = text || "";
}

// Stop polling on page unload
window.addEventListener("beforeunload", stopGroupChatPolling);

// Expose globally for page scripts
window.getGroupChatErrorMessage = getGroupChatErrorMessage;
window.startGroupChatPolling = startGroupChatPolling;
window.stopGroupChatPolling = stopGroupChatPolling;
window.mergeMessagesById = mergeMessagesById;
window.formatMessageTime = formatMessageTime;
window.safeTextRender = safeTextRender;