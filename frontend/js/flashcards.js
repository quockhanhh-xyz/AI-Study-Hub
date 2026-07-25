// flashcards.js – FE2: Flashcard Set Detail Page (Step A: Learning UX)
// Displays a generated flashcard set with flip front/back interaction.
// Data comes from getFlashcardSet(setId) — js/ai-learning-api.js.
//
// Study session model:
// - `deckOrder` holds the list of flashcard indices (into currentFlashcardSet.flashcards)
//   that make up the CURRENT study pass. Default pass = all cards, in order.
// - `currentCardIndex` is a pointer INTO deckOrder, not into the flashcards array directly.
//   This lets us support "Restart" and "Review Still learning cards" without duplicating state.
// - `cardMarks` maps flashcard array-index -> "known" | "unknown", kept across passes so a
//   filtered "review unknown" pass can update marks as the user re-studies them.

let currentFlashcardSet = null;
let deckOrder = [];
let currentCardIndex = 0;
let isCardFlipped = false;
let cardMarks = {};
let autoNextTimer = null;
let flashcardStartedAt = null;

document.addEventListener("DOMContentLoaded", async () => {
    const isAuthenticated = window.authReady ? await window.authReady : false;
    if (!isAuthenticated) return; // layout.js already redirects to login.html

    const params = new URLSearchParams(window.location.search);
    const setId = params.get("setId");

    if (!setId) {
        showFlashcardError("No flashcard set ID provided. Please open this page from a document.");
        return;
    }

    await loadFlashcardSet(setId);
    initFlashcardControls();
});

async function loadFlashcardSet(setId) {
    const loader = document.getElementById("flashcardLoader");
    const viewer = document.getElementById("flashcardViewer");

    try {
        const res = await AiLearningAPI.getFlashcardSet(setId);
        currentFlashcardSet = res.data;

        if (!currentFlashcardSet || !Array.isArray(currentFlashcardSet.flashcards) || currentFlashcardSet.flashcards.length === 0) {
            throw new Error("This flashcard set has no cards.");
        }

        document.getElementById("flashcardSetTitle").textContent = currentFlashcardSet.title || "Flashcards";
        document.getElementById("flashcardSetMeta").textContent =
            `${currentFlashcardSet.itemCount || currentFlashcardSet.flashcards.length} cards · Generated ${formatGeneratedAt(currentFlashcardSet.createdAt)}`;

        const backLink = document.getElementById("flashcardBackLink");
        const summaryBackLink = document.getElementById("flashcardSummaryBackLink");
        const backUrl = currentFlashcardSet.documentId
            ? `document-detail.html?id=${currentFlashcardSet.documentId}&tab=tools`
            : "documents.html";
            
        const handleBackClick = (e) => {
            e.preventDefault();
            if (document.referrer && document.referrer.includes("document-detail.html")) {
                window.history.back();
            } else {
                window.location.replace(backUrl);
            }
        };

        if (backLink) {
            backLink.href = backUrl;
            backLink.onclick = handleBackClick;
        }
        if (summaryBackLink) {
            summaryBackLink.href = backUrl;
            summaryBackLink.onclick = handleBackClick;
        }

        cardMarks = {};
        startDeck(currentFlashcardSet.flashcards.map((_, i) => i));

        loader.style.display = "none";
        viewer.style.display = "block";
    } catch (err) {
        console.error("Failed to load flashcard set", err);
        loader.style.display = "none";
        showFlashcardError(
            typeof mapAiLearningError === "function" ? mapAiLearningError(err) : (err.message || "Failed to load flashcard set.")
        );
    }
}

// Starts (or restarts) a study pass over the given list of flashcard indices.
function startDeck(indices) {
    deckOrder = indices;
    currentCardIndex = 0;
    isCardFlipped = false;
    flashcardStartedAt = new Date();

    document.getElementById("flashcardSummary").style.display = "none";
    document.getElementById("flashcardViewer").style.display = "block";
    renderCurrentCard();
}

function getCurrentCard() {
    return currentFlashcardSet.flashcards[deckOrder[currentCardIndex]];
}

function renderCurrentCard() {
    if (!currentFlashcardSet || deckOrder.length === 0) return;
    const card = getCurrentCard();

    if (autoNextTimer) clearTimeout(autoNextTimer);

    document.getElementById("flashcardFrontText").textContent = card.frontText || "";
    document.getElementById("flashcardBackText").textContent = card.backText || "";

    const sourcePageEl = document.getElementById("flashcardSourcePage");
    if (sourcePageEl) {
        if (card.sourcePage) {
            sourcePageEl.textContent = `Page ${card.sourcePage}`;
            sourcePageEl.style.display = "inline-block";
        } else {
            sourcePageEl.style.display = "none";
        }
    }

    const total = deckOrder.length;
    const position = currentCardIndex + 1;
    const percent = Math.round((position / total) * 100);
    document.getElementById("flashcardProgress").textContent = `Card ${position} / ${total} · ${percent}%`;
    const progressBar = document.getElementById("flashcardProgressBar");
    if (progressBar) progressBar.value = percent;

    const cardEl = document.getElementById("flashcardCard");
    cardEl.classList.toggle("flipped", isCardFlipped);

    // Hide marking buttons until answer is revealed (card flipped)
    const markRow = document.getElementById("flashcardMarkRow");
    if (markRow) {
        markRow.style.display = isCardFlipped ? "flex" : "none";
    }

    const toast = document.getElementById("flashcardFeedbackToast");
    if (toast) toast.textContent = "";

    renderMarkButtons();

    const prevBtn = document.getElementById("flashcardPrevBtn");
    const nextBtn = document.getElementById("flashcardNextBtn");
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.textContent = currentCardIndex === total - 1 ? "Finish" : "Next →";
}

function renderMarkButtons() {
    const flashcardIndex = deckOrder[currentCardIndex];
    const mark = cardMarks[flashcardIndex];

    const knownBtn = document.getElementById("flashcardKnownBtn");
    const unknownBtn = document.getElementById("flashcardUnknownBtn");
    if (knownBtn) {
        knownBtn.classList.toggle("active", mark === "known");
        knownBtn.style.boxShadow = mark === "known" ? "0 0 0 2px #047857" : "none";
        knownBtn.blur();
    }
    if (unknownBtn) {
        unknownBtn.classList.toggle("active", mark === "unknown");
        unknownBtn.style.boxShadow = mark === "unknown" ? "0 0 0 2px #b45309" : "none";
        unknownBtn.blur();
    }
}

function markCurrentCard(mark) {
    const flashcardIndex = deckOrder[currentCardIndex];
    const prevMark = cardMarks[flashcardIndex];
    cardMarks[flashcardIndex] = prevMark === mark ? undefined : mark;
    renderMarkButtons();

    const toast = document.getElementById("flashcardFeedbackToast");
    if (toast) {
        if (cardMarks[flashcardIndex] === "known") {
            toast.textContent = "✓ Marked as known";
            toast.style.color = "#047857";
        } else if (cardMarks[flashcardIndex] === "unknown") {
            toast.textContent = "✕ Marked for review";
            toast.style.color = "#b45309";
        } else {
            toast.textContent = "";
        }
    }

    if (autoNextTimer) clearTimeout(autoNextTimer);
    if (cardMarks[flashcardIndex]) {
        autoNextTimer = setTimeout(() => {
            goToNextCard();
        }, 400);
    }
}

function flipCurrentCard() {
    isCardFlipped = !isCardFlipped;
    const cardEl = document.getElementById("flashcardCard");
    if (cardEl) cardEl.classList.toggle("flipped", isCardFlipped);

    const markRow = document.getElementById("flashcardMarkRow");
    if (markRow) {
        markRow.style.display = isCardFlipped ? "flex" : "none";
    }
}

function goToPreviousCard() {
    if (currentCardIndex <= 0) return;
    currentCardIndex--;
    isCardFlipped = false;
    renderCurrentCard();
}

function goToNextCard() {
    if (currentCardIndex >= deckOrder.length - 1) {
        showFlashcardSummary();
        return;
    }
    currentCardIndex++;
    isCardFlipped = false;
    renderCurrentCard();
}

function showFlashcardSummary() {
    if (autoNextTimer) clearTimeout(autoNextTimer);

    const knownCount = deckOrder.filter(i => cardMarks[i] === "known").length;
    const unknownCount = deckOrder.filter(i => cardMarks[i] === "unknown").length;
    const unmarkedCount = deckOrder.length - knownCount - unknownCount;

    const totalEl = document.getElementById("flashcardTotalCount");
    if (totalEl) totalEl.textContent = deckOrder.length;

    document.getElementById("flashcardKnownCount").textContent = knownCount;
    document.getElementById("flashcardUnknownCount").textContent = unknownCount;

    const unmarkedEl = document.getElementById("flashcardUnmarkedCount");
    if (unmarkedEl) unmarkedEl.textContent = unmarkedCount;

    document.getElementById("flashcardSummaryText").textContent = unmarkedCount > 0
        ? `You went through all ${deckOrder.length} cards. ${unmarkedCount} card${unmarkedCount === 1 ? "" : "s"} left unmarked.`
        : `Great job! You reviewed all ${deckOrder.length} flashcards in this set.`;

    const reviewUnknownBtn = document.getElementById("flashcardReviewUnknownBtn");
    if (reviewUnknownBtn) {
        reviewUnknownBtn.style.display = unknownCount > 0 ? "inline-flex" : "none";
    }

    document.getElementById("flashcardViewer").style.display = "none";
    document.getElementById("flashcardSummary").style.display = "block";

    // Submit attempt to backend
    if (flashcardStartedAt && deckOrder.length === currentFlashcardSet.flashcards.length) {
        // Only submit if they studied the full deck (not a review-only pass)
        try {
            AiLearningAPI.submitFlashcardAttempt(currentFlashcardSet.flashcardSetId, {
                rememberedCount: knownCount,
                forgotCount: unknownCount,
                startedAt: flashcardStartedAt.toISOString(),
                completedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to submit flashcard attempt", e);
        }
    }
}

function restartFullDeck() {
    startDeck(currentFlashcardSet.flashcards.map((_, i) => i));
}

function reviewUnknownCards() {
    const unknownIndices = Object.keys(cardMarks)
        .map(Number)
        .filter(i => cardMarks[i] === "unknown");
    if (unknownIndices.length === 0) return;
    startDeck(unknownIndices);
}

function initFlashcardControls() {
    const stage = document.getElementById("flashcardStage");
    const prevBtn = document.getElementById("flashcardPrevBtn");
    const nextBtn = document.getElementById("flashcardNextBtn");
    const knownBtn = document.getElementById("flashcardKnownBtn");
    const unknownBtn = document.getElementById("flashcardUnknownBtn");
    const restartBtn = document.getElementById("flashcardRestartBtn");
    const restartFromSummaryBtn = document.getElementById("flashcardRestartFromSummaryBtn");
    const reviewUnknownBtn = document.getElementById("flashcardReviewUnknownBtn");

    if (stage) {
        stage.addEventListener("click", flipCurrentCard);
        stage.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                flipCurrentCard();
            }
        });
    }
    if (prevBtn) prevBtn.addEventListener("click", goToPreviousCard);
    if (nextBtn) nextBtn.addEventListener("click", goToNextCard);
    if (knownBtn) knownBtn.addEventListener("click", () => markCurrentCard("known"));
    if (unknownBtn) unknownBtn.addEventListener("click", () => markCurrentCard("unknown"));
    if (restartBtn) restartBtn.addEventListener("click", restartFullDeck);
    if (restartFromSummaryBtn) restartFromSummaryBtn.addEventListener("click", restartFullDeck);
    if (reviewUnknownBtn) reviewUnknownBtn.addEventListener("click", reviewUnknownCards);

    document.addEventListener("keydown", (e) => {
        // Ignore navigation shortcuts while the summary screen is showing.
        if (document.getElementById("flashcardSummary").style.display === "block") return;
        if (e.key === "ArrowLeft") goToPreviousCard();
        if (e.key === "ArrowRight") goToNextCard();
    });
}

function showFlashcardError(message) {
    const errorState = document.getElementById("flashcardErrorState");
    if (errorState) {
        errorState.textContent = message;
        errorState.style.display = "block";
    }
}