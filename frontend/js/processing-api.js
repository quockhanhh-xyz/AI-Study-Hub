/**
 * AI Document Processing API Helper
 * Branch: feature/frontend-ai-processing-api
 */

/**
 * Triggers the initial extraction and text-cleaning pipeline for a specific document.
 * @param {string|number} documentId - The target document identifier.
 * @returns {Promise<Object>} Backend service response abstraction (Handles 2xx/202 statuses).
 */
async function processDocument(documentId) {
  if (!documentId) throw new Error("Document ID is required.");
  
  // Utilizes the centralized apiRequest utility; bypassing raw fetch implementations.
  return await apiRequest(`/api/documents/${documentId}/process`, {
    method: "POST"
  });
}

/**
 * Forces the system to re-trigger the extraction and cleaning process for an existing document.
 * @param {string|number} documentId - The target document identifier.
 * @returns {Promise<Object>} Backend service response abstraction (Handles 2xx/202 statuses).
 */
async function reprocessDocument(documentId) {
  if (!documentId) throw new Error("Document ID is required.");

  // Utilizes the centralized apiRequest utility; bypassing raw fetch implementations.
  return await apiRequest(`/api/documents/${documentId}/reprocess`, {
    method: "POST"
  });
}

/**
 * Global centralized mapping for the 6 document processing states.
 * Standardizes human-readable labels across the frontend interface.
 */
const DOCUMENT_PROCESSING_STATUS = {
  PENDING: { label: "Pending", class: "status-pending" },
  PROCESSING: { label: "Processing Text", class: "status-processing" },
  CLEANING: { label: "Cleaning Text", class: "status-cleaning" },
  CHUNKING: { label: "Splitting Chunks", class: "status-chunking" },
  SUCCESS: { label: "Ready for AI Q&A", class: "status-success" },
  FAILED: { label: "Processing Failed", class: "status-error" }
};

/**
 * Retrieves the live background parsing and chunking status for a specific document.
 * @param {string|number} documentId - The target document identifier.
 * @returns {Promise<Object>} Backend service response enclosing state metadata.
 */
async function getProcessingStatus(documentId) {
  if (!documentId) throw new Error("Document ID is required.");

  // Utilizes the centralized apiRequest utility; bypassing raw fetch implementations.
  return await apiRequest(`/api/documents/${documentId}/processing-status`, {
    method: "GET"
  });
}

/**
 * Retrieves the fully processed text content chunks of a document.
 * Prepares the raw structured text data for future AI Document Q&A operations.
 * @param {string|number} documentId - The target document identifier.
 * @returns {Promise<Object>} Backend service response containing ordered text chunks array.
 */
async function getDocumentContent(documentId) {
  if (!documentId) throw new Error("Document ID is required.");

  // Utilizes the centralized apiRequest utility; bypassing raw fetch implementations.
  return await apiRequest(`/api/documents/${documentId}/chunks`, {
    method: "GET"
  });
}

/**
 * Global registry tracking active polling sessions to eliminate duplicate timers per document.
 * Maps documentId -> { intervalId, attempts }
 */
const activePollingSessions = new Map();

/**
 * Orchestrates a controlled polling session to monitor background document processing.
 * Frequency: Every 2 seconds, up to 30 attempts max.
 * Handles 409 Conflict gracefully by sustaining the session rather than allocating a new timer.
 * * @param {string|number} documentId - The target document identifier.
 * @param {Function} onStatusUpdate - Callback invoked on each successful status fetch. Receives (status, data).
 * @param {Function} onTerminalState - Callback invoked when a final state (SUCCESS/FAILED) or limit is reached. Receives (status, data).
 */
function startDocumentPolling(documentId, onStatusUpdate, onTerminalState) {
  if (!documentId) throw new Error("Document ID is required for polling initialization.");

  // If a session already exists for this document, sustain it without spinning up duplicate timers
  if (activePollingSessions.has(documentId)) {
    console.warn(`Polling session already running for document ID: ${documentId}. Duplicate request suppressed.`);
    return;
  }

  const sessionState = {
    intervalId: null,
    attempts: 0
  };

  const executePoll = async () => {
    sessionState.attempts++;
    
    // Safety boundary check: Halt when maximum threshold is exceeded
    if (sessionState.attempts > 30) {
      stopDocumentPolling(documentId);
      if (typeof onTerminalState === "function") {
        onTerminalState("TIMEOUT", { message: "Polling limit reached before completing processing execution." });
      }
      return;
    }

    try {
      const response = await getProcessingStatus(documentId);
      
      if (response && response.success && response.data) {
        const currentStatus = response.data.status;
        
        if (typeof onStatusUpdate === "function") {
          onStatusUpdate(currentStatus, response.data);
        }

        // Terminal status detection: Halt polling immediately
        if (currentStatus === "SUCCESS" || currentStatus === "FAILED") {
          stopDocumentPolling(documentId);
          if (typeof onTerminalState === "function") {
            onTerminalState(currentStatus, response.data);
          }
        }
      }
    } catch (error) {
      // 409 Conflict Strategy: Keep the existing polling session running without spawning new timers
      if (error.status === 409) {
        console.log(`Encountered 409 Conflict for document #${documentId}. Sustaining the active polling stream.`);
        return;
      }

      // Other structural failures halt the loop
      console.error(`Polling iteration failure for document #${documentId}:`, error);
      stopDocumentPolling(documentId);
      if (typeof onTerminalState === "function") {
        onTerminalState("ERROR", error);
      }
    }
  };

  // Trigger immediate primary evaluation, then establish the recurring interval loop
  executePoll();
  sessionState.intervalId = setInterval(executePoll, 2000);
  
  // Register session context into global tracking matrix
  activePollingSessions.set(documentId, sessionState);
}

/**
 * Immediately halts and removes an active document processing polling session.
 * @param {string|number} documentId - The target document identifier.
 */
function stopDocumentPolling(documentId) {
  if (activePollingSessions.has(documentId)) {
    const session = activePollingSessions.get(documentId);
    clearInterval(session.intervalId);
    activePollingSessions.delete(documentId);
    console.log(`Polling execution forcefully halted and released for document #${documentId}.`);
  }
}

/**
 * Universal safety flush clearing all active polling loops across the application shell.
 * Executed automatically during context switches like navigation change or logout.
 */
function clearAllPollingSessions() {
  for (const documentId of activePollingSessions.keys()) {
    stopDocumentPolling(documentId);
  }
  activePollingSessions.clear();
}

// Hook into navigation teardowns or page exits to fulfill cleanup invariants
window.addEventListener("beforeunload", clearAllPollingSessions);