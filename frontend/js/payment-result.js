/**
 * Payment Result Page Controller (FE2 - Step 13B).
 * Polls payment status after VNPay/Mock redirect and shows the outcome.
 * Never trusts vnp_ResponseCode on the query string — only GET /api/payments/{id}.
 */
document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const POLL_INTERVAL_MS = 2500;
  const MAX_POLLS = 15;
  const TERMINAL_STATUSES = ["SUCCESS", "FAILED", "CANCELLED", "EXPIRED", "REVIEW_REQUIRED"];

  const resultLoading = document.getElementById("resultLoading");
  const resultLoadingText = document.getElementById("resultLoadingText");
  const resultInvalid = document.getElementById("resultInvalid");
  const resultSessionExpired = document.getElementById("resultSessionExpired");
  const resultLoginLink = document.getElementById("resultLoginLink");
  const resultStatus = document.getElementById("resultStatus");
  const resultStatusBadge = document.getElementById("resultStatusBadge");
  const resultStatusMessage = document.getElementById("resultStatusMessage");
  const resultPlanInfo = document.getElementById("resultPlanInfo");
  const resultActions = document.getElementById("resultActions");

  function hideAllSections() {
    resultLoading.style.display = "none";
    resultInvalid.style.display = "none";
    resultSessionExpired.style.display = "none";
    resultStatus.style.display = "none";
  }

  function formatCurrency(amount, currency) {
    const formatted = Number(amount || 0).toLocaleString("en-US");
    return `${formatted} ${currency || "VND"}`;
  }

  function buildActionButton(label, href, variant = "btn-secondary") {
    const link = document.createElement("a");
    link.href = href;
    link.className = `btn ${variant} btn-auto`;
    link.textContent = label;
    return link;
  }

  function showSessionExpired(paymentId) {
    hideAllSections();
    const currentUrl = `payment-result.html?paymentId=${encodeURIComponent(paymentId)}`;
    resultLoginLink.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
    resultSessionExpired.style.display = "block";
  }

  function showInvalid() {
    hideAllSections();
    resultInvalid.style.display = "flex";
  }

  const STATUS_MESSAGES = {
    PENDING: "Your payment is still being processed. This page will update automatically.",
    SUCCESS: "Your payment was successful and your plan has been updated.",
    FAILED: "Your payment could not be completed.",
    CANCELLED: "This payment was cancelled.",
    EXPIRED: "This payment order has expired. Please create a new one.",
    REVIEW_REQUIRED: "Your payment requires manual review. Please contact support or try again later."
  };

  function renderStatus(payment) {
    hideAllSections();
    resultStatus.style.display = "block";

    const statusInfo = formatPaymentStatus(payment.status);
    resultStatusBadge.textContent = statusInfo.label;
    resultStatusBadge.className = `payment-result-badge ${statusInfo.class}`;

    resultStatusMessage.textContent = STATUS_MESSAGES[payment.status] || "";

    if (payment.planName) {
      resultPlanInfo.textContent = `${payment.planName} — ${formatCurrency(payment.amount, payment.currency)}`;
    } else {
      resultPlanInfo.textContent = "";
    }

    resultActions.innerHTML = "";

    if (payment.status === "SUCCESS") {
      resultActions.appendChild(buildActionButton("Go to Dashboard", "dashboard.html", "btn-primary"));
    } else if (payment.status === "FAILED" || payment.status === "CANCELLED" || payment.status === "EXPIRED") {
      resultActions.appendChild(buildActionButton("Try Again", "upgrade.html", "btn-primary"));
    } else if (payment.status === "REVIEW_REQUIRED") {
      resultActions.appendChild(buildActionButton("View Payment History", "upgrade.html", "btn-secondary"));
    }
  }

  function getPaymentIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("paymentId");
  }

  function getErrorFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("error");
  }

  async function fetchPaymentStatus(paymentId) {
    // Direct apiRequest call (not getPayment()) so we can pass skipUnauthorizedRedirect
    // and keep control of the 401 flow instead of an immediate hard redirect.
    return await apiRequest(`/api/payments/${paymentId}`, {
      method: "GET",
      skipUnauthorizedRedirect: true
    });
  }

  async function pollPayment(paymentId) {
    let attempts = 0;

    while (attempts < MAX_POLLS) {
      attempts++;
      resultLoadingText.textContent = `Checking payment status... (${attempts}/${MAX_POLLS})`;

      try {
        const result = await fetchPaymentStatus(paymentId);
        const payment = result.data;

        if (TERMINAL_STATUSES.includes(payment.status) && payment.status !== "PENDING") {
          if (payment.status === "SUCCESS" && typeof refreshCurrentUser === "function") {
            await refreshCurrentUser();
          }
          renderStatus(payment);
          return;
        }

        // Still PENDING — show current state and keep polling.
        renderStatus(payment);
        resultLoading.style.display = "none";
      } catch (error) {
        if (error && error.status === 401) {
          showSessionExpired(paymentId);
          return;
        }
        showInvalid();
        return;
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }

    // Ran out of polling attempts while still PENDING.
    resultLoadingText.textContent = "";
    showToast("Still waiting for payment confirmation. Please check your payment history later.", "info");
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────

  const returnError = getErrorFromQuery();
  if (returnError === "payment_return_invalid") {
    showInvalid();
    return;
  }

  const paymentId = getPaymentIdFromQuery();
  if (!paymentId) {
    showInvalid();
    return;
  }

  hideAllSections();
  resultLoading.style.display = "flex";
  await pollPayment(paymentId);
});