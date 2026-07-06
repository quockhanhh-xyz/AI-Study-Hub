/**
 * Upgrade / Pricing Page Controller (FE2 - Step 11).
 * Handles plan display, mock payment flow, and payment history.
 */
document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const currentUserRaw = localStorage.getItem("currentUser");
  let currentUser = {};
  try {
    currentUser = JSON.parse(currentUserRaw || "{}");
  } catch (e) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  if (typeof refreshCurrentUser === "function") {
    const refreshedUser = await refreshCurrentUser();
    if (refreshedUser) {
      currentUser = refreshedUser;
    }
  }

  // Elements
  const currentTierBadge = document.getElementById("currentTierBadge");
  const alreadyPremiumBanner = document.getElementById("alreadyPremiumBanner");

  const pricingLoader = document.getElementById("pricingLoader");
  const pricingError = document.getElementById("pricingError");
  const pricingGrid = document.getElementById("pricingGrid");

  const checkoutSection = document.getElementById("checkoutSection");
  const checkoutPlanInfo = document.getElementById("checkoutPlanInfo");
  const checkoutResultMessage = document.getElementById("checkoutResultMessage");
  const simulateSuccessBtn = document.getElementById("simulateSuccessBtn");
  const simulateFailBtn = document.getElementById("simulateFailBtn");
  const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
  const checkoutActions = document.getElementById("checkoutActions");

  const historyLoader = document.getElementById("historyLoader");
  const historyError = document.getElementById("historyError");
  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");

  let activePaymentId = null;
  const TIER_RANK = {
    FREE: 0,
    PREMIUM: 1,
    ULTRA: 2
  };

  // ─────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────

  function formatCurrency(amount, currency) {
    const formatted = Number(amount || 0).toLocaleString("en-US");
    return `${formatted} ${currency || "VND"}`;
  }

  function normalizeTier(tier) {
    const normalized = String(tier || "FREE").toUpperCase();
    return Object.prototype.hasOwnProperty.call(TIER_RANK, normalized) ? normalized : "FREE";
  }

  function getCurrentTier() {
    return normalizeTier(currentUser.effectiveTier || currentUser.tier);
  }

  function getPlanTier(plan) {
    return normalizeTier(plan.targetTier || plan.planCode);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function updateTierUI(tier) {
    const normalizedTier = normalizeTier(tier);
    currentUser.tier = normalizedTier;
    currentUser.effectiveTier = normalizedTier;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    if (currentTierBadge) {
      currentTierBadge.textContent = normalizedTier;
      currentTierBadge.classList.remove("badge-tier-free", "badge-tier-premium", "badge-tier-ultra");
      currentTierBadge.classList.add(`badge-tier-${normalizedTier.toLowerCase()}`);
    }

    if (alreadyPremiumBanner) {
      const message = alreadyPremiumBanner.querySelector("span");
      if (message) {
        message.textContent = normalizedTier === "ULTRA"
          ? "You are already on Ultra. You can renew your plan before it expires."
          : "Your Premium plan is active. You can renew it or upgrade to Ultra.";
      }
      alreadyPremiumBanner.style.display = normalizedTier === "FREE" ? "none" : "flex";
    }
  }

  function statusBadgeClass(status) {
    switch (status) {
      case "SUCCESS": return "status-badge approved";
      case "PENDING": return "status-badge pending";
      case "FAILED": return "status-badge rejected";
      case "CANCELLED": return "status-badge private";
      default: return "status-badge private";
    }
  }

  // ─────────────────────────────────────────────
  // Pricing Plans
  // ─────────────────────────────────────────────

  function createPlanCard(plan) {
    const planTier = getPlanTier(plan);
    const currentTier = getCurrentTier();
    const planRank = TIER_RANK[planTier];
    const currentRank = TIER_RANK[currentTier];

    const card = document.createElement("div");
    card.className = "card";
    card.style.maxWidth = "none";

    if (planTier === "PREMIUM") {
      card.classList.add("stat-card-premium");
    } else if (planTier === "ULTRA") {
      card.classList.add("stat-card-ultra");
    }

    const title = document.createElement("h2");
    title.textContent = plan.planName || plan.planCode;
    card.appendChild(title);

    const price = document.createElement("p");
    price.style.textAlign = "center";
    price.style.fontSize = "24px";
    price.style.fontWeight = "700";
    price.style.color = planTier === "PREMIUM"
      ? "#b45309"
      : planTier === "ULTRA"
        ? "#7c3aed"
        : "var(--text-main)";
    if (plan.price > 0) {
      price.textContent = `${formatCurrency(plan.price, plan.currency)} / ${plan.billingLabel || "month"}`;
    } else {
      price.textContent = "Free";
    }
    card.appendChild(price);

    if (Array.isArray(plan.features) && plan.features.length > 0) {
      const list = document.createElement("ul");
      list.style.padding = "0 0 0 20px";
      list.style.color = "var(--text-muted)";
      list.style.fontSize = "14px";
      list.style.lineHeight = "1.8";
      plan.features.forEach(function (feature) {
        const li = document.createElement("li");
        li.textContent = feature;
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    if (plan.note) {
      const note = document.createElement("p");
      note.className = "helper-text";
      note.style.marginTop = "12px";
      note.textContent = plan.note;
      card.appendChild(note);
    }

    // Action area
    const isCurrentPlan = planTier === currentTier;
    const isPaidPlan = planTier !== "FREE";
    const isHigherPlan = planRank > currentRank;
    const isLowerPlan = planRank < currentRank;

    if (isCurrentPlan) {
      const currentBadge = document.createElement("div");
      currentBadge.className = "helper-text success";
      currentBadge.style.marginTop = "16px";
      currentBadge.textContent = "Current Plan";
      card.appendChild(currentBadge);

      if (isPaidPlan) {
        const renewBtn = document.createElement("button");
        renewBtn.type = "button";
        renewBtn.className = "btn btn-secondary";
        renewBtn.style.marginTop = "12px";
        renewBtn.textContent = `Renew ${plan.planName || planTier}`;
        renewBtn.addEventListener("click", function (event) {
          handleUpgradeClick(event, planTier);
        });
        card.appendChild(renewBtn);
      }
    } else if (isHigherPlan && isPaidPlan) {
      const upgradeBtn = document.createElement("button");
      upgradeBtn.type = "button";
      upgradeBtn.className = "btn btn-primary";
      upgradeBtn.style.marginTop = "16px";
      upgradeBtn.textContent = `Upgrade to ${plan.planName || planTier}`;
      upgradeBtn.addEventListener("click", function (event) {
        handleUpgradeClick(event, planTier);
      });
      card.appendChild(upgradeBtn);
    } else if (isLowerPlan) {
      const lowerPlanNote = document.createElement("div");
      lowerPlanNote.className = "helper-text";
      lowerPlanNote.style.marginTop = "16px";
      lowerPlanNote.textContent = planTier === "FREE"
        ? "Included with every account"
        : "Downgrade is not available in mock checkout";
      card.appendChild(lowerPlanNote);
    }

    return card;
  }

  async function loadPlans() {
    pricingLoader.style.display = "flex";
    pricingError.style.display = "none";
    pricingGrid.style.display = "none";

    try {
      const result = await getPaymentPlans();
      const plans = Array.isArray(result.data) ? result.data : [];

      pricingGrid.innerHTML = "";
      plans.forEach(function (plan) {
        pricingGrid.appendChild(createPlanCard(plan));
      });

      pricingLoader.style.display = "none";
      pricingGrid.style.display = "grid";
    } catch (error) {
      pricingLoader.style.display = "none";
      pricingError.textContent = getPaymentErrorMessage(error);
      pricingError.style.display = "flex";
    }
  }

  // ─────────────────────────────────────────────
  // Mock Payment Flow
  // ─────────────────────────────────────────────

  async function handleUpgradeClick(event, planCode) {
    const btn = event.target;
    setButtonLoading(btn, true, "Creating payment...");

    try {
      const result = await createMockPayment(planCode);
      const payment = result.data;
      activePaymentId = payment.paymentId;

      checkoutPlanInfo.textContent = `${payment.planName} — ${formatCurrency(payment.amount, payment.currency)} / ${payment.billingLabel}`;
      checkoutResultMessage.style.display = "none";
      checkoutActions.style.display = "flex";
      checkoutSection.style.display = "block";
      checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });

      showToast("Mock payment created. Please simulate an outcome.", "info");
    } catch (error) {
      showToast(getPaymentErrorMessage(error), "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function handleCheckoutAction(action, actionFn, btn) {
    if (!activePaymentId) return;
    setButtonLoading(btn, true, "Processing...");

    try {
      const result = await actionFn(activePaymentId);
      const payment = result.data;

      checkoutResultMessage.textContent = result.message || "Payment processed.";
      checkoutResultMessage.className = `status-box ${payment.status === "SUCCESS" ? "status-success" : "status-error"}`;
      checkoutResultMessage.style.display = "flex";
      checkoutActions.style.display = "none";

      // Response tier rule: always use tier returned by backend, never assume.
      updateTierUI(payment.tier);
      if (typeof refreshCurrentUser === "function") {
        const refreshedUser = await refreshCurrentUser();
        if (refreshedUser) {
          currentUser = refreshedUser;
          updateTierUI(getCurrentTier());
        }
      }

      activePaymentId = null;
      await loadPlans();
      await loadHistory();

      showToast(result.message || "Payment processed.", payment.status === "SUCCESS" ? "success" : "info");
    } catch (error) {
      showToast(getPaymentErrorMessage(error), "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  simulateSuccessBtn.addEventListener("click", function (e) {
    handleCheckoutAction("success", markMockPaymentSuccess, e.target);
  });
  simulateFailBtn.addEventListener("click", function (e) {
    handleCheckoutAction("fail", markMockPaymentFail, e.target);
  });
  cancelPaymentBtn.addEventListener("click", function (e) {
    handleCheckoutAction("cancel", cancelMockPayment, e.target);
  });

  // ─────────────────────────────────────────────
  // Payment History
  // ─────────────────────────────────────────────

  function createHistoryRow(payment) {
    const row = document.createElement("div");
    row.className = "member-row";

    const main = document.createElement("div");
    main.className = "member-row-main";

    const name = document.createElement("span");
    name.className = "member-row-name";
    name.textContent = `${payment.planName || payment.planCode} — ${formatCurrency(payment.amount, payment.currency)}`;

    const statusBadge = document.createElement("span");
    statusBadge.className = statusBadgeClass(payment.status);
    statusBadge.textContent = payment.status;

    main.append(name, statusBadge);

    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.flexDirection = "column";
    meta.style.alignItems = "flex-end";
    meta.style.gap = "4px";

    const dateInfo = document.createElement("span");
    dateInfo.style.fontSize = "12px";
    dateInfo.style.color = "var(--text-muted)";
    dateInfo.textContent = payment.paidAt
      ? `Paid: ${formatDate(payment.paidAt)}`
      : `Created: ${formatDate(payment.createdAt)}`;
    meta.appendChild(dateInfo);

    if (payment.status === "PENDING") {
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "btn btn-secondary btn-sm";
      continueBtn.textContent = "Continue Mock Checkout";
      continueBtn.addEventListener("click", function () {
        activePaymentId = payment.paymentId;
        checkoutPlanInfo.textContent = `${payment.planName} — ${formatCurrency(payment.amount, payment.currency)} / ${payment.billingLabel}`;
        checkoutResultMessage.style.display = "none";
        checkoutActions.style.display = "flex";
        checkoutSection.style.display = "block";
        checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      meta.appendChild(continueBtn);
    }

    row.append(main, meta);
    return row;
  }

  async function loadHistory() {
    historyLoader.style.display = "flex";
    historyError.style.display = "none";
    historyList.style.display = "none";
    historyEmpty.style.display = "none";

    try {
      const result = await getMyPayments();
      const payments = Array.isArray(result.data) ? result.data : [];

      historyLoader.style.display = "none";

      if (payments.length === 0) {
        historyEmpty.style.display = "flex";
        return;
      }

      historyList.innerHTML = "";
      historyList.className = "member-list";
      payments.forEach(function (payment) {
        historyList.appendChild(createHistoryRow(payment));
      });
      historyList.style.display = "flex";
    } catch (error) {
      historyLoader.style.display = "none";
      historyError.textContent = getPaymentErrorMessage(error);
      historyError.style.display = "flex";
    }
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────

  updateTierUI(currentUser.tier || "FREE");
  await loadPlans();
  await loadHistory();
});
