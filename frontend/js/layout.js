/**
 * Application Shell and Authentication Guard Manager (Cookie Auth Flow Mode).
 * Updated in Step 8 for Public Community Library MVP Integration.
 */

async function initializeLayout() {
  // 1. EXECUTE AUTH GUARD SYSTEM BY CALLING /api/auth/me ENDPOINT
  const isAuthenticated = await checkAuthenticationStatus();

  // 2. REFINE SIDEBAR MENU BASED ON AUTH STATUS
  renderDynamicSidebar(isAuthenticated);

  // 3. ATTACH LOGOUT FLOW LISTENERS
  initializeLogoutFlow();

  return isAuthenticated;
}

window.authReady =
  document.readyState === "loading"
    ? new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", async () => {
          resolve(await initializeLayout());
        });
      })
    : Promise.resolve(initializeLayout());

/**
 * Validates session status dynamically against the backend security context.
 * Seamlessly allows unauthenticated guest access to public routes without disruptive login redirects.
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

    // Step 8 Security Rule: Only redirect to login screen if the route explicitly demands authentication
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

  // Filter links based on visibility flags, authentication state, and health/admin restrictions
  const visibleMenus = NAVIGATION_MENU.filter(item => {
    if (item.hidden) return false; // Filter out structural routes like detail pages
    if (item.hideWhenAuth && isAuthenticated) return false;
    if (item.requiresAuth && !isAuthenticated) return false;

    // Step 6D Security & IA Cleanup: Explicitly deny standard users access to internal technical routes
    if (item.url && (item.url.includes("health") || item.url.includes("api-health"))) return false;

    return true;
  });

  // Re-render links safely inside the container with standardized icon and text wrappers
  navContainer.innerHTML = visibleMenus
    .map(item => `
      <a href="${item.url}" class="nav-link">
        <span class="nav-icon">${item.icon || ICON_INFO}</span>
        <span class="nav-text">${item.name}</span>
      </a>
    `)
    .join("");

  // Append a dedicated Logout link if user is fully logged in
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    // Safely clear out any pre-existing footer to prevent duplicate rendering artifacts (for both guest and logged-in states)
    const oldFooter = sidebar.querySelector(".sidebar-footer");
    if (oldFooter) oldFooter.remove();

    if (isAuthenticated) {
      const logoutContainer = document.createElement("div");
      logoutContainer.className = "sidebar-footer";
      logoutContainer.innerHTML = `
        <hr class="sidebar-divider" />
        <a href="#" id="sidebarLogoutBtn" class="nav-link nav-link-logout">
          <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"></path></svg></span>
          <span class="nav-text">Logout</span>
        </a>
      `;
      sidebar.appendChild(logoutContainer);
    }
  }

  // Delegate calculation back to navigation helper to append .active class
  initializeActiveMenu();

  // Initialize FE3 Collapse/Expand functionality
  initializeSidebarCollapse();
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

/**
 * FE3 Standardized Layout - Manages the Sidebar collapse state behavior
 * Persists layout footprint settings inside local application storage catalog.
 */
function initializeSidebarCollapse() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  // 1. Force the collapsed state from storage immediately to avoid interface lag.
  //    Apply no-transition FIRST to suppress the expand→collapse flash on page load.
  const isCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
  sidebar.classList.add("no-transition");
  if (isCollapsed) {
    sidebar.classList.add("collapsed");
  } else {
    sidebar.classList.remove("collapsed");
  }
  // Re-enable transitions after the initial paint settles (next animation frame)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sidebar.classList.remove("no-transition");
    });
  });

  const logoContainer = document.querySelector(".logo, .sidebar-brand");

  // Guard clause: Avoid duplicating the toggle button if it already exists
  if (sidebar.querySelector(".sidebar-toggle-btn")) return;

  // Standardize Logo text wrapper for FE3 collapsed layout visibility state rules
  if (logoContainer && !logoContainer.querySelector(".logo-text")) {
    const rawText = logoContainer.textContent.trim();
    if (rawText) {
      logoContainer.innerHTML = `<span class="logo-text">${rawText}</span>`;
    }
  }

  // 2. Inject a responsive toggle button into the brand layout zone
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "sidebar-toggle-btn";
  toggleBtn.style.cssText = `
    background: transparent;
    border: none;
    color: inherit;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.2s;
  `;
  toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M3 12h18M3 18h18"></path></svg>';
  toggleBtn.setAttribute("aria-label", "Toggle Sidebar Navigation");

  if (logoContainer) {
    logoContainer.appendChild(toggleBtn);
  } else {
    sidebar.insertBefore(toggleBtn, sidebar.firstChild);
  }

  // Hover feedback state effect for the injected action utility
  toggleBtn.addEventListener("mouseenter", () => toggleBtn.style.background = "var(--primary-light)");
  toggleBtn.addEventListener("mouseleave", () => toggleBtn.style.background = "transparent");

  // 3. Attach click event listener to toggle classes and persist in storage
  toggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sidebar.classList.toggle("collapsed");

    // Sync back real-time changes directly into the client cache storage
    const currentCollapsedState = sidebar.classList.contains("collapsed");
    localStorage.setItem("sidebar-collapsed", currentCollapsedState);
  });
}
// End of layout component manager file.