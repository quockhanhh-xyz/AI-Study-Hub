/**
 * Application Shell and Authentication Guard Manager (Cookie Auth Flow Mode).
 * Updated in Step 8 for Public Community Library MVP Integration.
 */


async function initializeLayout() {
  bootstrapSidebarCollapseState();

  // Optimistically render sidebar using cached user data to prevent UI flicker
  const cachedUserStr = localStorage.getItem("currentUser");
  let isOptimisticallyAuthenticated = false;
  if (cachedUserStr) {
    try {
      const user = JSON.parse(cachedUserStr);
      isOptimisticallyAuthenticated = !!user;
    } catch (e) {}
  }
  renderDynamicSidebar(isOptimisticallyAuthenticated);

  // 1. EXECUTE AUTH GUARD SYSTEM BY CALLING /api/auth/me ENDPOINT
  const isAuthenticated = await checkAuthenticationStatus();

  // 2. REFINE SIDEBAR MENU BASED ON AUTH STATUS (If changed)
  if (isAuthenticated !== isOptimisticallyAuthenticated) {
      renderDynamicSidebar(isAuthenticated);
  }

  // 3. RENDER SHARED ADMIN TOPBAR IF ON ADMIN PAGE
  const currentPage = getCurrentPageName();
  const currentRoute = NAVIGATION_MENU.find(item => item.url === currentPage);
  if (currentRoute && currentRoute.requiresAdmin) {
    renderAdminTopbar();
  }

  // 4. ATTACH LOGOUT FLOW LISTENERS
  initializeLogoutFlow();

  // 5. ATTACH QUICK PROFILE POPUP LISTENERS
  initializeQuickProfilePopup();

  if (isAuthenticated) {
    injectFloatingChatbot();
  }

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
  
  if (typeof window.injectToggleButton === 'function') {
    window.injectToggleButton();
  }
}


// Immediately restore sidebar state synchronously (script is at end of body)
bootstrapSidebarCollapseState();
initializeSidebarCollapse();

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

  // Remove existing sidebar stats block if it exists to avoid duplication
  if (sidebar) {
    const oldStats = sidebar.querySelector(".sidebar-user-stats");
    if (oldStats) oldStats.remove();
  }

  // Render Premium User Statistics at the top of the sidebar for USER role
  if (isAuthenticated && sidebar) {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'USER') {
          // Initialize statistics from cache to prevent jumping/flickering UI layout shifts
          let cachedStats = { followersCount: 0, publicDocumentCount: 0, upvotesCount: 0 };
          const cacheStr = localStorage.getItem("sidebarStats");
          if (cacheStr) {
            try {
              cachedStats = JSON.parse(cacheStr);
            } catch (err) {}
          }

          const statsContainer = document.createElement("div");
          statsContainer.className = "sidebar-user-stats";
          statsContainer.style.cssText = "padding: 0 16px; margin: 6px 0 12px 0; text-align: center;";
          statsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-around; gap: 4px;">
              <div style="flex: 1; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.location.href='profile.html?tab=network'">
                <span id="sidebarFollowers" style="display: block; font-size: 18px; font-weight: 700; color: var(--text-main);">${cachedStats.followersCount}</span>
                <span style="display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.05em;">Followers</span>
              </div>
              <div style="flex: 1; border-left: 1px solid var(--surface-muted); border-right: 1px solid var(--surface-muted); cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.location.href='profile.html?tab=uploads'">
                <span id="sidebarUploads" style="display: block; font-size: 18px; font-weight: 700; color: var(--text-main);">${cachedStats.publicDocumentCount}</span>
                <span style="display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.05em;">Uploads</span>
              </div>
              <div style="flex: 1; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.location.href='profile.html?tab=uploads'">
                <span id="sidebarUpvotes" style="display: block; font-size: 18px; font-weight: 700; color: var(--text-main);">${cachedStats.upvotesCount}</span>
                <span style="display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.05em;">Upvotes</span>
              </div>
            </div>
            <a href="upload.html" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 10px; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 9999px; text-decoration: none; background: #f05a28; border: none; color: #fff; box-shadow: 0 4px 10px rgba(240, 90, 40, 0.2); box-sizing: border-box; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>New Create</span>
            </a>
          `;
          
          const logo = sidebar.querySelector(".logo");
          if (logo) {
            logo.after(statsContainer);
          } else {
            sidebar.prepend(statsContainer);
          }

          // Fetch stats dynamically and populate
          (async () => {
            try {
              const myUserId = user.userId;
              if (myUserId) {
                const res = await get(`/api/users/${myUserId}/public-profile`, { skipUnauthorizedRedirect: true });
                if (res && res.data) {
                  const sf = document.getElementById("sidebarFollowers");
                  const su = document.getElementById("sidebarUploads");
                  const sv = document.getElementById("sidebarUpvotes");
                  
                  const freshStats = {
                    followersCount: res.data.followersCount || 0,
                    publicDocumentCount: res.data.publicDocumentCount || 0,
                    upvotesCount: res.data.upvotesCount || 0
                  };
                  localStorage.setItem("sidebarStats", JSON.stringify(freshStats));

                  if (sf) sf.textContent = freshStats.followersCount;
                  if (su) su.textContent = freshStats.publicDocumentCount;
                  if (sv) sv.textContent = freshStats.upvotesCount;
                }
              }
            } catch (err) {
              console.warn("Could not fetch sidebar stats:", err);
            }
          })();
        }
      } catch (e) {
        console.error("Failed to render sidebar user stats:", e);
      }
    }
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

  // Restore sidebar scroll position from sessionStorage
  if (sidebar) {
    const savedScroll = sessionStorage.getItem("sidebarScrollTop");
    
    // Save scroll position immediately before unloading the page
    window.addEventListener("beforeunload", () => {
      sessionStorage.setItem("sidebarScrollTop", sidebar.scrollTop);
    });

    if (savedScroll) {
      // Defer scroll recovery to let the DOM layout stabilize and prevent initial browser scroll resets
      setTimeout(() => {
        sidebar.scrollTop = parseInt(savedScroll, 10);
        sidebar.addEventListener("scroll", (e) => {
          sessionStorage.setItem("sidebarScrollTop", e.target.scrollTop);
        });
      }, 100);
    } else {
      sidebar.addEventListener("scroll", (e) => {
        sessionStorage.setItem("sidebarScrollTop", e.target.scrollTop);
      });
    }
  }
}


const confirmLogoutModalHtml = `
  <div id="logoutConfirmModal" class="modal-overlay" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
      <div class="modal-content card" style="width: 100%; max-width: 400px; background: var(--surface); border-radius: 16px; padding: 24px; border: none; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); text-align: center; color: var(--text-main);">
          <div style="width: 48px; height: 48px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
          </div>
          <h3 style="font-size: 20px; font-weight: 700; color: var(--text-main); margin: 0 0 8px 0;">Sign out?</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">You will need to sign in again to access your documents and AI tools.</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
              <button type="button" id="confirmLogoutCancel" class="btn btn-secondary" style="flex: 1; margin: 0;">Cancel</button>
              <button type="button" id="confirmLogoutProceed" class="btn btn-primary" style="flex: 1; margin: 0; background: #ef4444; border-color: #ef4444; color: #ffffff;">Sign out</button>
          </div>
      </div>
  </div>
`;

async function executeLogout() {
  try {
    if (typeof post === "function") {
      await post("/api/auth/logout");
    } else {
      const logoutUrl = typeof API_BASE_URL !== "undefined" ? `${API_BASE_URL}/api/auth/logout` : "/api/auth/logout";
      await fetch(logoutUrl, { method: "POST", credentials: "include" });
    }
  } catch (error) {
    console.warn("Backend logout session cleanup failed, performing client fallback...", error);
  } finally {
    if (typeof window.clearAllPollingSessions === "function") {
      window.clearAllPollingSessions();
    }
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  }
}

/**
 * Coordinates backend session removal, storage reset, and graceful redirection on logout action.
 */
function initializeLogoutFlow() {
  document.body.addEventListener("click", (e) => {
    const logoutBtn = e.target.closest("#sidebarLogoutBtn");
    if (!logoutBtn) return;
    e.preventDefault();

    let modal = document.getElementById("logoutConfirmModal");
    if (!modal) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = confirmLogoutModalHtml.trim();
      modal = tempDiv.firstChild;
      document.body.appendChild(modal);

      document.getElementById("confirmLogoutCancel").addEventListener("click", () => {
        modal.style.display = "none";
        modal.remove();
      });

      document.getElementById("confirmLogoutProceed").addEventListener("click", async () => {
        modal.style.display = "none";
        modal.remove();
        await executeLogout();
      });

      modal.addEventListener("click", (evt) => {
        if (evt.target === modal) {
          modal.style.display = "none";
          modal.remove();
        }
      });
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


  const logoContainer = document.querySelector(".logo, .sidebar-brand");


  if (sidebar.querySelector(".sidebar-toggle-btn")) return;

  if (logoContainer) {
    logoContainer.style.display = "";
    logoContainer.classList.add("brand-flex");
  }

  // Standardize Logo text wrapper for FE3 collapsed layout visibility state rules
  if (logoContainer && !logoContainer.querySelector(".logo-text")) {
    const rawText = logoContainer.textContent.trim() || "AI Study Hub";
    const bookLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="book-logo" style="width: 24px; height: 24px; color: #f97316; flex-shrink: 0;"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`;
    logoContainer.innerHTML = `${bookLogo}<span class="logo-text">${rawText}</span>`;
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
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M3 12h18M3 18h18"></path></svg>';
  toggleBtn.setAttribute("aria-label", "Toggle Sidebar Navigation");

  if (logoContainer) {
    logoContainer.insertBefore(toggleBtn, logoContainer.firstChild);
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

const quickProfileModalHtml = `
  <div id="quickProfileModal" class="modal-overlay" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center; padding: 16px;">
      <div class="modal-content card" style="width: 100%; max-width: 420px; background: var(--surface); border-radius: 16px; padding: 28px; border: none; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); position: relative; animation: modalFadeIn 0.3s ease-out; color: var(--text-main);">
          <button type="button" id="closeQuickProfileBtn" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: color 0.2s; line-height: 1;">&times;</button>
          
          <div id="quickProfileLoading" style="text-align: center; padding: 20px;">
              <p style="color: var(--text-muted);">Loading contributor details...</p>
          </div>

          <div id="quickProfileError" style="display: none; text-align: center; padding: 20px;">
              <p style="color: #ef4444; font-weight: 500;">This profile is private or not accessible.</p>
          </div>

          <div id="quickProfileContent" style="display: none;">
              <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
                  <div id="qpAvatar" style="width: 64px; height: 64px; border-radius: 50%; background: #fff5f3; color: #ff5a3d; font-size: 24px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); flex-shrink: 0;">-</div>
                  <div style="flex-grow: 1;">
                      <h3 id="qpFullName" style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">-</h3>
                      <p id="qpSchool" style="color: var(--text-muted); font-size: 13px; margin: 0; display: none;"></p>
                      <p id="qpMajor" style="color: var(--text-muted); font-size: 13px; margin: 2px 0 0 0; display: none;"></p>
                  </div>
              </div>

              <p id="qpBio" style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; max-height: 100px; overflow-y: auto;"></p>

              <div style="display: flex; gap: 16px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 12px 0; margin-bottom: 24px; justify-content: space-around; text-align: center;">
                  <div>
                      <div id="qpStatDocs" style="font-size: 16px; font-weight: 700; color: var(--text-main);">-</div>
                      <div style="font-size: 11px; color: var(--text-muted);">Public Docs</div>
                  </div>
                  <div>
                      <div id="qpStatFollowers" style="font-size: 16px; font-weight: 700; color: var(--text-main);">-</div>
                      <div style="font-size: 11px; color: var(--text-muted);">Followers</div>
                  </div>
                  <div>
                      <div id="qpStatFollowing" style="font-size: 16px; font-weight: 700; color: var(--text-main);">-</div>
                      <div style="font-size: 11px; color: var(--text-muted);">Following</div>
                  </div>
              </div>

              <div style="display: flex; gap: 12px;">
                  <button type="button" id="qpFollowBtn" class="btn btn-primary" style="flex: 1; margin: 0;">Follow</button>
                  <a href="#" id="qpViewFullProfileLink" class="btn btn-secondary" style="flex: 1; margin: 0; text-align: center; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">View Profile</a>
              </div>
          </div>
      </div>
  </div>
`;

function getInitialsFallback(fullName) {
  const names = (fullName || "User").trim().split(/\s+/);
  if (names.length > 1) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return names.length > 0 && names[0] ? names[0][0].toUpperCase() : "U";
}

async function showQuickProfileModal(userId) {
  let modal = document.getElementById("quickProfileModal");
  if (!modal) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = quickProfileModalHtml.trim();
    modal = tempDiv.firstChild;
    document.body.appendChild(modal);

    document.getElementById("closeQuickProfileBtn").addEventListener("click", () => {
      modal.remove();
    });

    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) {
        modal.remove();
      }
    });
  }

  const loading = document.getElementById("quickProfileLoading");
  const errorDiv = document.getElementById("quickProfileError");
  const content = document.getElementById("quickProfileContent");

  loading.style.display = "block";
  errorDiv.style.display = "none";
  content.style.display = "none";

  try {
    const profileUrl = typeof API_BASE_URL !== "undefined" ? `${API_BASE_URL}/api/users/${userId}/public-profile` : `/api/users/${userId}/public-profile`;
    const res = await fetch(profileUrl, { credentials: "include" });
    const json = await res.json();

    if (!res.ok || !json.success || !json.data) {
      throw new Error("Private or inactive user");
    }

    const data = json.data;
    loading.style.display = "none";
    content.style.display = "block";

    // Set values
    document.getElementById("qpFullName").textContent = data.fullName;
    
    // Avatar
    const avatarEl = document.getElementById("qpAvatar");
    if (data.avatarUrl) {
      avatarEl.innerHTML = `<img src="${data.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar" />`;
    } else {
      avatarEl.textContent = getInitialsFallback(data.fullName);
    }

    // Bio
    document.getElementById("qpBio").textContent = data.bio || "No biography provided.";

    // School & Major
    const schoolEl = document.getElementById("qpSchool");
    if (data.schoolName) {
      schoolEl.textContent = data.schoolName;
      schoolEl.style.display = "block";
    } else {
      schoolEl.style.display = "none";
    }

    const majorEl = document.getElementById("qpMajor");
    if (data.major) {
      majorEl.textContent = data.major;
      majorEl.style.display = "block";
    } else {
      majorEl.style.display = "none";
    }

    // Stats
    document.getElementById("qpStatDocs").textContent = data.publicDocumentCount;
    document.getElementById("qpStatFollowers").textContent = data.followersCount;
    document.getElementById("qpStatFollowing").textContent = data.followingCount;

    // View Profile Link
    document.getElementById("qpViewFullProfileLink").href = `public-profile.html?userId=${userId}`;

    // Follow Action Button logic
    const followBtn = document.getElementById("qpFollowBtn");
    const currentUserStr = localStorage.getItem("currentUser");

    if (data.isMyProfile) {
      followBtn.style.display = "none";
    } else if (!currentUserStr) {
      followBtn.style.display = "block";
      followBtn.textContent = "Log in to Follow";
      followBtn.className = "btn btn-primary";
      followBtn.onclick = () => {
        modal.remove();
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      };
    } else {
      followBtn.style.display = "block";
      const updateButtonState = (followed) => {
        if (followed) {
          followBtn.className = "btn btn-secondary";
          followBtn.style.background = "#fee2e2";
          followBtn.style.borderColor = "#fecaca";
          followBtn.style.color = "#ef4444";
          followBtn.textContent = "Unfollow";
        } else {
          followBtn.className = "btn btn-primary";
          followBtn.style.background = "";
          followBtn.style.borderColor = "";
          followBtn.style.color = "";
          followBtn.textContent = "Follow";
        }
      };

      updateButtonState(data.followedByMe);

      followBtn.onclick = async () => {
        followBtn.disabled = true;
        try {
          const followUrl = typeof API_BASE_URL !== "undefined" ? `${API_BASE_URL}/api/users/${userId}/follow` : `/api/users/${userId}/follow`;
          const method = data.followedByMe ? "DELETE" : "POST";
          const followRes = await fetch(followUrl, { method, credentials: "include" });
          const followJson = await followRes.json();

          if (followRes.ok && followJson.success && followJson.data) {
            data.followedByMe = followJson.data.followedByMe;
            data.followersCount = followJson.data.followersCount;
            document.getElementById("qpStatFollowers").textContent = data.followersCount;
            updateButtonState(data.followedByMe);
          }
        } catch (err) {
          console.error("Follow action failed:", err);
        } finally {
          followBtn.disabled = false;
        }
      };
    }

  } catch (err) {
    loading.style.display = "none";
    errorDiv.style.display = "block";
  }
}

function initializeQuickProfilePopup() {
  document.body.addEventListener("click", async (e) => {
    const trigger = e.target.closest(".uploader-link, .user-profile-trigger");
    if (!trigger) return;
    
    const userId = trigger.dataset.userId;
    if (!userId) return;

    // If target user is the logged-in user themselves, do not trigger the Quick Profile popup modal
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const currentUser = JSON.parse(userStr);
        if (currentUser && currentUser.userId === parseInt(userId, 10)) {
          return;
        }
      } catch (err) {}
    }
    
    e.preventDefault();
    showQuickProfileModal(userId);
  });
}

function injectFloatingChatbot() {
  const currentPage = getCurrentPageName();
  if (currentPage.startsWith("admin-") || ["login.html", "register.html", "verify-otp.html", "ai-chat.html"].includes(currentPage)) {
    return;
  }

  // Prevent multiple injections
  if (document.getElementById("floatingChatToggleBtn")) return;

  // 1. Inject Styles
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .floating-chat-toggle-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #f05a28;
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 99999;
      transition: transform 0.2s, background-color 0.2s;
    }
    .floating-chat-toggle-btn:hover {
      background: #e04f1e;
      transform: scale(1.05);
    }
    .floating-chat-toggle-btn svg {
      width: 26px;
      height: 26px;
    }
    .floating-chat-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: var(--surface);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      font-family: inherit;
    }
    .floating-chat-panel.active {
      display: flex;
    }
    .floating-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .floating-chat-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .floating-chat-header-info {
      display: flex;
      flex-direction: column;
    }
    .floating-chat-header-info h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .floating-chat-header-info span {
      font-size: 11px;
      color: var(--text-muted);
    }
    .floating-chat-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .floating-chat-clear-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s, background-color 0.2s;
    }
    .floating-chat-clear-btn:hover {
      color: #ef4444;
      background: #fee2e2;
    }
    .floating-chat-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: var(--surface-muted);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .floating-message-bubble {
      max-width: 85%;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .floating-message-bubble.user {
      align-self: flex-end;
    }
    .floating-message-bubble.assistant {
      align-self: flex-start;
    }
    .floating-message-content {
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .floating-message-bubble.user .floating-message-content {
      background: #f05a28;
      color: #ffffff;
      border-bottom-right-radius: 2px;
    }
    .floating-message-bubble.assistant .floating-message-content {
      background: var(--surface);
      color: var(--text-main);
      border-bottom-left-radius: 2px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .floating-message-time {
      font-size: 10px;
      color: var(--text-muted);
      align-self: flex-end;
    }
    .floating-message-bubble.assistant .floating-message-time {
      align-self: flex-start;
    }
    .floating-citations-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border);
    }
    .floating-citation-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      background: var(--surface-muted);
      color: var(--text-muted);
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid var(--border);
      width: fit-content;
    }
    .floating-citation-badge .floating-source-type {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 3px;
      border-radius: 3px;
    }
    .floating-citation-badge .floating-source-type.my-library {
      background: #e0f2fe;
      color: #0369a1;
    }
    .floating-citation-badge .floating-source-type.community-library {
      background: #dcfce7;
      color: #15803d;
    }
    .floating-citation-badge .floating-source-type.shared-library {
      background: #fef9c3;
      color: #a16207;
    }
    .floating-chat-input-area {
      padding: 12px 16px;
      background: var(--surface);
      border-top: 1px solid var(--border);
    }
    .floating-chat-suggestions {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      margin-bottom: 8px;
      padding-bottom: 4px;
    }
    .floating-suggestion-chip {
      font-size: 11.5px;
      background: var(--surface-muted);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 9999px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .floating-suggestion-chip:hover {
      background: var(--border);
      color: var(--text-main);
    }
    .floating-chat-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .floating-chat-textarea {
      flex: 1;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13.5px;
      resize: none;
      height: 36px;
      font-family: inherit;
      line-height: 1.4;
      outline: none;
      transition: border-color 0.2s;
    }
    .floating-chat-textarea:focus {
      border-color: #f05a28;
    }
    .floating-btn-send {
      background: #f05a28;
      color: #ffffff;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .floating-btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .floating-btn-send svg {
      width: 16px;
      height: 16px;
    }
  `;
  document.head.appendChild(styleEl);

  // 2. Inject HTML Structure
  const chatToggleBtn = document.createElement("button");
  chatToggleBtn.id = "floatingChatToggleBtn";
  chatToggleBtn.className = "floating-chat-toggle-btn";
  chatToggleBtn.title = "Chat with AI Study Assistant";
  chatToggleBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .771-.332c.983-.003 1.959-.063 2.924-.18 1.584-.19 2.707-1.583 2.707-3.186V6.302c0-1.6-1.123-2.994-2.707-3.227A48.372 48.372 0 0 0 12 3c-2.247 0-4.45.148-6.607.435C3.81 3.662 2.688 5.056 2.688 6.66l-.002 6.102Z" />
    </svg>
  `;

  const chatPanel = document.createElement("div");
  chatPanel.id = "floatingChatPanel";
  chatPanel.className = "floating-chat-panel";
  chatPanel.innerHTML = `
    <div class="floating-chat-header">
      <div class="floating-chat-header-title">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#f05a28" style="width: 20px; height: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l3.086-6.83M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="floating-chat-header-info">
          <h3>Homepage Chat</h3>
          <span id="floatingQuotaDisplay">Authenticated StudyMate AI</span>
        </div>
      </div>
      <div class="floating-chat-header-actions">
        <button class="floating-chat-clear-btn" id="floatingClearBtn" title="Clear Conversation">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" style="width: 18px; height: 18px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
    <div class="floating-chat-messages" id="floatingChatMessages">
      <div class="floating-message-bubble assistant">
        <div class="floating-message-content">
          Hello! I am your AI Study Assistant. I can search and answer questions based on the AI-processed documents in your library or the Community Library. What would you like to ask today?
        </div>
        <span class="floating-message-time">System</span>
      </div>
    </div>
    <div class="floating-chat-input-area">
      <div class="floating-chat-suggestions">
        <span class="floating-suggestion-chip" onclick="applyFloatingSuggestion('Explain Database Normalization with examples')">Normalization</span>
        <span class="floating-suggestion-chip" onclick="applyFloatingSuggestion('Summarize Object-Oriented Programming (OOP) concepts')">OOP Concept</span>
        <span class="floating-suggestion-chip" onclick="applyFloatingSuggestion('Compare SQL vs NoSQL databases')">SQL vs NoSQL</span>
      </div>
      <div class="floating-chat-input-wrapper">
        <textarea id="floatingChatInput" class="floating-chat-textarea" placeholder="Ask a question..."></textarea>
        <button id="floatingSendBtn" class="floating-btn-send">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(chatToggleBtn);
  document.body.appendChild(chatPanel);

  // 3. Logic & Event Bindings
  const messagesContainer = document.getElementById("floatingChatMessages");
  const textInput = document.getElementById("floatingChatInput");
  const sendBtn = document.getElementById("floatingSendBtn");
  const clearBtn = document.getElementById("floatingClearBtn");
  const quotaDisplay = document.getElementById("floatingQuotaDisplay");

  let isHistoryLoaded = false;

  chatToggleBtn.addEventListener("click", () => {
    const isActive = chatPanel.classList.toggle("active");
    if (isActive) {
      chatToggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
      textInput.focus();
      if (!isHistoryLoaded) {
        loadHistory();
      }
      loadQuota();
    } else {
      chatToggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .771-.332c.983-.003 1.959-.063 2.924-.18 1.584-.19 2.707-1.583 2.707-3.186V6.302c0-1.6-1.123-2.994-2.707-3.227A48.372 48.372 0 0 0 12 3c-2.247 0-4.45.148-6.607.435C3.81 3.662 2.688 5.056 2.688 6.66l-.002 6.102Z" />
        </svg>
      `;
    }
  });

  sendBtn.addEventListener("click", sendMessage);
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  clearBtn.addEventListener("click", clearConversation);

  window.applyFloatingSuggestion = (text) => {
    textInput.value = text;
    textInput.focus();
  };

  async function loadQuota() {
    try {
      const res = await get("/api/ai/usage/me");
      if (res && res.success) {
        quotaDisplay.textContent = `Remaining Quota: ${res.data.remainingQuestions} Q&A today`;
      }
    } catch (e) {
      console.warn("Error loading quota", e);
    }
  }

  async function loadHistory() {
    try {
      const res = await get("/api/ai/global/chats");
      if (res && res.success && res.data.messages && res.data.messages.length > 0) {
        messagesContainer.innerHTML = "";
        res.data.messages.forEach(msg => {
          appendBubble(msg.role, msg.content, msg.sourceChunks, msg.createdAt);
        });
        scrollToBottom();
        isHistoryLoaded = true;
      }
    } catch (e) {
      console.warn("Error loading global chat history", e);
    }
  }

  async function sendMessage() {
    const val = textInput.value.trim();
    if (!val) return;
    textInput.value = "";

    appendBubble("USER", val, null, new Date().toISOString());
    scrollToBottom();
    setLoading(true);

    try {
      const res = await post("/api/ai/global/ask", { question: val });
      if (res && res.success) {
        appendBubble("ASSISTANT", res.data.answer, res.data.sourceChunks, new Date().toISOString());
        if (res.data.remainingQuestions !== undefined) {
          quotaDisplay.textContent = `Remaining Quota: ${res.data.remainingQuestions} Q&A today`;
        }
      } else {
        appendBubble("ASSISTANT", "Sorry, an error occurred while connecting to the AI.", null, new Date().toISOString());
      }
    } catch (error) {
      const msg = error.message || "Failed to contact AI Assistant.";
      appendBubble("ASSISTANT", `An error occurred: ${msg}`, null, new Date().toISOString());
    } finally {
      setLoading(false);
      scrollToBottom();
      textInput.focus();
    }
  }

  async function clearConversation() {
    const confirmed = typeof window.confirmAction === "function"
        ? await window.confirmAction({
            title: "Clear Conversation",
            message: "Are you sure you want to clear this conversation?",
            confirmText: "Clear",
            danger: true
        })
        : window.confirm("Are you sure you want to clear this conversation?");
    if (!confirmed) return;
    try {
      const res = await del("/api/ai/global/chats");
      if (res && res.success) {
        messagesContainer.innerHTML = `
          <div class="floating-message-bubble assistant">
            <div class="floating-message-content">
              Conversation cleared successfully. How else can I help you?
            </div>
            <span class="floating-message-time">System</span>
          </div>
        `;
        isHistoryLoaded = false;
      }
    } catch (e) {
      console.warn("Failed to clear chat", e);
    }
  }

  function setLoading(isLoading) {
    textInput.disabled = isLoading;
    sendBtn.disabled = isLoading;
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function appendBubble(role, content, sourceChunks, timestamp) {
    const isUser = (role === "USER");
    const bubble = document.createElement("div");
    bubble.className = `floating-message-bubble ${isUser ? 'user' : 'assistant'}`;

    const contentEl = document.createElement("div");
    contentEl.className = "floating-message-content";
    contentEl.textContent = content;

    const isFallback = content && (
      content.includes("Tôi chưa tìm thấy tài liệu phù hợp") ||
      content.includes("I could not find matching documents") ||
      content.includes("Tôi không tìm thấy thông tin này") ||
      content.includes("I could not find this information")
    );
    if (!isUser && !isFallback && sourceChunks && sourceChunks.length > 0) {
      const container = document.createElement("div");
      container.className = "floating-citations-container";
      
      const uniqueCitations = [];
      const seen = new Set();
      sourceChunks.forEach(chunk => {
        const key = `${chunk.documentId}-${chunk.sourceLabel}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCitations.push(chunk);
        }
      });

      uniqueCitations.forEach(citation => {
        const badge = document.createElement("div");
        badge.className = "floating-citation-badge";
        const libClass = (citation.sourceLibrary === "My Library") ? "my-library" 
          : (citation.sourceLibrary === "Community Library") ? "community-library" : "shared-library";
        
        badge.innerHTML = `
          <span class="floating-source-type ${libClass}">${citation.sourceLibrary || 'Library'}</span>
          <a href="document-detail.html?id=${citation.documentId}" style="text-decoration: none; color: inherit; font-weight: 600;">
            ${citation.documentTitle || 'Document'}
          </a>
        `;
        container.appendChild(badge);
      });
      contentEl.appendChild(container);
    }

    bubble.appendChild(contentEl);

    const timeEl = document.createElement("span");
    timeEl.className = "floating-message-time";
    timeEl.textContent = formatTime(timestamp);
    bubble.appendChild(timeEl);

    messagesContainer.appendChild(bubble);
  }

  function formatTime(isoString) {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  }
}
// End of layout component manager file.
// End of layout component manager file.
