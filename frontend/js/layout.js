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

  // 5. ATTACH QUICK PROFILE POPUP LISTENERS
  initializeQuickProfilePopup();

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
          const statsContainer = document.createElement("div");
          statsContainer.className = "sidebar-user-stats";
          statsContainer.style.cssText = "padding: 0 16px; margin: 12px 0 20px 0; text-align: center;";
          statsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-around; gap: 4px;">
              <div style="flex: 1;">
                <span id="sidebarFollowers" style="display: block; font-size: 18px; font-weight: 700; color: #1e293b;">0</span>
                <span style="display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-top: 4px; letter-spacing: 0.05em;">Followers</span>
              </div>
              <div style="flex: 1; border-left: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">
                <span id="sidebarUploads" style="display: block; font-size: 18px; font-weight: 700; color: #1e293b;">0</span>
                <span style="display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-top: 4px; letter-spacing: 0.05em;">Uploads</span>
              </div>
              <div style="flex: 1;">
                <span id="sidebarUpvotes" style="display: block; font-size: 18px; font-weight: 700; color: #1e293b;">0</span>
                <span style="display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-top: 4px; letter-spacing: 0.05em;">Upvotes</span>
              </div>
            </div>
            <a href="upload.html" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 16px; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 9999px; text-decoration: none; background: #f05a28; border: none; color: #fff; box-shadow: 0 4px 10px rgba(240, 90, 40, 0.2); box-sizing: border-box; cursor: pointer;">
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
                  if (sf) sf.textContent = res.data.followersCount;
                  if (su) su.textContent = res.data.publicDocumentCount;
                  if (sv) sv.textContent = res.data.upvotesCount || 0;
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
}


const confirmLogoutModalHtml = `
  <div id="logoutConfirmModal" class="modal-overlay" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
      <div class="modal-content card" style="width: 100%; max-width: 400px; background: #ffffff; border-radius: 16px; padding: 24px; border: none; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); text-align: center; color: #1e293b;">
          <div style="width: 48px; height: 48px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
          </div>
          <h3 style="font-size: 20px; font-weight: 700; color: #172033; margin: 0 0 8px 0;">Sign out?</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">You will need to sign in again to access your documents and AI tools.</p>
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
      <div class="modal-content card" style="width: 100%; max-width: 420px; background: #ffffff; border-radius: 16px; padding: 28px; border: none; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); position: relative; animation: modalFadeIn 0.3s ease-out; color: #1e293b;">
          <button type="button" id="closeQuickProfileBtn" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; transition: color 0.2s; line-height: 1;">&times;</button>
          
          <div id="quickProfileLoading" style="text-align: center; padding: 20px;">
              <p style="color: #64748b;">Loading contributor details...</p>
          </div>

          <div id="quickProfileError" style="display: none; text-align: center; padding: 20px;">
              <p style="color: #ef4444; font-weight: 500;">This profile is private or not accessible.</p>
          </div>

          <div id="quickProfileContent" style="display: none;">
              <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
                  <div id="qpAvatar" style="width: 64px; height: 64px; border-radius: 50%; background: #fff5f3; color: #ff5a3d; font-size: 24px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); flex-shrink: 0;">-</div>
                  <div style="flex-grow: 1;">
                      <h3 id="qpFullName" style="font-size: 18px; font-weight: 700; color: #172033; margin: 0 0 4px 0;">-</h3>
                      <p id="qpSchool" style="color: #64748b; font-size: 13px; margin: 0; display: none;"></p>
                      <p id="qpMajor" style="color: #64748b; font-size: 13px; margin: 2px 0 0 0; display: none;"></p>
                  </div>
              </div>

              <p id="qpBio" style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; max-height: 100px; overflow-y: auto;"></p>

              <div style="display: flex; gap: 16px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 24px; justify-content: space-around; text-align: center;">
                  <div>
                      <div id="qpStatDocs" style="font-size: 16px; font-weight: 700; color: #1e293b;">-</div>
                      <div style="font-size: 11px; color: #64748b;">Public Docs</div>
                  </div>
                  <div>
                      <div id="qpStatFollowers" style="font-size: 16px; font-weight: 700; color: #1e293b;">-</div>
                      <div style="font-size: 11px; color: #64748b;">Followers</div>
                  </div>
                  <div>
                      <div id="qpStatFollowing" style="font-size: 16px; font-weight: 700; color: #1e293b;">-</div>
                      <div style="font-size: 11px; color: #64748b;">Following</div>
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
// End of layout component manager file.
// End of layout component manager file.
