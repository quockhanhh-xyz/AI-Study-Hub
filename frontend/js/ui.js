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

    // Create individual toast element
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <span class="toast-close-btn">&times;</span>
    `;

    // Append to container
    container.appendChild(toast);

    // Set up auto-dismiss timer after 4 seconds
    const dismissTimeout = setTimeout(() => {
      toast.classList.add('toast-fade-out');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);

    // Handle manual close button click
    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
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
      // Create modal wrapper elements dynamically
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'confirm-modal-box';
      modal.innerHTML = `
        <div class="confirm-modal-header">
          <h3>${title}</h3>
        </div>
        <div class="confirm-modal-body">
          <p>${message}</p>
        </div>
        <div class="confirm-modal-actions">
          <button class="confirm-btn-cancel">Cancel</button>
          <button class="${danger ? 'confirm-btn-danger' : 'confirm-btn-primary'}">${confirmText}</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Clean up DOM and remove event listeners helper
      const closeModal = (result) => {
        overlay.remove();
        resolve(result);
      };

      // Wire up click listeners
      modal.querySelector('.confirm-btn-cancel').addEventListener('click', () => closeModal(false));
      modal.querySelector(`.${danger ? 'confirm-btn-danger' : 'confirm-btn-primary'}`).addEventListener('click', () => closeModal(true));
      
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
      // Cache the original inner content text to restore it later
      button.setAttribute('data-original-text', button.innerHTML);
      button.disabled = true;
      button.innerHTML = `<span class="spinner-inline"></span> ${loadingText}`;
    } else {
      // Revert button state back to original cached properties
      const originalText = button.getAttribute('data-original-text');
      button.disabled = false;
      if (originalText) {
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
      errorDiv.innerText = message;
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

// Bind to window context to guarantee global access across feature scripts
window.UIHelper = UIHelper;