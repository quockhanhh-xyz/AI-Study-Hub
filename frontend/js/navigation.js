/**
 * Global Navigation configuration definition for AI Study Hub app shell.
 * Extended in Step 6D for Frontend IA Cleanup.
 */
const ICON_HOME = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 11.5 12 4l9 7.5M5.5 10v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V10"></path></svg>';
const ICON_KEY = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><circle cx="8" cy="15" r="4" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11 12 19.5 3.5M16 6l2.5 2.5M19 4l1.5 1.5"></path></svg>';
const ICON_REGISTER = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16 3.5a2 2 0 0 1 2.8 2.8L7.5 17.6 3 19l1.4-4.5z"></path></svg>';
const ICON_SHIELD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"></path></svg>';
const ICON_DASHBOARD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><rect x="3" y="13" width="4" height="8" stroke="currentColor" stroke-width="1.5"></rect><rect x="10" y="9" width="4" height="12" stroke="currentColor" stroke-width="1.5"></rect><rect x="17" y="4" width="4" height="17" stroke="currentColor" stroke-width="1.5"></rect></svg>';
const ICON_UPLOAD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 18h12v-3h2v5H4v-5h2zm11.207 -8.70703L15.793 10.707 13 7.91406V16h-2V7.91406L8.20703 10.707 6.79297 9.29297 12 4.08594z"></path></svg>';
const ICON_FOLDER = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1.5"></path></svg>';
const ICON_GROUP = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
const ICON_SHARE = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="1.5"></circle><circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="1.5"></circle><circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" d="M8.6 10.6 15.4 6.4M8.6 13.4l6.8 4.2"></path></svg>';
const ICON_BIN = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M9.5 9v9m5 -9v9m-6 -13.5h-6v0.25l0.24 1.05A70 70 0 0 1 4.5 21.398V22.5h15v-1.102c0 -5.249 0.59 -10.48 1.76 -15.598l0.24 -1.05V4.5h-6m-7 0V4a3.5 3.5 0 1 1 7 0v0.5m-7 0h7" stroke-width="1.5"></path></svg>';
const ICON_INFO = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 11v5M12 8v.01"></path></svg>';

const NAVIGATION_MENU = [
  { name: "Home", icon: ICON_HOME, url: "index.html", requiresAuth: false, hidden: true },
  { name: "Login", icon: ICON_KEY, url: "login.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Register", icon: ICON_REGISTER, url: "register.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Verify OTP", icon: ICON_SHIELD, url: "verify-otp.html", requiresAuth: false, hideWhenAuth: true, hidden: true },
  
  // Authenticated visible main sidebar links
  { name: "Dashboard", icon: ICON_DASHBOARD, url: "dashboard.html", requiresAuth: true },
  { name: "My Documents", icon: ICON_FOLDER, url: "documents.html", requiresAuth: true },
  { name: "Folders", icon: ICON_FOLDER, url: "folders.html", requiresAuth: true },
  { name: "Shared With Me", icon: ICON_SHARE, url: "shared-with-me.html", requiresAuth: true },
  { name: "Groups", icon: ICON_GROUP, url: "groups.html", requiresAuth: true },
  { name: "Trash", icon: ICON_BIN, url: "trash.html", requiresAuth: true },

  // Hidden views mapped explicitly for Auth Guard coverage and contextual navigation active-states
  { name: "Upload", icon: ICON_UPLOAD, url: "upload.html", requiresAuth: true, hidden: true },
  { name: "Document Detail", icon: ICON_INFO, url: "document-detail.html", requiresAuth: true, hidden: true },
  { name: "Group Detail", icon: ICON_GROUP, url: "group-detail.html", requiresAuth: true, hidden: true },
  { name: "Shared Folder Detail", icon: ICON_FOLDER, url: "shared-folder-detail.html", requiresAuth: true, hidden: true }
];

/**
 * Returns the current page's filename from the browser location path.
 * @returns {string} Example: "dashboard.html"
 */
function getCurrentPageName() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf("/") + 1);
  return page || "index.html";
}

function initializeActiveMenu() {
  let currentPage = getCurrentPageName();
  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");

  // Step 6D IA Mapping: Force child sub-views to illuminate their correct parent menu items
  if (currentPage === "upload.html" || currentPage === "document-detail.html") {
    currentPage = "documents.html";
  }

  if (currentPage === "group-detail.html") {
    currentPage = "groups.html";
  }

  if (currentPage === "shared-folder-detail.html") {
    currentPage = "shared-with-me.html";
  }

  navLinks.forEach(link => {
    const hrefAttr = link.getAttribute("href");
    if (hrefAttr === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// End of navigation utility file.