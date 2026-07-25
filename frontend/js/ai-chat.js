/**
 * Study Assistant Chatbot Controller
 */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const chatMessages = document.getElementById("chatMessages");
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const quotaDisplay = document.getElementById("quotaDisplay");

    // Initialize layout and state
    loadQuota();
    loadChatHistory();

    // Event listeners
    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearChatBtn.addEventListener("click", clearConversation);

    // Suggestion chips helper
    window.applySuggestion = (text) => {
        chatInput.value = text;
        chatInput.focus();
    };

    /**
     * Load daily AI usage/quota remaining
     */
    async function loadQuota() {
        try {
            const res = await get("/api/ai/usage/me");
            if (res && res.success) {
                const remaining = res.data.remainingQuestions;
                quotaDisplay.textContent = `Remaining Quota: ${remaining} Q&A today`;
            }
        } catch (error) {
            console.error("Failed to load quota stats", error);
        }
    }

    /**
     * Load global chat history
     */
    async function loadChatHistory() {
        try {
            const res = await get("/api/ai/global/chats");
            if (res && res.success && res.data.messages && res.data.messages.length > 0) {
                // Clear default greeting
                chatMessages.innerHTML = "";
                
                res.data.messages.forEach(msg => {
                    appendMessageBubble(msg.role, msg.content, msg.sourceChunks, msg.createdAt);
                });
                
                scrollToBottom();
            }
        } catch (error) {
            console.error("Failed to load chat history", error);
            if (typeof window.showToast === "function") {
                window.showToast("Failed to load chat history.", "error");
            }
        }
    }

    /**
     * Send user message to central chatbot
     */
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Clear input field
        chatInput.value = "";
        
        // Append user bubble immediately
        appendMessageBubble("USER", text, null, new Date().toISOString());
        scrollToBottom();

        // Show typing indicator / loading state
        setLoadingState(true);

        try {
            const res = await post("/api/ai/global/ask", { question: text });
            if (res && res.success) {
                appendMessageBubble("ASSISTANT", res.data.answer, res.data.sourceChunks, new Date().toISOString());
                if (res.data.remainingQuestions !== undefined) {
                    quotaDisplay.textContent = `Remaining Quota: ${res.data.remainingQuestions} Q&A today`;
                }
            } else {
                appendMessageBubble("ASSISTANT", "Sorry, an error occurred while processing your question.", null, new Date().toISOString());
            }
        } catch (error) {
            console.error("Ask AI error", error);
            const msg = error.message || "Failed to contact AI Assistant.";
            appendMessageBubble("ASSISTANT", `An error occurred: ${msg}`, null, new Date().toISOString());
            if (typeof window.showToast === "function") {
                window.showToast(msg, "error");
            }
        } finally {
            setLoadingState(false);
            scrollToBottom();
            chatInput.focus();
        }
    }

    /**
     * Clear global chat conversation
     */
    async function clearConversation() {
        const confirmed = typeof window.confirmAction === "function"
            ? await window.confirmAction({
                title: "Clear Conversation",
                message: "Are you sure you want to clear this conversation?",
                confirmText: "Clear",
                danger: true
            })
            : window.confirm("Are you sure you want to clear this conversation?");
        if (!confirmed) return;

        try {
            const res = await del("/api/ai/global/chats");
            if (res && res.success) {
                chatMessages.innerHTML = `
                    <div class="message-bubble assistant">
                        <div class="message-content">
                            Conversation cleared successfully. How else can I help you?
                        </div>
                        <span class="message-time">System</span>
                    </div>
                `;
                if (typeof window.showToast === "function") {
                    window.showToast("Conversation cleared successfully.", "success");
                }
            }
        } catch (error) {
            console.error("Clear chat error", error);
            if (typeof window.showToast === "function") {
                window.showToast("Failed to clear conversation.", "error");
            }
        }
    }

    /**
     * Set loading/disabled UI states during AI calls
     */
    function setLoadingState(isLoading) {
        chatInput.disabled = isLoading;
        sendBtn.disabled = isLoading;
        sendBtn.textContent = isLoading ? "..." : "Send";
    }

    /**
     * Scroll messages view to bottom
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Append a message bubble to the messages list
     */
    function appendMessageBubble(role, content, sourceChunks, timestamp) {
        const isUser = (role === "USER");
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${isUser ? 'user' : 'assistant'}`;

        const msgContent = document.createElement("div");
        msgContent.className = "message-content";
        msgContent.textContent = content;

        // Render Citations if available (only for Assistant)
        const isFallback = content && (
            content.includes("Tôi chưa tìm thấy tài liệu phù hợp") ||
            content.includes("I could not find matching documents") ||
            content.includes("Tôi không tìm thấy thông tin này") ||
            content.includes("I could not find this information")
        );
        if (!isUser && !isFallback && sourceChunks && sourceChunks.length > 0) {
            const citationsContainer = document.createElement("div");
            citationsContainer.className = "citations-container";
            
            // Deduplicate citations by documentId and sourceLabel to avoid repeats
            const uniqueCitations = [];
            const seen = new Set();
            sourceChunks.forEach(chunk => {
                const key = `${chunk.documentId}-${chunk.sourceLabel}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCitations.push(chunk);
                }
            });

            uniqueCitations.forEach(citation => {
                const badge = document.createElement("div");
                badge.className = "citation-badge";
                
                const libClass = (citation.sourceLibrary === "My Library") ? "my-library" 
                    : (citation.sourceLibrary === "Community Library") ? "community-library" : "shared-library";
                
                badge.innerHTML = `
                    <span class="source-type ${libClass}">${citation.sourceLibrary || 'Library'}</span>
                    <a href="document-detail.html?id=${citation.documentId}" style="text-decoration: none; color: inherit; font-weight: 600;">
                        ${citation.documentTitle || 'Document'}
                    </a>
                    <span style="color: var(--text-muted);">•</span>
                    <span>${citation.sourceLabel || 'Chunk'}</span>
                `;
                citationsContainer.appendChild(badge);
            });
            msgContent.appendChild(citationsContainer);
        }

        bubble.appendChild(msgContent);

        const msgTime = document.createElement("span");
        msgTime.className = "message-time";
        msgTime.textContent = formatTime(timestamp);
        bubble.appendChild(msgTime);

        chatMessages.appendChild(bubble);
    }

    /**
     * Format timestamp helper
     */
    function formatTime(isoString) {
        if (!isoString) return "";
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    }
});
