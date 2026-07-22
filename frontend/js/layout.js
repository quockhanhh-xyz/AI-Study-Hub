/**
 * Application Shell and Authentication Guard Manager (Cookie Auth Flow Mode).
 * Updated in Step 8 for Public Community Library MVP Integration.
 */


async function initializeLayout() {
  bootstrapSidebarCollapseState();

  // 1. EXECUTE AUTH GUARD SYSTEM BY CALLING /api/auth/me ENDPOINT
  const isAuthenticated = await checkAuthenticationStatus();


  // 2. REFINE SIDEBAR MENU BASED ON AUTH STATUS
  renderDynamicSidebar(isAuthenticated);

  // 3. RENDER SHARED ADMIN TOPBAR IF ON ADMIN PAGE
  const currentPage = getCurrentPageName();
  const currentRoute = NAVIGATION_MENU.find(item => item.url === currentPage);
  if (currentRoute && currentRoute.requiresAdmin) {
    renderAdminTopbar();
  }

  // 4. ATTACH LOGOUT FLOW LISTENERS
  initializeLogoutFlow();

  return isAuthenticated;
}

function renderAdminTopbar() {
  const oldTopbar = document.querySelector(".admin-topbar");
  if (oldTopbar) {
    oldTopbar.remove();
  }

  const pageHeader = document.querySelector(".admin-page-header");
  if (!pageHeader || pageHeader.querySelector("#globalHeaderWidgets")) return;

  let adminName = "System Admin";
  const userStr = localStorage.getItem("currentUser");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      adminName = user.fullName || user.email || adminName;
    } catch (e) { }
  }

  const initialLetter = (adminName || "A").charAt(0).toUpperCase();

  const widgets = document.createElement("div");
  widgets.id = "globalHeaderWidgets";
  widgets.style.cssText = "display: flex; align-items: center; gap: 16px;";
  widgets.innerHTML = `
      <div class="notification-container">
        <button class="notification-bell-btn" id="adminNotifBellBtn" aria-label="Notifications" title="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" aria-hidden="true" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span class="notification-badge" id="adminNotifBadge" style="display: none;">0</span>
        </button>
      </div>
      <div class="user-profile-chip" onclick="window.location.href='admin-profile.html'" style="cursor: pointer;">
        <div class="user-avatar-initials">${initialLetter}</div>
        <div class="user-profile-info">
          <span class="user-profile-name">${adminName}</span>
        </div>
      </div>
  `;

  if (pageHeader.children.length === 1) {
    pageHeader.appendChild(widgets);
  } else if (pageHeader.children.length > 1) {
    pageHeader.children[1].appendChild(widgets);
  }
}


// Immediately restore sidebar state synchronously (script is at end of body)
bootstrapSidebarCollapseState();

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
 * Enhanced in Step 8A to enforce secure multi-stage query parameter dynamic redirection.
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
      // Normalize ROLE_ADMIN/ROLE_USER to ADMIN/USER for compatibility
      if (result.data.role === 'ROLE_ADMIN') result.data.role = 'ADMIN';
      if (result.data.role === 'ROLE_USER') result.data.role = 'USER';

      localStorage.setItem("currentUser", JSON.stringify(result.data));
    }

    const user = result && result.data ? result.data : null;

    if (currentRoute.requiresAuth && !user) {
      throw new Error("User session required but not found.");
    }

    // Admin role check: if page requires admin, redirect if user is not admin
    if (currentRoute.requiresAdmin) {
      if (!user || user.role !== 'ADMIN') {
        console.warn("Access denied. User is not an admin.");
        window.location.href = "dashboard.html";
        return true;
      }
    } else if (!currentRoute.hideWhenAuth) {
      // If the page does not require Admin and is not a login/register page
      if (user && user.role === 'ADMIN') {
        console.warn("Access denied. Admin cannot access user pages.");
        window.location.href = "admin-dashboard.html";
        return true;
      }
    }

    // Guard clause: If page is only for guests (like login.html) and user session is active -> Kick to target destination
    if (currentRoute.hideWhenAuth && user) {
      const urlParams = new URLSearchParams(window.location.search);
      let redirectUrl = urlParams.get("redirect");
      let target = "dashboard.html";

      if (redirectUrl) {
        try {
          const parsed = new URL(redirectUrl, window.location.href);
          if (parsed.origin === window.location.origin && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
            target = parsed.pathname + parsed.search + parsed.hash;
          } else {
            console.warn("Mismatched open-redirect origin or protocol detected in layout.");
          }
        } catch (e) {
          console.warn("Malicious or mismatched open-redirect origin detected. Fallback applied.", e);
        }
      }

      window.location.href = target;
      return true;
    }


    return true;
  } catch (error) {
    const wasLoggedIn = !!localStorage.getItem("currentUser");
    // If endpoint fails, user session is unauthenticated or expired
    localStorage.removeItem("currentUser");

    // ALWAYS try to clear any invalid session cookie on the backend
    try { 
      const logoutUrl = typeof API_BASE_URL !== 'undefined' ? `${API_BASE_URL}/api/auth/logout` : '/api/auth/logout';
      await fetch(logoutUrl, { method: "POST", credentials: "include" }); 
    } catch (e) {}

    if (wasLoggedIn) {
      const currentQuery = window.location.search ? window.location.search : "";
      window.location.href = `login.html?redirect=${encodeURIComponent(currentPage + currentQuery)}`;
      return false;
    }

    // Step 8 Security Rule: Only redirect to login screen if the route explicitly demands authentication
    if (currentRoute.requiresAuth) {
      // Step 8A Trace Parameter Tracking: Back-propagate the current intent route state to preserve post-auth redirection
      const currentQuery = window.location.search ? window.location.search : "";
      window.location.href = `login.html?redirect=${encodeURIComponent(currentPage + currentQuery)}`;
    }

    return false;
  }
}


/**
 * Dynamically updates sidebar layout according to authentication status.
 * Step 8A Optimization: Completely strips structural sidebar layouts inside Guest Auth pages.
 * @param {boolean} isAuthenticated
 */
function renderDynamicSidebar(isAuthenticated) {
  const sidebar = document.querySelector(".sidebar");
  const navContainer = document.querySelector(".sidebar-nav");
  const currentPage = getCurrentPageName();
  const currentRoute = NAVIGATION_MENU.find(item => item.url === currentPage);


  // Step 8A Guest Auth Pages Navigation Constraint Rule
  if (!isAuthenticated && currentRoute && currentRoute.hideWhenAuth) {
    if (sidebar) {
      // Preserve or build a minimalist landing container for Guest navigation alternative
      const oldFooter = sidebar.querySelector(".sidebar-footer");
      if (oldFooter) oldFooter.remove();

      if (navContainer) {
        navContainer.innerHTML = `
          <a href="community.html" class="nav-link">
            <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg></span>
            <span class="nav-text" style="font-weight: 500;">Browse Community Library</span>
          </a>
        `;
      }

      // Force collapse layout or hide complex control toggles from login interface shell
      const toggleBtn = sidebar.querySelector(".sidebar-toggle-btn");
      if (toggleBtn) toggleBtn.style.display = "none";
    }
    return;
  }


  if (!navContainer) return;


  // Filter links based on visibility flags, authentication state, and health/admin restrictions
  const visibleMenus = NAVIGATION_MENU.filter(item => {
    if (item.hidden) return false; // Filter out structural routes like detail pages
    if (item.hideWhenAuth && isAuthenticated) return false;
    if (item.requiresAuth && !isAuthenticated) return false;

    let userRole = null;
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userRole = user.role;
      } catch (e) { }
    }

    // Separate ADMIN and USER menus completely
    if (userRole === 'ADMIN') {
      if (!item.requiresAdmin) return false;
    } else {
      if (item.requiresAdmin) return false;
    }

    // Step 6D Security & IA Cleanup: Explicitly deny standard users access to internal technical routes
    if (item.url && (item.url.includes("health") || item.url.includes("api-health"))) return false;

    return true;
  });


  // Check if we are rendering for ADMIN to add a section label
  const isAdminView = visibleMenus.length > 0 && visibleMenus[0].requiresAdmin;

  // Re-render links safely inside the container with standardized icon and text wrappers
  let navHtml = "";
  if (isAdminView) {
    navHtml += `<div class="nav-section-title" style="padding: 12px 24px 8px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; transition: opacity 0.3s ease; overflow: hidden; white-space: nowrap;">Admin Console</div>`;
  }

  navHtml += visibleMenus
    .map(item => `
      <a href="${item.url}" class="nav-link" title="${item.name}">
        <span class="nav-icon">${item.icon || ICON_INFO}</span>
        <span class="nav-text">${item.name}</span>
      </a>
    `)
    .join("");

  navContainer.innerHTML = navHtml;


  // Append a dedicated Logout link if user is fully logged in
  if (sidebar) {
    // Safely clear out any pre-existing footer to prevent duplicate rendering artifacts (for both guest and logged-in states)
    const oldFooter = sidebar.querySelector(".sidebar-footer");
    if (oldFooter) oldFooter.remove();


    if (isAuthenticated) {
      const logoutContainer = document.createElement("div");
      logoutContainer.className = "sidebar-footer";
      logoutContainer.innerHTML = `
        <hr class="sidebar-divider" />
        <a href="#" id="sidebarLogoutBtn" class="nav-link nav-link-logout" title="Logout">
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
      // Flush any active document processing polling sessions before tearing down the session
      if (typeof window.clearAllPollingSessions === "function") {
        window.clearAllPollingSessions();
      }

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
  bootstrapSidebarCollapseState();


  const logoContainer = document.querySelector(".logo, .sidebar-brand");


  if (sidebar.querySelector(".sidebar-toggle-btn")) return;

  if (logoContainer) {
    logoContainer.style.display = "";
  }

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

function bootstrapSidebarCollapseState() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const isCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
  sidebar.classList.add("no-transition");
  sidebar.classList.toggle("collapsed", isCollapsed);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sidebar.classList.remove("no-transition");
    });
  });
}
// End of layout component manager file.
