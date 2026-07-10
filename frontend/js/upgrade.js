/**
 * Upgrade / Pricing Page Controller (FE2 - Step 13B).
 * Handles plan display, VNPay + Mock payment flow, and payment history.
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
  const alreadyPremiumBanner = document.getElementById("alreadyPremiumBanner");

  const paymentStatusBanner = document.getElementById("paymentStatusBanner");
  const paymentStatusBannerText = document.getElementById("paymentStatusBannerText");
  const paymentStatusBannerAction = document.getElementById("paymentStatusBannerAction");
  const paymentStatusBannerCancel = document.getElementById("paymentStatusBannerCancel");

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
    // targetTier is always present per Step 13B contract (FREE/PREMIUM/ULTRA)
    return normalizeTier(plan.targetTier);
  }

  function formatDate(value) {
    if (!value) return "-";
    let dateStr = String(value);
    if (!dateStr.endsWith("Z") && !dateStr.includes("+")) {
      dateStr += "Z";
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "-";
<<<<<<< HEAD
    return date.toLocaleString("vi-VN", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
=======
    return date.toLocaleString("vi-VN");
>>>>>>> origin/develop
  }

  function updateTierUI(tier) {
    const normalizedTier = normalizeTier(tier);
    currentUser.tier = normalizedTier;
    currentUser.effectiveTier = normalizedTier;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    const PARTY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" width="14" height="14" style="vertical-align:-2px;margin-right:6px;"><path fill="#16a34a" fill-rule="evenodd" d="M6.85809 0.0378864C6.46428 0.166299 6.24914 0.589641 6.37755 0.983447c0.20769 0.636913 0.18035 1.327293 -0.07702 1.945723 -0.15916 0.38242 0.02184 0.82145 0.40426 0.9806 0.38241 0.15915 0.82144 -0.02184 0.98059 -0.40426 0.39515 -0.94949 0.43711 -2.0093 0.11827 -2.987086 -0.12841 -0.393806 -0.55176 -0.6089501 -0.94556 -0.4805376ZM9.15914 3.05478c-0.05698 -0.41028 0.22943 -0.78906 0.6397 -0.84604 0.41026 -0.05697 0.78906 0.22943 0.84606 0.63971 0.0917 0.66069 -0.0609 1.33223 -0.4293 1.88825 -0.22881 0.34529 -0.69419 0.43973 -1.03949 0.21094 -0.34529 -0.22879 -0.43974 -0.69417 -0.21095 -1.03947 0.16642 -0.25116 0.23546 -0.55468 0.19398 -0.85339ZM2.35203 4.5956c0.4856 -0.83619 1.56726 -1.06633 2.35596 -0.53103 0.84837 0.57581 2.1462 1.49677 2.90279 2.24369 0.75653 0.74688 1.69433 2.03286 2.28121 2.87388 0.54521 0.78134 0.33031 1.86626 -0.49889 2.36346 -2.45124 1.4698 -5.22105 2.5647 -7.90405 2.4446 -0.793228 -0.0355 -1.4270834 -0.6616 -1.4732368 -1.454C-0.140432 9.85376 0.916322 7.06788 2.35203 4.5956Zm1.65398 0.50325c-0.20021 -0.13589 -0.45826 -0.07314 -0.57303 0.12448C2.04959 7.60552 1.12815 10.1364 1.2637 12.4635c0.00893 0.1534 0.12861 0.2711 0.28123 0.278 2.32705 0.1041 4.84349 -0.8517 7.20535 -2.268 0.19581 -0.1174 0.25552 -0.377 0.11662 -0.57604 -0.59288 -0.84962 -1.47054 -2.04435 -2.13431 -2.69965 -0.66377 -0.6553 -1.86954 -1.51727 -2.72658 -2.09896ZM11.2019 7.9557c0.2877 -0.06534 0.5895 -0.02194 0.8472 0.12186 0.3617 0.20184 0.8185 0.07225 1.0204 -0.28945 0.2018 -0.36171 0.0722 -0.81856 -0.2895 -1.0204 -0.581 -0.32424 -1.2614 -0.42211 -1.9103 -0.27477 -0.4039 0.09172 -0.657 0.49352 -0.5653 0.89746 0.0918 0.40393 0.4936 0.65702 0.8975 0.5653Zm1.3142 -3.2696c-0.4142 0 -0.75 -0.33578 -0.75 -0.75 0 -0.41421 0.3358 -0.75 0.75 -0.75h0.7335c0.4142 0 0.75 0.33579 0.75 0.75 0 0.41422 -0.3358 0.75 -0.75 0.75h-0.7335Z" clip-rule="evenodd"/></svg>';

    if (alreadyPremiumBanner) {
      const message = alreadyPremiumBanner.querySelector("span");
      if (message) {
        message.innerHTML = normalizedTier === "ULTRA"
          ? `${PARTY_ICON}You are currently on the Ultra plan! You can renew it before it expires.`
          : `${PARTY_ICON}You are currently on the Premium plan! You can renew it or upgrade to Ultra.`;
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
      case "EXPIRED": return "status-badge private";
      case "REVIEW_REQUIRED": return "status-badge pending";
      default: return "status-badge private";
    }
  }

  async function refreshTierFromServer() {
    if (typeof refreshCurrentUser === "function") {
      const refreshedUser = await refreshCurrentUser();
      if (refreshedUser) {
        currentUser = refreshedUser;
        updateTierUI(getCurrentTier());
      }
    }
  }

  // ─────────────────────────────────────────────
  // Payment status banner (PAYMENT_ALREADY_PENDING / REVIEW_REQUIRED)
  // ─────────────────────────────────────────────

  function hidePaymentBanner() {
    if (!paymentStatusBanner) return;
    paymentStatusBanner.style.display = "none";
    paymentStatusBannerAction.style.display = "none";
    paymentStatusBannerAction.onclick = null;
    paymentStatusBannerCancel.style.display = "none";
    paymentStatusBannerCancel.onclick = null;
  }

  async function cancelPaymentOrder(paymentId, button) {
    const confirmed = typeof confirmAction === "function"
      ? await confirmAction({
        title: "Cancel payment?",
        message: "This closes the pending checkout so you can create a new payment. Do not cancel if you have already completed payment at VNPay.",
        confirmText: "Cancel payment",
        danger: true
      })
      : window.confirm("Cancel this pending payment?");

    if (!confirmed) return;
    setButtonLoading(button, true, "Cancelling...");
    try {
      const result = await cancelPendingPayment(paymentId);
      hidePaymentBanner();
      await loadHistory();
      showToast(result.message || "Payment cancelled successfully.", "success");
    } catch (error) {
      showToast(mapPaymentError(error), "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  function showPaymentBanner(error) {
    if (!paymentStatusBanner) return;
    const code = error && error.code;
    const data = (error && error.data) || {};

    paymentStatusBannerText.textContent = mapPaymentError(error);
    paymentStatusBannerAction.style.display = "none";
    paymentStatusBannerAction.onclick = null;
    paymentStatusBannerCancel.style.display = "none";
    paymentStatusBannerCancel.onclick = null;

    if (code === "PAYMENT_ALREADY_PENDING") {
      paymentStatusBanner.style.background = "#fffbeb";
      paymentStatusBanner.style.borderColor = "#fde68a";

      if (data.paymentProvider === "VNPAY_SANDBOX" && data.paymentUrl) {
        paymentStatusBannerAction.textContent = "Continue payment";
        paymentStatusBannerAction.style.display = "inline-flex";
        paymentStatusBannerAction.onclick = function (e) {
          e.preventDefault();
          window.location.href = data.paymentUrl;
        };
      } else if (data.paymentProvider === "MOCK") {
        paymentStatusBannerAction.textContent = "Continue Mock Checkout";
        paymentStatusBannerAction.style.display = "inline-flex";
        paymentStatusBannerAction.onclick = async function (e) {
          e.preventDefault();
          try {
            const result = await getPayment(data.paymentId);
            openMockCheckout(result.data);
          } catch (fetchError) {
            showToast(mapPaymentError(fetchError), "error");
          }
        };
      }

      if (data.paymentId) {
        paymentStatusBannerCancel.style.display = "inline-flex";
        paymentStatusBannerCancel.onclick = function () {
          cancelPaymentOrder(data.paymentId, paymentStatusBannerCancel);
        };
      }
    } else if (code === "PAYMENT_REQUIRES_MANUAL_REVIEW") {
      paymentStatusBanner.style.background = "#fef2f2";
      paymentStatusBanner.style.borderColor = "#fecaca";
    } else {
      paymentStatusBanner.style.background = "#fef2f2";
      paymentStatusBanner.style.borderColor = "#fecaca";
    }

    paymentStatusBanner.style.display = "flex";
    paymentStatusBanner.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-right:6px;flex-shrink:0;"><path fill="#16a34a" fill-rule="evenodd" d="M23.914 6.914 8.5 22.328 0.086 13.914l2.828 -2.828L8.5 16.672 21.086 4.086l2.828 2.828Z" clip-rule="evenodd"/></svg>';
    const FIRE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" style="vertical-align:-2px;margin-right:4px;"><path stroke="#ffffff" d="M12 23.5c-4.566 0 -8.5 -3.702 -8.5 -8.268a8.268 8.268 0 0 1 2.798 -6.2L9 6.647c1.758 -1.55 2.843 -3.814 3 -6.147h0.5c1.509 1.94 1.995 4.344 2.06 6.452 0.077 2.455 2.07 4.814 4.516 4.596l0.534 -0.048a8.26 8.26 0 0 1 0.89 3.732c0 4.566 -3.934 8.268 -8.5 8.268Zm0 0c2.149 0 4 -1.77 4 -3.953 0 -1.135 -0.48 -2.214 -1.317 -2.965l-1.272 -1.14c-0.911 -0.942 -1.161 -1.94 -1.161 -1.94h-0.5s-0.25 0.998 -1.161 1.94l-1.273 1.14A3.982 3.982 0 0 0 8 19.547C8 21.73 9.85 23.5 12 23.5Z" stroke-width="1.5"/></svg>';
    const CROWN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="14" height="14" style="vertical-align:-3px;margin-right:4px;"><g fill="#ffffff"><path d="M29.715 9.145h1.52v3.04h-1.52Z"/><path d="M26.665 7.615h3.05v1.53h-3.05Z"/><path d="m26.665 18.285 1.53 0 0 -4.57 1.52 0 0 -1.53 -3.05 0 0 -3.04 -1.52 0 0 4.57 1.52 0 0 4.57z"/><path d="m25.145 19.805 -1.53 0 0 1.53 1.53 0 0 1.52 -18.29 0 0 -1.52 1.53 0 0 -1.53 -1.53 0 0 -1.52 -1.52 0 0 7.62 1.52 0 0 1.52 18.29 0 0 -1.52 1.52 0 0 -7.62 -1.52 0 0 1.52z"/><path d="M23.615 13.715h1.53v1.52h-1.53Z"/><path d="M22.095 15.235h1.52v1.53h-1.52Z"/><path d="M20.575 16.765h1.52v1.52h-1.52Z"/><path d="M19.045 19.805h3.05v1.53h-3.05Z"/><path d="M19.045 13.715h1.53v3.05h-1.53Z"/><path d="M17.525 10.665h1.52v3.05h-1.52Z"/><path d="M17.525 6.095h1.52v3.05h-1.52Z"/><path d="M14.475 9.145h3.05v1.52h-3.05Z"/><path d="M14.475 4.575h3.05v1.52h-3.05Z"/><path d="M14.475 18.285h3.05v3.05h-3.05Z"/><path d="M12.955 10.665h1.52v3.05h-1.52Z"/><path d="M12.955 6.095h1.52v3.05h-1.52Z"/><path d="M11.425 13.715h1.53v3.05h-1.53Z"/><path d="M9.905 19.805h3.05v1.53h-3.05Z"/><path d="M9.905 16.765h1.52v1.52h-1.52Z"/><path d="M8.385 15.235h1.52v1.53h-1.52Z"/><path d="M6.855 13.715h1.53v1.52h-1.53Z"/><path d="m2.285 12.185 0 1.53 1.53 0 0 4.57 1.52 0 0 -4.57 1.52 0 0 -4.57 -1.52 0 0 3.04 -3.05 0z"/><path d="M2.285 7.615h3.05v1.53h-3.05Z"/><path d="M0.765 9.145h1.52v3.04H0.765Z"/></g></svg>';

    if (planTier === "PREMIUM") {
      card.classList.add("stat-card-premium");
      const tag = document.createElement("div");
      tag.innerHTML = `${FIRE_ICON}Best Value`;
      tag.style.cssText = "position:absolute;top:-14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;background:#f59e0b;color:#fff;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.15);";
      card.style.position = "relative";
      card.appendChild(tag);
    } else if (planTier === "ULTRA") {
      card.classList.add("stat-card-ultra");
      const tag = document.createElement("div");
      tag.innerHTML = `${CROWN_ICON}Most Popular`;
      tag.style.cssText = "position:absolute;top:-14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;background:#7c3aed;color:#fff;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.15);";
      card.style.position = "relative";
      card.appendChild(tag);
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
    const isPurchasable = plan.purchasable === true;
    const isHigherPlan = planRank > currentRank;
    const isLowerPlan = planRank < currentRank;

    if (isCurrentPlan) {
      const currentBadge = document.createElement("div");
      currentBadge.innerHTML = `${CHECK_ICON}Current Plan`;
      currentBadge.style.cssText = "margin-top:16px;display:flex;align-items:center;justify-content:center;background:#dcfce7;color:#16a34a;font-weight:600;font-size:13px;padding:6px 12px;border-radius:8px;";
      card.appendChild(currentBadge);

      if (isPurchasable) {
        card.appendChild(buildPurchaseButtons(plan, planTier, `Renew ${plan.planName || planTier}`));
      }
    } else if (isHigherPlan && isPurchasable) {
      card.appendChild(buildPurchaseButtons(plan, planTier, `Upgrade to ${plan.planName || planTier}`));
    } else if (isLowerPlan) {
      const lowerPlanNote = document.createElement("div");
      lowerPlanNote.className = "helper-text";
      lowerPlanNote.style.marginTop = "16px";
      lowerPlanNote.textContent = planTier === "FREE"
        ? "Included with every account"
        : "Downgrade is not supported";
      card.appendChild(lowerPlanNote);
    }

    return card;
  }

  function buildPurchaseButtons(plan, planTier, actionLabel) {
    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "16px";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "8px";

    const label = document.createElement("div");
    label.className = "helper-text";
    label.style.textAlign = "center";
    label.style.marginBottom = "4px";
    label.textContent = actionLabel;
    wrapper.appendChild(label);

    const vnpayBtn = document.createElement("button");
    vnpayBtn.type = "button";
    vnpayBtn.className = "btn btn-primary";
    vnpayBtn.textContent = "Pay with VNPay";
    vnpayBtn.addEventListener("click", function (event) {
      handleVNPayClick(event, plan.planCode);
    });
    wrapper.appendChild(vnpayBtn);

    const mockLink = document.createElement("a");
    mockLink.href = "#";
    mockLink.textContent = "Mock Checkout (Demo)";
    mockLink.style.textAlign = "center";
    mockLink.style.fontSize = "12px";
    mockLink.style.textDecoration = "underline";
    mockLink.style.color = "var(--text-muted)";
    mockLink.style.marginTop = "4px";
    mockLink.addEventListener("click", function (event) {
      event.preventDefault();
      handleMockClick(event, plan.planCode);
    });
    wrapper.appendChild(mockLink);

    return wrapper;
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
  // VNPay Flow
  // ─────────────────────────────────────────────

  async function handleVNPayClick(event, planCode) {
    const btn = event.target;
    hidePaymentBanner();
    setButtonLoading(btn, true, "Creating payment...");

    try {
      const result = await createVNPayPayment(planCode);
      const payment = result.data;
      window.location.href = payment.paymentUrl;
      // No need to reset button state — navigating away.
    } catch (error) {
      setButtonLoading(btn, false);
      if (error && (error.code === "PAYMENT_ALREADY_PENDING" || error.code === "PAYMENT_REQUIRES_MANUAL_REVIEW")) {
        showPaymentBanner(error);
      } else {
        showToast(mapPaymentError(error), "error");
      }
    }
  }

  // ─────────────────────────────────────────────
  // Mock Payment Flow
  // ─────────────────────────────────────────────

  function openMockCheckout(payment) {
    activePaymentId = payment.paymentId;
    checkoutPlanInfo.textContent = `${payment.planName} — ${formatCurrency(payment.amount, payment.currency)} / ${payment.billingLabel}`;
    checkoutResultMessage.style.display = "none";
    checkoutActions.style.display = "flex";
    checkoutSection.style.display = "block";
    checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleMockClick(event, planCode) {
    const btn = event.target;
    hidePaymentBanner();
    setButtonLoading(btn, true, "Creating payment...");

    try {
      const result = await createMockPayment(planCode);
      openMockCheckout(result.data);
      showToast("Mock payment created. Please simulate an outcome.", "info");
    } catch (error) {
      if (error && (error.code === "PAYMENT_ALREADY_PENDING" || error.code === "PAYMENT_REQUIRES_MANUAL_REVIEW")) {
        showPaymentBanner(error);
      } else {
        showToast(mapPaymentError(error), "error");
      }
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function handleCheckoutAction(actionFn, btn) {
    if (!activePaymentId) return;
    setButtonLoading(btn, true, "Processing...");

    try {
      const result = await actionFn(activePaymentId);
      const payment = result.data;

      checkoutResultMessage.textContent = result.message || "Payment processed.";
      checkoutResultMessage.className = `status-box ${payment.status === "SUCCESS" ? "status-success" : "status-error"}`;
      checkoutResultMessage.style.display = "flex";
      checkoutActions.style.display = "none";

      activePaymentId = null;
      await refreshTierFromServer();
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
    handleCheckoutAction(mockPaymentSuccess, e.target);
  });
  simulateFailBtn.addEventListener("click", function (e) {
    handleCheckoutAction(mockPaymentFail, e.target);
  });
  cancelPaymentBtn.addEventListener("click", function (e) {
    handleCheckoutAction(mockPaymentCancel, e.target);
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

    const statusInfo = formatPaymentStatus(payment.status);
    const statusBadge = document.createElement("span");
    statusBadge.className = `status-badge ${statusInfo.class}`;
    statusBadge.textContent = statusInfo.label;

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

    if (canContinueVNPay(payment)) {
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "btn btn-secondary btn-sm";
      continueBtn.textContent = "Continue payment";
      continueBtn.addEventListener("click", function () {
        window.location.href = payment.paymentUrl;
      });
      meta.appendChild(continueBtn);

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-danger btn-sm";
      cancelBtn.textContent = "Cancel payment";
      cancelBtn.addEventListener("click", function () {
        cancelPaymentOrder(payment.paymentId, cancelBtn);
      });
      meta.appendChild(cancelBtn);
    } else if (isMockPayment(payment) && payment.status === "PENDING") {
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "btn btn-secondary btn-sm";
      continueBtn.textContent = "Continue Mock Checkout";
      continueBtn.addEventListener("click", function () {
        openMockCheckout(payment);
      });
      meta.appendChild(continueBtn);

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-danger btn-sm";
      cancelBtn.textContent = "Cancel payment";
      cancelBtn.addEventListener("click", function () {
        cancelPaymentOrder(payment.paymentId, cancelBtn);
      });
      meta.appendChild(cancelBtn);
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
