/**
 * Application Shell and Authentication Guard Manager.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Sync auth state by checking both token and user object data concurrently
  const token = localStorage.getItem("accessToken");
  const currentUserRaw = localStorage.getItem("currentUser");
  const isAuthenticated = !!token && !!currentUserRaw;

  // 1. EXECUTE AUTH GUARD SYSTEM
  handleAuthGuard(isAuthenticated);

  // 2. REFINE SIDEBAR MENU BASED ON AUTH STATUS
  renderDynamicSidebar(isAuthenticated);

  // 3. ATTACH LOGOUT FLOW LISTENERS
  initializeLogoutFlow();
});

/**
 * Restricts unauthenticated access to private core pages.
 * @param {boolean} isAuthenticated
 */
function handleAuthGuard(isAuthenticated) {
  const currentPage = getCurrentPageName();

  // Find current route configuration from navigation menu dictionary
  const currentRoute = NAVIGATION_MENU.find(item => item.url === currentPage);

  // Guard clause: If page requires auth and user is missing credentials, kick to login
  if (currentRoute && currentRoute.requiresAuth && !isAuthenticated) {
    window.location.href = "login.html";
  }
}

/**
 * Dynamically updates sidebar layout according to authentication status.
 * Filters out structural hidden components to prevent rendering in views.
 * @param {boolean} isAuthenticated
 */
function renderDynamicSidebar(isAuthenticated) {
  const navContainer = document.querySelector(".sidebar-nav");
  if (!navContainer) return;

  // Filter links based on visibility flags and authentication state
  const visibleMenus = NAVIGATION_MENU.filter(item => {
    if (item.hidden) return false; // Filter out structural routes like detail pages
    if (item.hideWhenAuth && isAuthenticated) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  // Re-render links safely inside the container
  navContainer.innerHTML = visibleMenus
    .map(item => `<a href="${item.url}" class="nav-link">${item.name}</a>`)
    .join("");

  // Append a dedicated Logout link if user is fully logged in
  if (isAuthenticated) {
    const logoutContainer = document.createElement("div");
    logoutContainer.className = "sidebar-footer";
    logoutContainer.innerHTML = `
      <hr class="sidebar-divider" />
      <a href="#" id="sidebarLogoutBtn" class="nav-link nav-link-logout">Logout</a>
    `;
    navContainer.appendChild(logoutContainer);
  }

  // Delegate calculation back to navigation helper to append .active class
  initializeActiveMenu();
}

/**
 * Coordinates token clearing, storage reset, and graceful redirection on logout action.
 */
function initializeLogoutFlow() {
  // Use event delegation on body or look directly since it's dynamically added
  document.body.addEventListener("click", (e) => {
    const logoutBtn = e.target.closest("#sidebarLogoutBtn");
    if (!logoutBtn) return;

    e.preventDefault();

    // Clear token session items safely
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");

    // Gracefully kick the user back to the entry gateway login screen
    window.location.href = "login.html";
  });
}

// End of layout component manager file.
