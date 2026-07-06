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

  // ─────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────

  function formatCurrency(amount, currency) {
    const formatted = Number(amount || 0).toLocaleString("en-US");
    return `${formatted} ${currency || "VND"}`;
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
    const normalizedTier = tier === "PREMIUM" ? "PREMIUM" : "FREE";
    currentUser.tier = normalizedTier;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    if (currentTierBadge) {
      currentTierBadge.textContent = normalizedTier;
      currentTierBadge.classList.remove("badge-tier-free", "badge-tier-premium");
      currentTierBadge.classList.add(normalizedTier === "PREMIUM" ? "badge-tier-premium" : "badge-tier-free");
    }

    if (alreadyPremiumBanner) {
      alreadyPremiumBanner.style.display = normalizedTier === "PREMIUM" ? "flex" : "none";
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
    const card = document.createElement("div");
    card.className = "card";
    card.style.maxWidth = "none";

    if (plan.planCode === "PREMIUM") {
      card.classList.add("stat-card-premium");
    }

    const title = document.createElement("h2");
    title.textContent = plan.planName || plan.planCode;
    card.appendChild(title);

    const price = document.createElement("p");
    price.style.textAlign = "center";
    price.style.fontSize = "24px";
    price.style.fontWeight = "700";
    price.style.color = plan.planCode === "PREMIUM" ? "#b45309" : "var(--text-main)";
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
    const isCurrentPlan =
      (currentUser.tier !== "PREMIUM" && plan.planCode === "FREE") ||
      (currentUser.tier === "PREMIUM" && plan.planCode === "PREMIUM");

    if (isCurrentPlan) {
      const currentBadge = document.createElement("div");
      currentBadge.className = "helper-text success";
      currentBadge.style.marginTop = "16px";
      currentBadge.textContent = "Current Plan";
      card.appendChild(currentBadge);
    } else if (plan.planCode === "PREMIUM" && currentUser.tier !== "PREMIUM") {
      const upgradeBtn = document.createElement("button");
      upgradeBtn.type = "button";
      upgradeBtn.className = "btn btn-primary";
      upgradeBtn.style.marginTop = "16px";
      upgradeBtn.textContent = "Upgrade to Premium";
      upgradeBtn.addEventListener("click", handleUpgradeClick);
      card.appendChild(upgradeBtn);
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
      pricingError.textContent = mapPaymentError(error);
      pricingError.style.display = "flex";
    }
  }

  // ─────────────────────────────────────────────
  // Mock Payment Flow
  // ─────────────────────────────────────────────

  async function handleUpgradeClick(event) {
    const btn = event.target;
    setButtonLoading(btn, true, "Creating payment...");

    try {
      const result = await createMockPayment("PREMIUM");
      const payment = result.data;
      activePaymentId = payment.paymentId;

      checkoutPlanInfo.textContent = `${payment.planName} — ${formatCurrency(payment.amount, payment.currency)} / ${payment.billingLabel}`;
      checkoutResultMessage.style.display = "none";
      checkoutActions.style.display = "flex";
      checkoutSection.style.display = "block";
      checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });

      showToast("Mock payment created. Please simulate an outcome.", "info");
    } catch (error) {
      showToast(mapPaymentError(error), "error");
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
      await refreshCurrentUser();

      activePaymentId = null;
      await loadPlans();
      await loadHistory();

      showToast(result.message || "Payment processed.", payment.status === "SUCCESS" ? "success" : "info");
    } catch (error) {
      showToast(mapPaymentError(error), "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  simulateSuccessBtn.addEventListener("click", function (e) {
    handleCheckoutAction("success", mockPaymentSuccess, e.target);
  });
  simulateFailBtn.addEventListener("click", function (e) {
    handleCheckoutAction("fail", mockPaymentFail, e.target);
  });
  cancelPaymentBtn.addEventListener("click", function (e) {
    handleCheckoutAction("cancel", mockPaymentCancel, e.target);
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
      historyError.textContent = mapPaymentError(error);
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
