/**
 * Global Navigation configuration definition for AI Study Hub app shell.
 */
const NAVIGATION_MENU = [
  { name: "Home", icon: "🏠", url: "index.html", requiresAuth: false },
  { name: "Login", icon: "🔑", url: "login.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Register", icon: "📝", url: "register.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Verify OTP", icon: "🛡️", url: "verify-otp.html", requiresAuth: false, hideWhenAuth: true, hidden: true },
  { name: "Dashboard", icon: "📊", url: "dashboard.html", requiresAuth: true },
  { name: "Upload", icon: "📤", url: "upload.html", requiresAuth: true },
  { name: "Folders", icon: "📁", url: "folders.html", requiresAuth: true },
  { name: "Study Groups", icon: "👥", url: "groups.html", requiresAuth: true },
  { name: "Shared With Me", icon: "🤝", url: "shared-with-me.html", requiresAuth: true },
  { name: "Trash", icon: "🗑️", url: "trash.html", requiresAuth: true },

  /* * Temporarily hidden menus to prevent 404 UX Issues (Will be unlocked in upcoming steps)
   * { name: "Documents", icon: "📄", url: "documents.html", requiresAuth: true },
   * { name: "Profile", icon: "👤", url: "profile.html", requiresAuth: true }
   */

  // Hidden views mapped explicitly for Auth Guard coverage without rendering on the sidebar
  { name: "Document Detail", icon: "ℹ️", url: "document-detail.html", requiresAuth: true, hidden: true },
  { name: "Group Detail", icon: "👥", url: "group-detail.html", requiresAuth: true, hidden: true }
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

  // FE3 Contextual Mapping: If current route points to a hidden detail page, force light up its parent anchor
  if (currentPage === "document-detail.html") {
    currentPage = "dashboard.html";
  }

  if (currentPage === "group-detail.html") {
    currentPage = "groups.html";
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
