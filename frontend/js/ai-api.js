/**
 * ai-api.js
 * Frontend API layer for Section 14 (AI Document Chat APIs).
 * Integrates seamlessly with core api.js HTTP helpers.
 */

/**
 * 1. Ask a question about a specific document.
 * Endpoint: POST /api/ai/documents/{documentId}/ask
 * 
 * @param {string|number} documentId - The unique identifier of the document.
 * @param {string} question - The query string directed to the AI model.
 * @returns {Promise<object>} The AI response payload.
 */
function askDocumentQuestion(documentId, question) {
  const endpoint = `/api/ai/documents/${documentId}/ask`;
  const body = { question };
  return post(endpoint, body);
}

/**
 * 2. Retrieve the chat history for a specific document.
 * Endpoint: GET /api/ai/documents/{documentId}/chats
 * 
 * @param {string|number} documentId - The unique identifier of the document.
 * @returns {Promise<object>} Array or object containing previous chat records.
 */
function getDocumentChats(documentId) {
  const endpoint = `/api/ai/documents/${documentId}/chats`;
  return get(endpoint);
}

/**
 * 3. Delete a specific AI chat session or message.
 * Endpoint: DELETE /api/ai/chats/{chatId}
 * 
 * @param {string|number} chatId - The unique identifier of the target chat session/message.
 * @returns {Promise<object>} Operational success indicator from the backend.
 */
function deleteAiChat(chatId) {
  const endpoint = `/api/ai/chats/${chatId}`;
  return del(endpoint);
}

/**
 * 4. Fetch the current authenticated user's AI consumption and usage status.
 * Endpoint: GET /api/ai/usage/me
 * 
 * @returns {Promise<object>} Usage statistics and quota metrics.
 */
function getMyAiUsage() {
  const endpoint = `/api/ai/usage/me`;
  return get(endpoint);
}