/**
 * Application Shell and Authentication Guard Manager (Cookie Auth Flow Mode).
 */
document.addEventListener("DOMContentLoaded", async () => {
  // 1. EXECUTE AUTH GUARD SYSTEM BY CALLING /api/auth/me ENDPOINT
  const isAuthenticated = await checkAuthenticationStatus();

  // 2. REFINE SIDEBAR MENU BASED ON AUTH STATUS
  renderDynamicSidebar(isAuthenticated);

  // 3. ATTACH LOGOUT FLOW LISTENERS
  initializeLogoutFlow();
});

/**
 * Validates session status dynamically against the backend security context.
 * @returns {Promise<boolean>}
 */
async function checkAuthenticationStatus() {
  const currentPage = getCurrentPageName();
  const currentRoute = NAVIGATION_MENU.find(item => item.url === currentPage);

  // Optimistic skip: If the page doesn't care about auth configuration, return current state directly
  if (!currentRoute) return false;

  try {
    // Explicitly bypass global interceptor redirect to let layout component manage traffic independently
    const result = await get("/api/auth/me", { skipUnauthorizedRedirect: true });

    // If successful, backfill or keep currentUser info active for UI layout
    if (result && result.data) {
      localStorage.setItem("currentUser", JSON.stringify(result.data));
    }

    // Guard clause: If page is only for guests (like login.html) and user session is active -> Kick to dashboard
    if (currentRoute.hideWhenAuth) {
      window.location.href = "dashboard.html";
      return true;
    }

    return true;
  } catch (error) {
    // If endpoint fails, user session is unauthenticated or expired
    localStorage.removeItem("currentUser");

    // Guard clause: If page explicitly requires auth and validation failed -> Kick to login
    if (currentRoute.requiresAuth) {
      window.location.href = "login.html";
    }

    return false;
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
 * Coordinates backend session removal, storage reset, and graceful redirection on logout action.
 */
function initializeLogoutFlow() {
  // Use event delegation on body since layout links are appended dynamically
  document.body.addEventListener("click", async (e) => {
    const logoutBtn = e.target.closest("#sidebarLogoutBtn");
    if (!logoutBtn) return;

    e.preventDefault();

    try {
      // Trigger API sign-out to instruct backend to clear HttpOnly auth session cookies
      await post("/api/auth/logout");
    } catch (error) {
      console.warn("Backend logout session cleanup failed, performing client fallback...", error);
    } finally {
      // Clear remaining metadata objects from storage catalog safely
      localStorage.removeItem("currentUser");

      // Gracefully kick the user back to the entry gateway login screen
      window.location.href = "login.html";
    }
  });
}

// End of layout component manager file.