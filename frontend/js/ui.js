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
   * Prompts the user with a custom modal for text input.
   * @param {Object} options - Configuration object.
   * @param {string} options.title - Header text for the modal.
   * @param {string} options.message - Optional description text.
   * @param {string} options.placeholder - Input placeholder text.
   * @param {string} options.defaultValue - Initial input value.
   * @param {string} options.confirmText - Label text for the action button.
   * @returns {Promise<string|null>} Resolves to the input string if confirmed, or null if cancelled.
   */
  promptAction({ title = 'Enter Value', message = '', placeholder = '', defaultValue = '', confirmText = 'Save' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'confirm-modal-box';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'confirm-modal-header';
      const titleElement = document.createElement('h3');
      titleElement.textContent = title;
      headerDiv.appendChild(titleElement);

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'confirm-modal-body';
      if (message) {
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.marginBottom = '12px';
        bodyDiv.appendChild(messageElement);
      }
      
      const inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.className = 'form-input';
      inputElement.placeholder = placeholder;
      inputElement.value = defaultValue;
      inputElement.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--bg); color: var(--text-main); margin-top: 8px; margin-bottom: 24px; box-sizing: border-box;';
      bodyDiv.appendChild(inputElement);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'confirm-modal-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';
      
      const actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn-primary';
      actionBtn.textContent = confirmText;

      actionsDiv.appendChild(cancelBtn);
      actionsDiv.appendChild(actionBtn);

      modal.appendChild(headerDiv);
      modal.appendChild(bodyDiv);
      modal.appendChild(actionsDiv);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      inputElement.focus();
      inputElement.select();

      const closeModal = (result) => {
        overlay.remove();
        resolve(result);
      };

      cancelBtn.addEventListener('click', () => closeModal(null));
      actionBtn.addEventListener('click', () => {
        const val = inputElement.value;
        if (val && val.trim()) closeModal(val.trim());
        else closeModal(null);
      });
      
      inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = inputElement.value;
          if (val && val.trim()) closeModal(val.trim());
        }
        if (e.key === 'Escape') closeModal(null);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(null);
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
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zM9 13h6M9 17h3"/></svg>`;
    } else if (ext === 'doc' || ext === 'docx') {
      iconClass = 'file-icon-word';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>`;
    } else if (ext === 'xls' || ext === 'xlsx') {
      iconClass = 'file-icon-excel';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v18m16.5-18v18M3.75 12h16.5M3.75 7.5h16.5M3.75 16.5h16.5M9 3v18m6-18v18"/></svg>`;
    } else if (ext === 'ppt' || ext === 'pptx') {
      iconClass = 'file-icon-powerpoint';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>`;
    } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
      iconClass = 'file-icon-image';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>`;
    } else {
      iconClass = 'file-icon-other';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18"><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5-7.5M12 1.5v7.5h7.5M19.5 22.5H4.5A2.25 2.25 0 012.25 20.25V3.75A2.25 2.25 0 014.5 1.5H12v7.5h7.5V20.25a2.25 2.25 0 01-2.25 2.25z"/></svg>`;
    }

    return `<div class="document-file-icon-wrapper ${iconClass}">${iconSvg}</div>`;
  },

  convertSelectToCustomDropdown(selectElement) {
    if (!selectElement || selectElement.dataset.customized) return;
    selectElement.dataset.customized = "true";

    const container = document.createElement("div");
    container.className = "custom-select";
    container.id = selectElement.id + "Container";

    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";

    const label = document.createElement("span");
    label.className = "custom-select-value";

    const arrow = document.createElement("span");
    arrow.className = "custom-select-arrow";
    arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    trigger.append(label, arrow);
    container.append(trigger);

    const optionsMenu = document.createElement("div");
    optionsMenu.className = "custom-select-options";
    container.appendChild(optionsMenu);

    const rebuildSelectOptions = () => {
      optionsMenu.innerHTML = "";

      const updateLabel = () => {
        const activeOpt = selectElement.options[selectElement.selectedIndex];
        label.textContent = activeOpt ? activeOpt.textContent : (selectElement.placeholder || "");
      };

      updateLabel();

      Array.from(selectElement.children).forEach(child => {
        if (child.tagName === 'OPTGROUP') {
          const groupHeader = document.createElement("div");
          groupHeader.className = "custom-select-group-header";
          groupHeader.textContent = child.label;
          optionsMenu.appendChild(groupHeader);

          Array.from(child.children).forEach(option => {
            const item = document.createElement("div");
            item.className = "custom-select-option indented";
            item.textContent = option.textContent;
            item.dataset.value = option.value;
            if (option.selected) {
              item.classList.add("selected");
            }

            item.addEventListener("click", (e) => {
              e.stopPropagation();
              selectElement.value = option.value;
              updateLabel();
              optionsMenu.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("selected"));
              item.classList.add("selected");
              container.classList.remove("active");
              selectElement.dispatchEvent(new Event("change", { bubbles: true }));
            });
            optionsMenu.appendChild(item);
          });
        } else if (child.tagName === 'OPTION') {
          const item = document.createElement("div");
          item.className = "custom-select-option";
          item.textContent = child.textContent;
          item.dataset.value = child.value;
          if (child.selected) {
            item.classList.add("selected");
          }

          item.addEventListener("click", (e) => {
            e.stopPropagation();
            selectElement.value = child.value;
            updateLabel();
            optionsMenu.querySelectorAll(".custom-select-option").forEach(opt => opt.classList.remove("selected"));
            item.classList.add("selected");
            container.classList.remove("active");
            selectElement.dispatchEvent(new Event("change", { bubbles: true }));
          });
          optionsMenu.appendChild(item);
        }
      });
    };

    rebuildSelectOptions();

    selectElement.parentNode.insertBefore(container, selectElement);
    selectElement.style.display = "none";

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isActive = container.classList.contains("active");
      document.querySelectorAll(".custom-select").forEach(el => el.classList.remove("active"));
      if (!isActive) {
        container.classList.add("active");
      }
    });

    selectElement.addEventListener("syncCustom", () => {
      rebuildSelectOptions();
    });
  },

  convertInputToCustomDropdown(inputElement) {
    const createNewValue = "__new__";
    if (!inputElement || inputElement.dataset.customized) return;
    inputElement.dataset.customized = "true";

    // Prevent cursor blinking and text editing directly in the trigger
    inputElement.setAttribute("readonly", "true");
    inputElement.style.cursor = "pointer";

    const container = document.createElement("div");
    container.className = "custom-select";
    container.id = inputElement.id + "Container";

    // Transfer width dimensions from source input to the wrapper container
    if (inputElement.style.minWidth) container.style.minWidth = inputElement.style.minWidth;
    if (inputElement.style.maxWidth) container.style.maxWidth = inputElement.style.maxWidth;
    if (inputElement.style.width) {
      container.style.width = inputElement.style.width;
    } else {
      container.style.width = "100%";
    }

    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    trigger.style.cursor = "pointer";

    inputElement.parentNode.insertBefore(container, inputElement);
    trigger.appendChild(inputElement);
    inputElement.className = "custom-select-input";

    // Clear dimensions from the raw input element so it doesn't overflow or stretch the flex container
    inputElement.style.minWidth = "0";
    inputElement.style.maxWidth = "none";
    inputElement.style.width = "100%";

    const arrow = document.createElement("span");
    arrow.className = "custom-select-arrow";
    arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    trigger.appendChild(arrow);
    container.appendChild(trigger);

    const optionsMenu = document.createElement("div");
    optionsMenu.className = "custom-select-options";
    container.appendChild(optionsMenu);

    // Create sticky search input inside the dropdown options panel
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "custom-select-search-wrapper";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "custom-select-search-input";
    searchInput.placeholder = "Type to search...";
    searchInput.autocomplete = "off";

    searchWrapper.appendChild(searchInput);
    optionsMenu.appendChild(searchWrapper);

    // List container to hold dynamic options
    const listContainer = document.createElement("div");
    listContainer.className = "custom-select-list-container";
    optionsMenu.appendChild(listContainer);

    const rebuildOptions = () => {
      listContainer.innerHTML = "";
      const listId = inputElement.getAttribute("list") || inputElement.dataset.listId;
      if (listId) {
        inputElement.dataset.listId = listId;
        inputElement.removeAttribute("list");
      }
      if (!listId) return;
      const datalist = document.getElementById(listId);
      if (!datalist) return;

      const filterVal = searchInput.value.toLowerCase().trim();
      const options = Array.from(datalist.options);

      if (!filterVal) {
        if (inputElement.id !== "subjectSelect") {
          const clearOpt = document.createElement("div");
          clearOpt.className = "custom-select-option";
          clearOpt.textContent = inputElement.id === "subjectFilter" ? "All Subjects" : "Clear selection";
          clearOpt.dataset.value = "";
          if (inputElement.value === "") clearOpt.classList.add("selected");
          clearOpt.addEventListener("click", (e) => {
            e.stopPropagation();
            inputElement.value = "";
            searchInput.value = "";
            container.classList.remove("active");
            inputElement.dispatchEvent(new Event("change", { bubbles: true }));
            inputElement.dispatchEvent(new Event("input", { bubbles: true }));
          });
          listContainer.appendChild(clearOpt);
        }
      }

      // Append create new inline trigger option at top if present
      const hasCreateNew = options.some(opt => opt.value === createNewValue || opt.dataset.id === createNewValue);
      if (hasCreateNew && !filterVal) {
        const matchingOpt = options.find(opt => opt.value === createNewValue || opt.dataset.id === createNewValue);
        const createOpt = document.createElement("div");
        createOpt.className = "custom-select-option";
        createOpt.style.borderBottom = "1px solid var(--border)";
        createOpt.style.color = "var(--primary)";
        createOpt.style.fontWeight = "600";
        createOpt.textContent = matchingOpt.textContent || "+ Create new subject…";
        createOpt.dataset.value = createNewValue;
        createOpt.addEventListener("click", (e) => {
          e.stopPropagation();
          inputElement.value = createNewValue;
          searchInput.value = "";
          container.classList.remove("active");
          inputElement.dispatchEvent(new Event("change", { bubbles: true }));
          inputElement.dispatchEvent(new Event("input", { bubbles: true }));
        });
        listContainer.appendChild(createOpt);
      }

      options.forEach(opt => {
        const text = opt.value;
        const id = opt.dataset.id || "";

        if (text === createNewValue || id === createNewValue) {
          return;
        }

        if (filterVal && !text.toLowerCase().includes(filterVal)) {
          return;
        }

        const item = document.createElement("div");
        item.className = "custom-select-option";
        item.textContent = text;
        item.dataset.value = text;
        item.dataset.id = id;
        if (inputElement.value === text) {
          item.classList.add("selected");
        }

        item.addEventListener("click", (e) => {
          e.stopPropagation();
          inputElement.value = text;
          searchInput.value = "";
          container.classList.remove("active");
          inputElement.dispatchEvent(new Event("change", { bubbles: true }));
          inputElement.dispatchEvent(new Event("input", { bubbles: true }));
        });

        listContainer.appendChild(item);
      });

      if (listContainer.children.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "custom-select-option";
        noResult.textContent = "No subjects found";
        noResult.style.color = "var(--text-light)";
        noResult.style.cursor = "default";
        listContainer.appendChild(noResult);
      }
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isActive = container.classList.contains("active");
      document.querySelectorAll(".custom-select").forEach(el => el.classList.remove("active"));
      if (!isActive) {
        container.classList.add("active");
        rebuildOptions();
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    optionsMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    searchInput.addEventListener("input", () => {
      rebuildOptions();
    });

    inputElement.addEventListener("syncCustom", () => {
      rebuildOptions();
    });
  },

  initCustomDropdowns() {
    document.querySelectorAll(".toolbar select, .admin-filters select, .admin-select, .filter-select, .profile-form-group select, #quizDifficultySelect").forEach(select => {
      UIHelper.convertSelectToCustomDropdown(select);
    });
    const subjectFilter = document.querySelector(".toolbar #subjectFilter, .admin-filters #subjectFilter");
    if (subjectFilter) {
      UIHelper.convertInputToCustomDropdown(subjectFilter);
    }
  }
};

// Global click outside to close dropdowns
document.addEventListener("click", () => {
  document.querySelectorAll(".custom-select").forEach(el => el.classList.remove("active"));
});

// Auto-run dropdown initialization on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  UIHelper.initCustomDropdowns();
});

// Expose individual helper functions directly to window scope to fulfill checklist prerequisites
window.showToast = UIHelper.showToast;
window.confirmAction = UIHelper.confirmAction;
window.setButtonLoading = UIHelper.setButtonLoading;
window.showInlineError = UIHelper.showInlineError;
window.clearInlineError = UIHelper.clearInlineError;
window.getFileTypeIcon = UIHelper.getFileTypeIcon;
window.initCustomDropdowns = UIHelper.initCustomDropdowns;

// AI API & UI Helper Extensions for Step 10. All responses, labels, and error messages are standardized here.
const AIUIHelper = {
  /**
   * 19.2. Error mapping helper
   * Standardizes HTTP status codes or error codes into user-friendly error messages.
   * @param {number|object} errorOrStatus - The HTTP status code or error object.
   * @returns {string} The standardized error message.
   */
  mapAiError(errorOrStatus) {
    const status = typeof errorOrStatus === "number" ? errorOrStatus : errorOrStatus?.status;
    const code = typeof errorOrStatus === "object" ? (errorOrStatus?.code || errorOrStatus?.data?.code) : "";

    // Priority 1: Explicit error code check for quota exhaustion (Step 13 Contract)
    if (code === "AI_QUOTA_EXCEEDED") {
      return "You have reached your daily AI question limit. Upgrade to PREMIUM or ULTRA for more.";
    }

    const errorMap = {
      400: "Your question is empty or too long.",
      401: "Please log in to use AI Q&A.",
      403: "You do not have permission to ask about this document.",
      404: "This document is not available.",
      409: "This document is not ready for AI yet. Please process it first.",
      422: "This document has no usable AI content.",
      429: "You have reached your daily AI question limit. Upgrade to PREMIUM or ULTRA for more.",
      503: "AI service is currently unavailable."
    };
    return errorMap[status] || "An unexpected AI error occurred. Please try again.";
  },

  /**
   * 19.3. Usage/model/token helper
   * Normalizes the AI usage response payload into a standardized structure.
   * @param {object} response - Raw response payload from the backend API.
   * @returns {object} Standardized usage metrics.
   */
  normalizeAiUsage(response) {
    // Handle both wrapped response envelope (response.data) and direct payload structures
    const target = response?.success && response?.data ? response.data : response;

    return {
      tier: target?.tier || "FREE",
      dailyLimit: typeof target?.dailyLimit === "number" ? target.dailyLimit : 0,
      usedToday: typeof target?.usedToday === "number" ? target.usedToday : 0,
      remainingQuestions: typeof target?.remainingQuestions === "number" ? target.remainingQuestions : 0,
      provider: target?.provider || "mock",
      modelName: target?.modelName || "mock",
      tokenUsageEstimated: target?.tokenUsageEstimated === true || target?.tokenUsageEstimated === "true"
    };
  },

  /**
   * 19.3. Model label helper
   * Maps technical model names to user-friendly presentation strings.
   * @param {string} modelName - The internal technical model identifier.
   * @returns {string} The formatted presentation label.
   */
  getAiModelLabel(modelName) {
    const labelMap = {
      "gemini-2.5-flash-lite": "Powered by Gemini Flash-Lite",
      "gemini-2.5-flash": "Powered by Gemini Flash",
      "mock": "Demo mode"
    };
    return labelMap[modelName] || "Powered by AI Assistant";
  },

  /**
   * 19.4. Source chunks helper
   * Standardizes backend source metadata into human-readable citation labels.
   * @param {object} chunk - Individual context piece used by the AI model.
   * @param {number} index - Index iteration count.
   * @returns {string} Standardized source string format.
   */
  formatAiSourceLabel(chunk, index) {
    if (chunk?.sourceLabel) {
      return chunk.sourceLabel;
    }

    if (chunk?.pageInfo) {
      return `Page ${chunk.pageInfo}`;
    }

    if (typeof chunk?.chunkIndex === "number") {
      return `Chunk ${chunk.chunkIndex + 1}`;
    }

    return `Chunk ${index + 1}`;
  }
};

// Expose individual helper functions directly to window scope to fulfill checklist prerequisites
window.mapAiError = AIUIHelper.mapAiError;
window.normalizeAiUsage = AIUIHelper.normalizeAiUsage;
window.getAiModelLabel = AIUIHelper.getAiModelLabel;
window.formatAiSourceLabel = AIUIHelper.formatAiSourceLabel;

// Also preserve the namespace export to guarantee zero breaking integrations for existing callers
window.UIHelper = UIHelper;

// ─────────────────────────────────────────────────────────────
// TIER BADGE HELPER (Step 11)
// ─────────────────────────────────────────────────────────────

/**
 * Returns an HTML string for a tier badge (FREE, PREMIUM, or ULTRA).
 * @param {string} tier - "FREE", "PREMIUM", or "ULTRA"
 * @returns {string} HTML badge string.
 */
function getTierBadgeHTML(tier) {
  if (tier === "ULTRA") {
    return `<span class="tier-badge tier-badge-ultra">ULTRA</span>`;
  }
  if (tier === "PREMIUM") {
    return `<span class="tier-badge tier-badge-premium">PREMIUM</span>`;
  }
  return `<span class="tier-badge tier-badge-free">FREE</span>`;
}

/**
 * Renders a tier badge into a given DOM element.
 * @param {HTMLElement} element - The container element to render into.
 * @param {string} tier - "FREE", "PREMIUM", or "ULTRA"
 */
function renderTierBadge(element, tier) {
  if (!element) return;
  element.innerHTML = getTierBadgeHTML(tier || "FREE");
}

// Expose globally for page scripts
window.getTierBadgeHTML = getTierBadgeHTML;
window.renderTierBadge = renderTierBadge;
// Alias per checklist requirement
window.formatTierBadge = getTierBadgeHTML;

/**
 * Displays a user-friendly quota error message.
 * Uses getQuotaErrorMessage() from account-api.js if available.
 * @param {Error} error - The error object from apiRequest().
 */
function showQuotaError(error) {
  // Delegate to getQuotaErrorMessage if account-api.js is loaded
  const resolved = typeof window.getQuotaErrorMessage === "function"
    ? window.getQuotaErrorMessage(error)
    : error.message || "You have reached your plan limit. Upgrade to continue.";

  if (typeof window.showToast === "function") {
    window.showToast(resolved, "error");
  } else {
    alert(resolved);
  }
}

// Expose globally
window.showQuotaError = showQuotaError;

/**
 * Formats usage progress as a human-readable string.
 * @param {number} used - Amount used (in bytes for storage, or count for others).
 * @param {number} limit - Maximum allowed amount.
 * @param {string} type - "storage" | "count" (default "count").
 * @returns {string} Formatted string e.g. "2.97 MB / 100 MB" or "3 / 10".
 */
function formatUsageProgress(used, limit, type = "count") {
  if (type === "storage") {
    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return "0 B";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };
    return `${formatBytes(used)} / ${formatBytes(limit)}`;
  }
  return `${used ?? 0} / ${limit ?? "∞"}`;
}

// Expose globally
window.formatUsageProgress = formatUsageProgress;

// ─────────────────────────────────────────────────────────────
// AI LEARNING UI HELPERS (Step 14)
// ─────────────────────────────────────────────────────────────

/**
 * Maps AI Learning specific errors (Summary, Flashcard, Quiz).
 * Handles quota limits, invalid configurations, and readiness states.
 * @param {Error|object} error
 * @returns {string} User-friendly error message.
 */
function mapAiLearningError(error) {
  const code = error?.code || error?.data?.code || "";
  const status = error?.status;

  // Document states
  if (
    status === 409 ||
    code === "DOCUMENT_NOT_READY_FOR_AI" ||
    code === "DOCUMENT_PROCESSING"
  ) {
    return "This document is not ready for AI generation yet. Please process it first or wait for processing to finish.";
  }
  if (code === "DOCUMENT_PROCESS_FAILED") {
    return "This document failed processing. Please try processing it again.";
  }
  if (code === "DOCUMENT_CONTENT_EMPTY") {
    return "This document has no readable content for AI generation.";
  }

  // Quota errors
  if (code === "SUMMARY_QUOTA_EXCEEDED") {
    return "You have reached your daily summary generation limit. Please upgrade your tier for more.";
  }
  if (code === "FLASHCARD_QUOTA_EXCEEDED") {
    return "You have reached your daily flashcard generation limit. Please upgrade your tier for more.";
  }
  if (code === "QUIZ_QUOTA_EXCEEDED") {
    return "You have reached your daily quiz generation limit. Please upgrade your tier for more.";
  }

  // Validation errors
  if (code === "INVALID_FLASHCARD_COUNT") {
    return "Invalid flashcard count. Must be between 3 and your tier's maximum limit.";
  }
  if (code === "INVALID_QUIZ_QUESTION_COUNT") {
    return "Invalid quiz question count. Must be between 3 and your tier's maximum limit.";
  }
  if (code === "INVALID_QUIZ_DIFFICULTY") {
    return "Invalid quiz difficulty selected. Please choose Easy, Medium, Hard, or Mixed.";
  }

  // Provider or server errors
  if (code === "AI_PROVIDER_RATE_LIMITED") {
    return "AI quota/rate limit reached. Please try later.";
  }
  if (code === "AI_PROVIDER_TIMEOUT") {
    return "AI response timed out. Please try again with shorter content.";
  }
  if (code === "AI_PROVIDER_AUTH_FAILED") {
    return "AI configuration or authentication failed. Please contact support.";
  }
  if (code === "AI_PROVIDER_BAD_REQUEST") {
    return "AI provider rejected the request as invalid. Please check the document content.";
  }
  if (code === "AI_OUTPUT_INVALID") {
    return "AI returned an invalid format. Try generating fewer questions/cards.";
  }
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    code === "AI_PROVIDER_ERROR" ||
    code === "AI_PROVIDER_UNAVAILABLE"
  ) {
    return "Gemini is temporarily unavailable. Please wait a moment and try again.";
  }

  if (status === 403) {
    return "You do not have permission to generate AI content for this document.";
  }
  if (status === 404) {
    return "The requested AI content or document was not found.";
  }

  return error?.message || "An unexpected error occurred during AI generation.";
}

/**
 * Formats the generatedAt timestamp into a readable format.
 * @param {string} isoString
 * @returns {string}
 */
function formatGeneratedAt(isoString) {
  if (!isoString) return "";
  let dateStr = String(isoString);
  if (!dateStr.endsWith("Z") && !dateStr.includes("+")) {
    dateStr += "Z";
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Formats difficulty enum to title case (e.g. EASY -> Easy).
 * @param {string} difficulty
 * @returns {string}
 */
function formatDifficulty(difficulty) {
  if (!difficulty) return "Normal";
  const str = String(difficulty).toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper loading state / disable button khi generating.
 * @param {HTMLButtonElement} button
 * @param {boolean} isGenerating
 * @param {string} loadingText
 */
function setGeneratingState(button, isGenerating, loadingText = 'Generating...') {
  if (typeof window.setButtonLoading === 'function') {
    window.setButtonLoading(button, isGenerating, loadingText);
  } else if (button) {
    if (isGenerating) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.textContent = loadingText;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
    }
  }
}

window.mapAiLearningError = mapAiLearningError;
window.formatGeneratedAt = formatGeneratedAt;
window.formatDifficulty = formatDifficulty;
window.setGeneratingState = setGeneratingState;

/**
 * Render a safe, minimal subset of Markdown produced by the AI into HTML.
 *
 * Security: the input is HTML-escaped FIRST, then only our own tags are injected,
 * so AI/document text can never inject markup (no XSS).
 *
 * Supported: **bold**, *italic* / _italic_, `inline code`, bullet lists (`* ` or `- `),
 * numbered lists (`1. `), paragraphs and line breaks. Everything else renders literally.
 *
 * Returns an HTML string. Callers assign it to element.innerHTML for assistant messages only.
 */
function renderAiMarkdown(text) {
  if (text === null || text === undefined) return "";

  const escapeHtml = (s) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Inline formatting applied AFTER escaping (so the source * and ` are literal chars).
  const inline = (s) => s
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");

  // A bullet whose remaining content is only decoration (e.g. a stray "* **") is dropped.
  const isEmptyItem = (s) => s.replace(/[*_`\s]/g, "").length === 0;

  const lines = escapeHtml(text).replace(/\r\n/g, "\n").split("\n");

  let html = "";
  let listType = null; // "ul" | "ol" | null
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html += `<p>${inline(paragraph.join("<br>"))}</p>`;
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };
  const openList = (type) => {
    if (listType !== type) {
      closeList();
      html += `<${type}>`;
      listType = type;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);

    if (bullet) {
      flushParagraph();
      if (isEmptyItem(bullet[1])) continue;
      openList("ul");
      html += `<li>${inline(bullet[1])}</li>`;
    } else if (numbered) {
      flushParagraph();
      openList("ol");
      html += `<li>${inline(numbered[1])}</li>`;
    } else if (line === "") {
      closeList();
      flushParagraph();
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  closeList();
  flushParagraph();

  return html;
}

window.renderAiMarkdown = renderAiMarkdown;
