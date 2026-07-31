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
  const schoolStatusGroup = document.getElementById("schoolStatusGroup");
  const schoolStatusField = document.getElementById("schoolStatusField");

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
  const majorStatusGroup = document.getElementById("majorStatusGroup");
  const majorStatusField = document.getElementById("majorStatusField");
  const majorSchoolField = document.getElementById("majorSchoolField");

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
      await updateStatistics();
    } else {
      throw new Error(res?.message || "Failed to retrieve schools list.");
    }
  }

  async function updateStatistics() {
    try {
      const totalSchools = schoolsList.length;
      const activeSchools = schoolsList.filter(s => s.status === "ACTIVE").length;

      document.getElementById("cardTotalSchools").textContent = totalSchools;
      document.getElementById("cardActiveSchools").textContent = activeSchools;

      // Fetch majors for all schools in parallel
      const majorsPromises = schoolsList.map(s => getAdminMajors(s.schoolId).catch(() => ({ data: [] })));
      const majorsResults = await Promise.all(majorsPromises);

      let totalMajors = 0;
      let activeMajors = 0;
      majorsResults.forEach(res => {
        const list = res?.data || [];
        totalMajors += list.length;
        activeMajors += list.filter(m => m.status === "ACTIVE").length;
      });

      document.getElementById("cardTotalMajors").textContent = totalMajors;
      document.getElementById("cardActiveMajors").textContent = activeMajors;
    } catch (e) {
      console.error("Failed to update statistics:", e);
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
        ? `<span class="badge badge-success" style="background-color: rgba(16, 185, 129, 0.15) !important; color: var(--success) !important;">Active</span>`
        : `<span class="badge badge-secondary" style="background-color: var(--surface-muted) !important; color: var(--text-muted) !important; border: 1px solid var(--border) !important;">Inactive</span>`;

      tr.innerHTML = `
        <td><strong>#${sch.schoolId}</strong></td>
        <td>${escapeHTML(sch.schoolCode)}</td>
        <td>${escapeHTML(sch.schoolName)}</td>
        <td>${escapeHTML(sch.shortName)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions" style="display: flex; gap: 8px; justify-content: center;">
            <button class="btn btn-sm btn-outline btn-edit-school" data-id="${sch.schoolId}">Edit</button>
            <button class="btn btn-sm btn-outline-danger btn-delete-school" data-id="${sch.schoolId}">
              Delete
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

    document.querySelectorAll(".btn-delete-school").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        const sch = schoolsList.find(s => s.schoolId === id);
        const name = sch ? sch.schoolName : "this school";

        const confirmed = await window.confirmAction({
          title: "Delete School",
          message: `Are you sure you want to delete ${escapeHTML(name)}? This action cannot be undone.`,
          confirmText: "Delete",
          danger: true
        });

        if (!confirmed) return;

        try {
          await deleteAdminSchool(id);
          window.showToast("School deleted successfully", "success");
          await loadSchools();
        } catch (err) {
          window.showToast(err.message || "Failed to delete school", "error");
        }
      });
    });
  }

  function populateSchoolFilterOptions(schools) {
    const activeFilterValue = majorSchoolFilter ? majorSchoolFilter.value : "";
    if (majorSchoolFilter) {
      majorSchoolFilter.innerHTML = '<option value="">Choose a School</option>';
    }
    if (majorSchoolField) {
      majorSchoolField.innerHTML = '<option value="">Choose a School</option>';
    }
    schools.forEach(sch => {
      if (majorSchoolFilter) {
        const opt = document.createElement("option");
        opt.value = sch.schoolId;
        opt.textContent = `${sch.schoolName} (${sch.shortName})`;
        majorSchoolFilter.appendChild(opt);
      }

      if (majorSchoolField) {
        const optModal = document.createElement("option");
        optModal.value = sch.schoolId;
        optModal.textContent = `${sch.schoolName} (${sch.shortName})`;
        majorSchoolField.appendChild(optModal);
      }
    });
    // Restore selected value if exists
    if (activeFilterValue && majorSchoolFilter) {
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
        schoolStatusField.value = sch.status;
        schoolStatusGroup.style.display = "block";
      }
    } else {
      schoolModalTitle.textContent = "Add New School";
      schoolStatusGroup.style.display = "none";
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

    if (id) {
      payload.status = schoolStatusField.value;
    }

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
      await loadMajors(currentSchoolIdForMajors);
    } else {
      majorSearch.disabled = true;
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
        ? `<span class="badge badge-success" style="background-color: rgba(16, 185, 129, 0.15) !important; color: var(--success) !important;">Active</span>`
        : `<span class="badge badge-secondary" style="background-color: var(--surface-muted) !important; color: var(--text-muted) !important; border: 1px solid var(--border) !important;">Inactive</span>`;

      tr.innerHTML = `
        <td><strong>#${maj.majorId}</strong></td>
        <td>${escapeHTML(maj.majorCode)}</td>
        <td>${escapeHTML(maj.majorName)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions" style="display: flex; gap: 8px; justify-content: center;">
            <button class="btn btn-sm btn-outline btn-edit-major" data-id="${maj.majorId}">Edit</button>
            <button class="btn btn-sm btn-outline-danger btn-delete-major" data-id="${maj.majorId}">
              Delete
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

    document.querySelectorAll(".btn-delete-major").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        const maj = majorsList.find(m => m.majorId === id);
        const name = maj ? maj.majorName : "this major";

        const confirmed = await window.confirmAction({
          title: "Delete Major",
          message: `Are you sure you want to delete ${escapeHTML(name)}? This action cannot be undone.`,
          confirmText: "Delete",
          danger: true
        });

        if (!confirmed) return;

        try {
          await deleteAdminMajor(currentSchoolIdForMajors, id);
          window.showToast("Major deleted successfully", "success");
          await loadMajors(currentSchoolIdForMajors);
          await updateStatistics();
        } catch (err) {
          window.showToast(err.message || "Failed to delete major", "error");
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
        majorStatusField.value = maj.status;
        majorStatusGroup.style.display = "block";
        if (majorSchoolField) {
          majorSchoolField.value = maj.schoolId;
          majorSchoolField.disabled = true;
        }
      }
    } else {
      majorModalTitle.textContent = "Add New Major";
      majorStatusGroup.style.display = "none";
      if (majorSchoolField) {
        majorSchoolField.disabled = false;
        if (currentSchoolIdForMajors) {
          majorSchoolField.value = currentSchoolIdForMajors;
        } else {
          majorSchoolField.value = "";
        }
      }
    }
    openModal(majorModal);
  }

  // Major Form Submit
  majorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = majorIdField.value;
    const schoolId = majorSchoolField ? parseInt(majorSchoolField.value, 10) : (currentSchoolIdForMajors ? parseInt(currentSchoolIdForMajors, 10) : 0);

    const payload = {
      majorCode: majorCode.value.trim(),
      majorName: majorName.value.trim(),
      description: majorDesc.value.trim() || null
    };

    if (id) {
      payload.status = majorStatusField.value;
    }

    try {
      if (id) {
        await updateAdminMajor(schoolId, parseInt(id, 10), payload);
        window.showToast("Major updated successfully", "success");
      } else {
        await createAdminMajor(schoolId, payload);
        window.showToast("Major created successfully", "success");
      }
      closeModal(majorModal);

      // Auto update filters to the target school of major
      if (!currentSchoolIdForMajors || currentSchoolIdForMajors !== schoolId) {
        majorSchoolFilter.value = schoolId;
        currentSchoolIdForMajors = schoolId;
        majorSearch.disabled = false;
      }

      await loadMajors(schoolId);
      await updateStatistics();
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
      const modal = el.closest(".modal-overlay");
      closeModal(modal);
    });
  });

  // Close modal when clicking on overlay
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // --- Initialize Page ---
  init();
});
