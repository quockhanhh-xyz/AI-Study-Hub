/**
 * Global Navigation configuration definition for AI Study Hub app shell.
 */
const NAVIGATION_MENU = [
  { name: "Home", url: "index.html", requiresAuth: false },
  { name: "Login", url: "login.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Register", url: "register.html", requiresAuth: false, hideWhenAuth: true },
  { name: "Verify OTP", url: "verify-otp.html", requiresAuth: false, hideWhenAuth: true, hidden: true },
  { name: "Dashboard", url: "dashboard.html", requiresAuth: true },
  { name: "Upload", url: "upload.html", requiresAuth: true },
  { name: "Folders", url: "folders.html", requiresAuth: true },
  { name: "Trash", url: "trash.html", requiresAuth: true },

  /* * Temporarily hidden menus to prevent 404 UX Issues (Will be unlocked in upcoming steps)
   * { name: "Documents", url: "documents.html", requiresAuth: true },
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

function initializeActiveMenu() {
  let currentPage = getCurrentPageName();
  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");

  // FE3 Contextual Mapping: Nếu đang ở trang chi tiết tài liệu, sáng đèn menu Dashboard làm cha
  if (currentPage === "document-detail.html") {
    currentPage = "dashboard.html";
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
