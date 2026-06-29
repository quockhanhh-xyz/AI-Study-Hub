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
      // Accessibility Foundation Rule: Toast live regional announcement pipeline
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    // Create individual toast wrapper safely
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.setAttribute('role', 'status');

    // Create text element securely to eliminate XSS/UI injection vulnerabilities
    const textSpan = document.createElement('span');
    textSpan.className = 'toast-message';
    textSpan.textContent = message;

    // Create manual close button securely
    const closeBtn = document.createElement('span');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = '&times;'; // Safe as static entity representation text
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.setAttribute('tabindex', '0');

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

    // Keyboard support for the focusable close button
    closeBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clearTimeout(dismissTimeout);
        toast.remove();
      }
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
  },

  getFileTypeIcon(fileType) {
    const ext = (fileType || '').toLowerCase();
    let iconClass = 'file-icon-other';
    let iconSvg = '';
    
    if (ext === 'pdf') {
      iconClass = 'file-icon-pdf';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zM9 13h6M9 17h3"/></svg>`;
    } else if (ext === 'doc' || ext === 'docx') {
      iconClass = 'file-icon-word';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>`;
    } else if (ext === 'xls' || ext === 'xlsx') {
      iconClass = 'file-icon-excel';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v18m16.5-18v18M3.75 12h16.5M3.75 7.5h16.5M3.75 16.5h16.5M9 3v18m6-18v18"/></svg>`;
    } else if (ext === 'ppt' || ext === 'pptx') {
      iconClass = 'file-icon-powerpoint';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>`;
    } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
      iconClass = 'file-icon-image';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>`;
    } else {
      iconClass = 'file-icon-other';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5-7.5M12 1.5v7.5h7.5M19.5 22.5H4.5A2.25 2.25 0 012.25 20.25V3.75A2.25 2.25 0 014.5 1.5H12v7.5h7.5V20.25a2.25 2.25 0 01-2.25 2.25z"/></svg>`;
    }
    
    return `<div class="document-file-icon-wrapper ${iconClass}">${iconSvg}</div>`;
  }
};

// Expose individual helper functions directly to window scope to fulfill checklist prerequisites
window.showToast = UIHelper.showToast;
window.confirmAction = UIHelper.confirmAction;
window.setButtonLoading = UIHelper.setButtonLoading;
window.showInlineError = UIHelper.showInlineError;
window.clearInlineError = UIHelper.clearInlineError;
window.getFileTypeIcon = UIHelper.getFileTypeIcon;

// Also preserve the namespace export to guarantee zero breaking integrations for existing callers
window.UIHelper = UIHelper;
