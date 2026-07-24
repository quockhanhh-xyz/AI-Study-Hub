// theme.js
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.dataset.theme = 'dark';
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Dispatch event so other scripts (like charts) can update
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
}

// Apply theme immediately to prevent flashing
initTheme();

// Expose to window for inline onclick handlers
window.toggleTheme = toggleTheme;

// Dynamically inject the toggle button into the header
document.addEventListener("DOMContentLoaded", () => {
    // Try immediately
    injectToggleButton();
    
    // Also try after a short delay to account for layout.js/notification.js async rendering
    setTimeout(injectToggleButton, 500);
    setTimeout(injectToggleButton, 1500);
});

function injectToggleButton() {
    if (document.getElementById("themeToggleBtn")) return;
    
    let headerWidgets = document.getElementById("globalHeaderWidgets");
    if (!headerWidgets) {
        // Fallback for some pages that might not use globalHeaderWidgets
        headerWidgets = document.querySelector(".global-top-bar-right") || document.querySelector(".admin-topbar");
        if (!headerWidgets) return;
    }
    
    const toggleHtml = `
      <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    `;
    
    const btn = document.createElement('button');
    btn.id = "themeToggleBtn";
    btn.className = "theme-toggle-btn";
    btn.innerHTML = toggleHtml;
    btn.onclick = toggleTheme;
    btn.setAttribute("aria-label", "Toggle Theme");
    
    // Style the button directly to ensure it works without modifying CSS files
    btn.style.cssText = `
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 50%;
        transition: background 0.2s, color 0.2s;
        margin-right: 12px;
    `;
    
    btn.addEventListener('mouseover', () => {
        btn.style.background = 'var(--border)';
        btn.style.color = 'var(--primary)';
    });
    btn.addEventListener('mouseout', () => {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
    });
    
    // Find where to insert it
    const notifContainer = headerWidgets.querySelector('.notification-container');
    const rightBar = headerWidgets.querySelector('.global-top-bar-right');
    
    if (rightBar && rightBar.parentNode === headerWidgets) {
        rightBar.insertBefore(btn, rightBar.firstChild);
    } else if (notifContainer) {
        headerWidgets.insertBefore(btn, notifContainer);
    } else {
        headerWidgets.insertBefore(btn, headerWidgets.firstChild);
    }
}
