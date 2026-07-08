/**
 * AI Learning API Helpers
 * Requires api.js to be loaded first for `get`, `post` functions.
 */

const AiLearningAPI = {
  // --- Summary APIs ---
  
  /**
   * Get the latest summary for a document
   * @param {number|string} documentId 
   * @returns {Promise<object>} response payload
   */
  getLatestSummary: async (documentId) => {
    return await get(`/api/ai/documents/${documentId}/summaries/latest`);
  },

  /**
   * Get all summary history for a document
   * @param {number|string} documentId 
   * @returns {Promise<object>} response payload
   */
  getSummaryHistory: async (documentId) => {
    return await get(`/api/ai/documents/${documentId}/summaries`);
  },

  /**
   * Generate a new summary for a document
   * @param {number|string} documentId 
   * @param {boolean} regenerate 
   * @returns {Promise<object>} response payload
   */
  generateSummary: async (documentId, regenerate = false) => {
    const endpoint = `/api/ai/documents/${documentId}/summaries/generate`;
    const url = regenerate ? `${endpoint}?regenerate=true` : endpoint;
    return await post(url, {});
  },

  // --- Flashcard APIs ---

  /**
   * Get all flashcard sets for a document
   * @param {number|string} documentId 
   * @returns {Promise<object>} response payload
   */
  getFlashcardSets: async (documentId) => {
    return await get(`/api/ai/documents/${documentId}/flashcard-sets`);
  },

  /**
   * Get a specific flashcard set detail
   * @param {number|string} setId 
   * @returns {Promise<object>} response payload
   */
  getFlashcardSet: async (setId) => {
    return await get(`/api/ai/flashcard-sets/${setId}`);
  },

  /**
   * Generate a new flashcard set
   * @param {number|string} documentId 
   * @param {number} count 
   * @returns {Promise<object>} response payload
   */
  generateFlashcardSet: async (documentId, count) => {
    return await post(`/api/ai/documents/${documentId}/flashcard-sets/generate`, { count });
  },

  // --- Quiz APIs ---

  /**
   * Get all quiz sets for a document
   * @param {number|string} documentId 
   * @returns {Promise<object>} response payload
   */
  getQuizSets: async (documentId) => {
    return await get(`/api/ai/documents/${documentId}/quiz-sets`);
  },

  /**
   * Get a specific quiz set detail
   * @param {number|string} setId 
   * @returns {Promise<object>} response payload
   */
  getQuizSet: async (setId) => {
    return await get(`/api/ai/quiz-sets/${setId}`);
  },

  /**
   * Generate a new quiz set
   * @param {number|string} documentId 
   * @param {number} questionCount 
   * @param {string} difficulty - EASY, MEDIUM, HARD
   * @returns {Promise<object>} response payload
   */
  generateQuizSet: async (documentId, questionCount, difficulty) => {
    return await post(`/api/ai/documents/${documentId}/quiz-sets/generate`, {
      questionCount,
      difficulty
    });
  }
};
