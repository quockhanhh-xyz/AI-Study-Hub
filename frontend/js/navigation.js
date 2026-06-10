/**
 * Global Navigation configuration definition for AI Study Hub app shell.
 */
const NAVIGATION_MENU = [
  { name: "Home", url: "index.html", requiresAuth: false },
  { name: "Login", url: "login.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Register", url: "register.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Dashboard", url: "dashboard.html", requiresAuth: true },
  { name: "Upload", url: "upload.html", requiresAuth: true },
  
  /* * Temporarily hidden menus to prevent 404 UX Issues (Will be unlocked in upcoming steps)
   * { name: "Documents", url: "documents.html", requiresAuth: true },
   * { name: "Folders", url: "folders.html", requiresAuth: true },
   * { name: "Trash", url: "trash.html", requiresAuth: true },
   * { name: "Profile", url: "profile.html", requiresAuth: true }
   */

  // Hidden views mapped explicitly for Auth Guard coverage without rendering on the sidebar
  { name: "Document Detail", url: "document-detail.html", requiresAuth: true, hidden: true }
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

/**
 * Updates the UI sidebar elements dynamically to highlight the active menu link.
 */
function initializeActiveMenu() {
  const currentPage = getCurrentPageName();
  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");

  navLinks.forEach(link => {
    const hrefAttr = link.getAttribute("href");
    if (hrefAttr === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}