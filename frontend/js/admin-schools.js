function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
  // Guard clause: check authentication and admin role
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  if (user.role !== "ADMIN") {
    window.location.href = "dashboard.html";
    return;
  }

  // --- State Variables ---
  let schoolsList = [];
  let majorsList = [];
  let currentSchoolIdForMajors = null;

  // --- DOM Elements ---
  const loadingState = document.getElementById("adminLoadingState");
  const errorState = document.getElementById("adminErrorState");
  const errorMessage = document.getElementById("adminErrorMessage");

  const tabSchoolsBtn = document.getElementById("tabSchoolsBtn");
  const tabMajorsBtn = document.getElementById("tabMajorsBtn");
  const schoolsContent = document.getElementById("schoolsContent");
  const majorsContent = document.getElementById("majorsContent");

  // Schools list DOM elements
  const schoolSearch = document.getElementById("schoolSearch");
  const schoolsTableBody = document.getElementById("schoolsTableBody");
  const btnCreateSchool = document.getElementById("btnCreateSchool");
  const schoolModal = document.getElementById("schoolModal");
  const schoolForm = document.getElementById("schoolForm");
  const schoolIdField = document.getElementById("schoolIdField");
  const schoolModalTitle = document.getElementById("schoolModalTitle");

  const schoolCode = document.getElementById("schoolCode");
  const schoolName = document.getElementById("schoolName");
  const schoolShortName = document.getElementById("schoolShortName");
  const schoolDesc = document.getElementById("schoolDesc");

  // Majors list DOM elements
  const majorSchoolFilter = document.getElementById("majorSchoolFilter");
  const majorSearch = document.getElementById("majorSearch");
  const majorsTableBody = document.getElementById("majorsTableBody");
  const btnCreateMajor = document.getElementById("btnCreateMajor");
  const majorModal = document.getElementById("majorModal");
  const majorForm = document.getElementById("majorForm");
  const majorIdField = document.getElementById("majorIdField");
  const majorModalTitle = document.getElementById("majorModalTitle");

  const majorCode = document.getElementById("majorCode");
  const majorName = document.getElementById("majorName");
  const majorDesc = document.getElementById("majorDesc");

  // --- Initial Data Load ---
  async function init() {
    showLoading(true);
    try {
      await loadSchools();
      showLoading(false);
    } catch (err) {
      console.error(err);
      showError(err.message || "Failed to load master data.");
    }
  }

  // --- Loading/Error Helper Functions ---
  function showLoading(isLoading) {
    if (loadingState) loadingState.style.display = isLoading ? "flex" : "none";
    if (schoolsContent && !isLoading) {
      // Restore tab visibility
      toggleView();
    } else {
      if (schoolsContent) schoolsContent.style.display = "none";
      if (majorsContent) majorsContent.style.display = "none";
    }
  }

  function showError(msg) {
    if (loadingState) loadingState.style.display = "none";
    if (errorState) {
      errorState.style.display = "flex";
      errorMessage.textContent = msg;
    }
  }

  function toggleView() {
    if (tabSchoolsBtn.classList.contains("active")) {
      schoolsContent.style.display = "block";
      majorsContent.style.display = "none";
    } else {
      schoolsContent.style.display = "none";
      majorsContent.style.display = "block";
    }
  }

  // --- Tab Event Listeners ---
  tabSchoolsBtn.addEventListener("click", () => {
    tabSchoolsBtn.classList.add("active");
    tabMajorsBtn.classList.remove("active");
    toggleView();
  });

  tabMajorsBtn.addEventListener("click", () => {
    tabMajorsBtn.classList.add("active");
    tabSchoolsBtn.classList.remove("active");
    toggleView();
  });

  // --- Schools CRUD ---

  async function loadSchools() {
    const res = await getAdminSchools();
    if (res && res.success) {
      schoolsList = res.data || [];
      renderSchools(schoolsList);
      populateSchoolFilterOptions(schoolsList);
    } else {
      throw new Error(res?.message || "Failed to retrieve schools list.");
    }
  }

  function renderSchools(schools) {
    schoolsTableBody.innerHTML = "";
    if (schools.length === 0) {
      schoolsTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No schools found.
          </td>
        </tr>
      `;
      return;
    }

    schools.forEach(sch => {
      const tr = document.createElement("tr");

      const statusBadge = sch.status === "ACTIVE"
        ? `<span class="badge badge-success">Active</span>`
        : `<span class="badge badge-secondary">Inactive</span>`;

      const toggleActionText = sch.status === "ACTIVE" ? "Deactivate" : "Activate";
      const toggleActionClass = sch.status === "ACTIVE" ? "text-danger" : "text-success";

      tr.innerHTML = `
        <td><strong>#${sch.schoolId}</strong></td>
        <td>${escapeHTML(sch.schoolCode)}</td>
        <td>${escapeHTML(sch.schoolName)}</td>
        <td>${escapeHTML(sch.shortName)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action text-primary btn-edit-school" data-id="${sch.schoolId}">Edit</button>
            <button class="btn-table-action ${toggleActionClass} btn-toggle-school" data-id="${sch.schoolId}" data-status="${sch.status}">
              ${toggleActionText}
            </button>
          </div>
        </td>
      `;
      schoolsTableBody.appendChild(tr);
    });

    // Attach event listeners
    document.querySelectorAll(".btn-edit-school").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        openSchoolModal(id);
      });
    });

    document.querySelectorAll(".btn-toggle-school").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        const currentStatus = btn.dataset.status;
        const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        try {
          await updateAdminSchoolStatus(id, nextStatus);
          window.showToast("School status updated successfully", "success");
          await loadSchools();
        } catch (err) {
          window.showToast(err.message || "Failed to update school status", "error");
        }
      });
    });
  }

  function populateSchoolFilterOptions(schools) {
    const activeFilterValue = majorSchoolFilter.value;
    majorSchoolFilter.innerHTML = '<option value="">-- Choose a School --</option>';
    schools.forEach(sch => {
      const opt = document.createElement("option");
      opt.value = sch.schoolId;
      opt.textContent = `${sch.schoolName} (${sch.shortName})`;
      majorSchoolFilter.appendChild(opt);
    });
    // Restore selected value if exists
    if (activeFilterValue) {
      majorSchoolFilter.value = activeFilterValue;
    }
  }

  // Search Schools
  schoolSearch.addEventListener("input", () => {
    const val = schoolSearch.value.toLowerCase().trim();
    if (!val) {
      renderSchools(schoolsList);
      return;
    }
    const filtered = schoolsList.filter(s =>
      s.schoolName.toLowerCase().includes(val) ||
      s.schoolCode.toLowerCase().includes(val) ||
      s.shortName.toLowerCase().includes(val)
    );
    renderSchools(filtered);
  });

  // Create/Edit School Modal Toggle
  btnCreateSchool.addEventListener("click", () => {
    openSchoolModal();
  });

  function openSchoolModal(id = null) {
    schoolForm.reset();
    schoolIdField.value = id || "";

    if (id) {
      schoolModalTitle.textContent = "Edit School";
      const sch = schoolsList.find(s => s.schoolId === id);
      if (sch) {
        schoolCode.value = sch.schoolCode;
        schoolName.value = sch.schoolName;
        schoolShortName.value = sch.shortName;
        schoolDesc.value = sch.description || "";
      }
    } else {
      schoolModalTitle.textContent = "Add New School";
    }
    openModal(schoolModal);
  }

  // School Form Submit
  schoolForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = schoolIdField.value;

    const payload = {
      schoolCode: schoolCode.value.trim(),
      schoolName: schoolName.value.trim(),
      shortName: schoolShortName.value.trim(),
      description: schoolDesc.value.trim() || null
    };

    try {
      if (id) {
        await updateAdminSchool(parseInt(id, 10), payload);
        window.showToast("School updated successfully", "success");
      } else {
        await createAdminSchool(payload);
        window.showToast("School created successfully", "success");
      }
      closeModal(schoolModal);
      await loadSchools();
    } catch (err) {
      window.showToast(err.message || "Failed to save school.", "error");
    }
  });

  // --- Majors CRUD ---

  majorSchoolFilter.addEventListener("change", async () => {
    const schoolId = majorSchoolFilter.value;
    currentSchoolIdForMajors = schoolId ? parseInt(schoolId, 10) : null;

    if (currentSchoolIdForMajors) {
      majorSearch.disabled = false;
      btnCreateMajor.disabled = false;
      await loadMajors(currentSchoolIdForMajors);
    } else {
      majorSearch.disabled = true;
      btnCreateMajor.disabled = true;
      majorsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
            Please select a school first to see its majors.
          </td>
        </tr>
      `;
    }
  });

  async function loadMajors(schoolId) {
    majorsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px;">Loading majors...</td></tr>`;
    try {
      const res = await getAdminMajors(schoolId);
      if (res && res.success) {
        majorsList = res.data || [];
        renderMajors(majorsList);
      } else {
        window.showToast(res?.message || "Failed to load majors", "error");
      }
    } catch (err) {
      window.showToast(err.message || "Error fetching majors list", "error");
    }
  }

  function renderMajors(majors) {
    majorsTableBody.innerHTML = "";
    if (majors.length === 0) {
      majorsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No majors found for this school.
          </td>
        </tr>
      `;
      return;
    }

    majors.forEach(maj => {
      const tr = document.createElement("tr");

      const statusBadge = maj.status === "ACTIVE"
        ? `<span class="badge badge-success">Active</span>`
        : `<span class="badge badge-secondary">Inactive</span>`;

      const toggleActionText = maj.status === "ACTIVE" ? "Deactivate" : "Activate";
      const toggleActionClass = maj.status === "ACTIVE" ? "text-danger" : "text-success";

      tr.innerHTML = `
        <td><strong>#${maj.majorId}</strong></td>
        <td>${escapeHTML(maj.majorCode)}</td>
        <td>${escapeHTML(maj.majorName)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action text-primary btn-edit-major" data-id="${maj.majorId}">Edit</button>
            <button class="btn-table-action ${toggleActionClass} btn-toggle-major" data-id="${maj.majorId}" data-status="${maj.status}">
              ${toggleActionText}
            </button>
          </div>
        </td>
      `;
      majorsTableBody.appendChild(tr);
    });

    // Attach major event listeners
    document.querySelectorAll(".btn-edit-major").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        openMajorModal(id);
      });
    });

    document.querySelectorAll(".btn-toggle-major").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        const currentStatus = btn.dataset.status;
        const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        try {
          await updateAdminMajorStatus(currentSchoolIdForMajors, id, nextStatus);
          window.showToast("Major status updated successfully", "success");
          await loadMajors(currentSchoolIdForMajors);
        } catch (err) {
          window.showToast(err.message || "Failed to update major status", "error");
        }
      });
    });
  }

  // Search Majors
  majorSearch.addEventListener("input", () => {
    const val = majorSearch.value.toLowerCase().trim();
    if (!val) {
      renderMajors(majorsList);
      return;
    }
    const filtered = majorsList.filter(m =>
      m.majorName.toLowerCase().includes(val) ||
      m.majorCode.toLowerCase().includes(val)
    );
    renderMajors(filtered);
  });

  // Create/Edit Major Modal Toggle
  btnCreateMajor.addEventListener("click", () => {
    openMajorModal();
  });

  function openMajorModal(id = null) {
    majorForm.reset();
    majorIdField.value = id || "";

    if (id) {
      majorModalTitle.textContent = "Edit Major";
      const maj = majorsList.find(m => m.majorId === id);
      if (maj) {
        majorCode.value = maj.majorCode;
        majorName.value = maj.majorName;
        majorDesc.value = maj.description || "";
      }
    } else {
      majorModalTitle.textContent = "Add New Major";
    }
    openModal(majorModal);
  }

  // Major Form Submit
  majorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = majorIdField.value;

    const payload = {
      majorCode: majorCode.value.trim(),
      majorName: majorName.value.trim(),
      description: majorDesc.value.trim() || null
    };

    try {
      if (id) {
        await updateAdminMajor(currentSchoolIdForMajors, parseInt(id, 10), payload);
        window.showToast("Major updated successfully", "success");
      } else {
        await createAdminMajor(currentSchoolIdForMajors, payload);
        window.showToast("Major created successfully", "success");
      }
      closeModal(majorModal);
      await loadMajors(currentSchoolIdForMajors);
    } catch (err) {
      window.showToast(err.message || "Failed to save major.", "error");
    }
  });

  // --- Modal Helpers ---
  function openModal(modalEl) {
    if (modalEl) modalEl.classList.add("open");
  }

  function closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove("open");
  }

  // Close modals on close button or cancel click
  document.querySelectorAll(".modal-close, .btn-close-modal").forEach(el => {
    el.addEventListener("click", () => {
      const modal = el.closest(".modal");
      closeModal(modal);
    });
  });

  // Close modal when clicking on overlay
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // --- Run Initialization ---
  await init();
});
