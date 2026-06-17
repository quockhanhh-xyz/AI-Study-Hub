/**
 * Shared UX/UI Helpers for AI Study Hub.
 * Provides global utility functions for consistent user feedback and interaction states.
 */

const UIHelper = {
  /**
   * Displays a global toast notification message.
   * @param {string} message - The text content to display inside the toast.
   * @param {string} type - Notification styling type: 'success', 'error', 'info', or 'warning'.
   */
  showToast(message, type = 'success') {
    // Look for an existing toast container or create one dynamically
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    // Create individual toast wrapper safely
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    // Create text element securely to eliminate XSS/UI injection vulnerabilities
    const textSpan = document.createElement('span');
    textSpan.className = 'toast-message';
    textSpan.textContent = message;

    // Create manual close button securely
    const closeBtn = document.createElement('span');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = '&times;'; // Safe as static entity representation text

    // Assemble safe DOM tree
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Set up auto-dismiss timer after 4 seconds
    const dismissTimeout = setTimeout(() => {
      toast.classList.add('toast-fade-out');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);

    // Handle manual close button click
    closeBtn.addEventListener('click', () => {
      clearTimeout(dismissTimeout);
      toast.remove();
    });
  },

  /**
   * Prompts the user with a fully functional dynamic confirmation modal.
   * @param {Object} options - Configuration object.
   * @param {string} options.title - Header text for the modal.
   * @param {string} options.message - Core body description text.
   * @param {string} options.confirmText - Label text for the action button.
   * @param {boolean} options.danger - If true, styles the action button destructively (e.g., permanent delete).
   * @returns {Promise<boolean>} Resolves to true if user clicks confirm, false otherwise.
   */
  confirmAction({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      // Create modal wrapper overlays dynamically
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'confirm-modal-box';

      // 1. Header Section
      const headerDiv = document.createElement('div');
      headerDiv.className = 'confirm-modal-header';
      const titleElement = document.createElement('h3');
      titleElement.textContent = title;
      headerDiv.appendChild(titleElement);

      // 2. Body Description Section
      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'confirm-modal-body';
      const messageElement = document.createElement('p');
      messageElement.textContent = message;
      bodyDiv.appendChild(messageElement);

      // 3. Action Buttons Section
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'confirm-modal-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'confirm-btn-cancel';
      cancelBtn.textContent = 'Cancel';

      const actionBtn = document.createElement('button');
      actionBtn.className = danger ? 'confirm-btn-danger' : 'confirm-btn-primary';
      actionBtn.textContent = confirmText;

      actionsDiv.appendChild(cancelBtn);
      actionsDiv.appendChild(actionBtn);

      // Assemble safe Modal DOM Tree
      modal.appendChild(headerDiv);
      modal.appendChild(bodyDiv);
      modal.appendChild(actionsDiv);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Clean up DOM and remove event listeners helper
      const closeModal = (result) => {
        overlay.remove();
        resolve(result);
      };

      // Wire up secure click listeners
      cancelBtn.addEventListener('click', () => closeModal(false));
      actionBtn.addEventListener('click', () => closeModal(true));
      
      // Close on backdrop overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(false);
      });
    });
  },

  /**
   * Manages the asynchronous visual loading state of action trigger buttons.
   * @param {HTMLButtonElement} button - The DOM target element.
   * @param {boolean} isLoading - State flag determining active loading status.
   * @param {string} loadingText - Text placeholder while the loading animation is active.
   */
  setButtonLoading(button, isLoading, loadingText = 'Processing...') {
    if (!button) return;

    if (isLoading) {
      // Cache the original inner content text or elements to restore it perfectly later
      button.setAttribute('data-original-text', button.innerHTML);
      button.disabled = true;

      // Build loading elements programmatically without clearing natively bound child structures unsafely
      button.innerHTML = '';
      const spinner = document.createElement('span');
      spinner.className = 'spinner-inline';
      
      const textNode = document.createTextNode(` ${loadingText}`);
      button.appendChild(spinner);
      button.appendChild(textNode);
    } else {
      // Revert button state back to original cached properties
      const originalText = button.getAttribute('data-original-text');
      button.disabled = false;
      if (originalText !== null) {
        button.innerHTML = originalText;
        button.removeAttribute('data-original-text');
      }
    }
  },

  /**
   * Renders localized contextual inline business errors next to user entry elements.
   * @param {HTMLElement} container - The wrapper context DOM boundary container block.
   * @param {string} message - Error description context text string.
   */
  showInlineError(container, message) {
    if (!container) return;
    
    // Purge any existing error message blocks inside the target element boundary
    this.clearInlineError(container);

    if (message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'inline-error-message';
      errorDiv.textContent = message;
      container.appendChild(errorDiv);
    }
  },

  /**
   * Helper to clear an existing inline error inside a container.
   * @param {HTMLElement} container - The wrapper context DOM boundary container block.
   */
  clearInlineError(container) {
    if (!container) return;
    const existingError = container.querySelector('.inline-error-message');
    if (existingError) {
      existingError.remove();
    }
  }
};

// Expose individual helper functions directly to window scope to fulfill checklist prerequisites
window.showToast = UIHelper.showToast;
window.confirmAction = UIHelper.confirmAction;
window.setButtonLoading = UIHelper.setButtonLoading;
window.showInlineError = UIHelper.showInlineError;
window.clearInlineError = UIHelper.clearInlineError;

// Also preserve the namespace export to guarantee zero breaking integrations for existing callers
window.UIHelper = UIHelper;