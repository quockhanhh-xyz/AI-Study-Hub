/**
 * Global Navigation configuration definition for AI Study Hub app shell.
 * Extended in Step 8 for Public Community Library MVP integration.
 */
const ICON_HOME = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 11.5 12 4l9 7.5M5.5 10v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V10"></path></svg>';
const ICON_KEY = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><circle cx="8" cy="15" r="4" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11 12 19.5 3.5M16 6l2.5 2.5M19 4l1.5 1.5"></path></svg>';
const ICON_REGISTER = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16 3.5a2 2 0 0 1 2.8 2.8L7.5 17.6 3 19l1.4-4.5z"></path></svg>';
const ICON_SHIELD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"></path></svg>';
const ICON_DASHBOARD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><rect x="3" y="13" width="4" height="8" stroke="currentColor" stroke-width="1.5"></rect><rect x="10" y="9" width="4" height="12" stroke="currentColor" stroke-width="1.5"></rect><rect x="17" y="4" width="4" height="17" stroke="currentColor" stroke-width="1.5"></rect></svg>';
const ICON_UPLOAD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 18h12v-3h2v5H4v-5h2zm11.207 -8.70703L15.793 10.707 13 7.91406V16h-2V7.91406L8.20703 10.707 6.79297 9.29297 12 4.08594z"></path></svg>';
const ICON_FOLDER = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6 l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1.5"></path></svg>';
const ICON_GROUP = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
const ICON_SHARE = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="1.5"></circle><circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="1.5"></circle><circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" d="M8.6 10.6 15.4 6.4M8.6 13.4l6.8 4.2"></path></svg>';
const ICON_BIN = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M9.5 9v9m5 -9v9m-6 -13.5h-6v0.25l0.24 1.05A70 70 0 0 1 4.5 21.398V22.5h15v-1.102c0 -5.249 0.59 -10.48 1.76 -15.598l0.24 -1.05V4.5h-6m-7 0V4a3.5 3.5 0 1 1 7 0v0.5m-7 0h7" stroke-width="1.5"></path></svg>';
const ICON_INFO = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"></circle><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 11v5M12 8v.01"></path></svg>';
const ICON_COMMUNITY = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
const ICON_DOCS = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"></path></svg>';
const ICON_SHARED = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a3 3 0 1 1 0-3.44m0 3.44a3 3 0 1 0 0-3.44m0 3.44v-1.4m0-2.04v-1.4M12 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0 0v5.25m0 0H6.75A2.25 2.25 0 0 1 4.5 15V9a2.25 2.25 0 0 1 2.25-2.25h1.5"></path></svg>';
const ICON_GROUPS = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a3 3 0 1 1 0-3.44m0 3.44a3 3 0 1 0 0-3.44m0 3.44V12a6 6 0 0 0-6-6h-1.5M6 18.72a3 3 0 1 1 0-3.44m0 3.44a3 3 0 1 0 0-3.44m0 3.44V12a6 6 0 0 1 6-6h1.5M12 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path></svg>';
const ICON_TRASH = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"></path></svg>';
const ICON_UPGRADE = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z"></path></svg>';
const ICON_ADMIN = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg>';
const ICON_PAYMENT = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';


const NAVIGATION_MENU = [
  { name: "Dashboard", icon: ICON_HOME, url: "dashboard.html", requiresAuth: true },
  { name: "My Documents", icon: ICON_DOCS, url: "documents.html", requiresAuth: true },
  { name: "Folders", icon: ICON_FOLDER, url: "folders.html", requiresAuth: true },
  { name: "Shared with Me", icon: ICON_SHARED, url: "shared-with-me.html", requiresAuth: true },
  { name: "Study Groups", icon: ICON_GROUPS, url: "groups.html", requiresAuth: true },
  { name: "Community Library", icon: ICON_COMMUNITY, url: "community.html", requiresAuth: false },
  { name: "Trash Can", icon: ICON_TRASH, url: "trash.html", requiresAuth: true },

  // Admin section
  { name: "Admin Dashboard", icon: ICON_ADMIN, url: "admin-dashboard.html", requiresAuth: true, requiresAdmin: true },
  { name: "Admin Users", icon: ICON_GROUP, url: "admin-users.html", requiresAuth: true, requiresAdmin: true },
  { name: "Admin Documents", icon: ICON_DOCS, url: "admin-documents.html", requiresAuth: true, requiresAdmin: true },
  { name: "Admin Payments", icon: ICON_PAYMENT, url: "admin-payments.html", requiresAuth: true, requiresAdmin: true },
  { name: "Admin AI Usage", icon: ICON_UPGRADE, url: "admin-ai-usage.html", requiresAuth: true, requiresAdmin: true },
  { name: "Admin Subjects", icon: ICON_FOLDER, url: "admin-subjects.html", requiresAuth: true, requiresAdmin: true },
  { name: "Admin Plans", icon: ICON_SHIELD, url: "admin-plans.html", requiresAuth: true, requiresAdmin: true },

  // Step 11: Upgrade route — requires auth; guest redirected to login?redirect=upgrade.html
  { name: "Upgrade", icon: ICON_UPGRADE, url: "upgrade.html", requiresAuth: true },

  // Step 13B: Payment Result route — requires auth, hidden from sidebar (reached only via payment redirect)
  { name: "Payment Result", icon: ICON_UPGRADE, url: "payment-result.html", requiresAuth: true, hidden: true },

  // Guest-Only Gateway Routes (Step 8A Guard Target Authentication Sync)
  { name: "Login", icon: ICON_KEY, url: "login.html", hideWhenAuth: true },
  { name: "Register", icon: ICON_REGISTER, url: "register.html", hideWhenAuth: true },
  { name: "Verify OTP", icon: ICON_SHIELD, url: "verify-otp.html", hideWhenAuth: true, hidden: true },

  // Hidden Structural Layout Parameter Child Routes
  { name: "Upload", icon: ICON_UPLOAD, url: "upload.html", requiresAuth: true, hidden: true },
  { name: "Document Detail", icon: ICON_DOCS, url: "document-detail.html", requiresAuth: false, hidden: true },
  { name: "Group Detail", icon: ICON_GROUPS, url: "group-detail.html", requiresAuth: true, hidden: true },
  { name: "Shared Folder Detail", icon: ICON_FOLDER, url: "shared-folder-detail.html", requiresAuth: true, hidden: true },

  // Step 14: AI Tools child routes (Flashcards / Quiz)
  { name: "Flashcards", icon: ICON_DOCS, url: "flashcards.html", requiresAuth: true, hidden: true },
  { name: "Quiz", icon: ICON_DOCS, url: "quiz.html", requiresAuth: true, hidden: true }
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
  if (currentPage === "upload.html") {
    currentPage = "documents.html";
  }

  // Step 8: document-detail can be reached from My Documents OR Community Library
  if (currentPage === "document-detail.html") {
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get("from") === "community" ? "community.html" : "documents.html";
  }

  if (currentPage === "group-detail.html") {
    currentPage = "groups.html";
  }

  if (currentPage === "shared-folder-detail.html") {
    currentPage = "shared-with-me.html";
  }

  if (currentPage === "flashcards.html" || currentPage === "quiz.html") {
    currentPage = "documents.html";
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