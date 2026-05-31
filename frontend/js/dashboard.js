document.addEventListener("DOMContentLoaded", function () {
  const userNameElement = document.getElementById("dashboardUserName");
  const currentUserRaw = localStorage.getItem("currentUser");

  if (!currentUserRaw) {
    window.location.href = "login.html";
    return;
  }

  try {
    const currentUser = JSON.parse(currentUserRaw);
    if (userNameElement) {
      userNameElement.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
    }
  } catch (error) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  // Xử lý sự kiện đăng xuất
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("accessToken");
      window.location.href = "login.html";
    });
  }
});
