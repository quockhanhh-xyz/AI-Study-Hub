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
        if (backLink && currentFlashcardSet.documentId) {
            backLink.href = `document-detail.html?id=${currentFlashcardSet.documentId}`;
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
    const progressFill = document.getElementById("flashcardProgressFill");
    if (progressFill) progressFill.style.width = `${percent}%`;

    const cardEl = document.getElementById("flashcardCard");
    cardEl.classList.toggle("flipped", isCardFlipped);

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
    if (knownBtn) knownBtn.classList.toggle("active", mark === "known");
    if (unknownBtn) unknownBtn.classList.toggle("active", mark === "unknown");

    // Clear any lingering browser focus ring so a mark button clicked on the
    // PREVIOUS card doesn't visually look "selected" on the card we just
    // navigated to (only the .active class above should indicate a mark).
    if (knownBtn) knownBtn.blur();
    if (unknownBtn) unknownBtn.blur();
}

function markCurrentCard(mark) {
    const flashcardIndex = deckOrder[currentCardIndex];
    // Toggle off if clicking the same mark again.
    cardMarks[flashcardIndex] = cardMarks[flashcardIndex] === mark ? undefined : mark;
    renderMarkButtons();
}

function flipCurrentCard() {
    isCardFlipped = !isCardFlipped;
    const cardEl = document.getElementById("flashcardCard");
    if (cardEl) cardEl.classList.toggle("flipped", isCardFlipped);
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
    const knownCount = deckOrder.filter(i => cardMarks[i] === "known").length;
    const unknownCount = deckOrder.filter(i => cardMarks[i] === "unknown").length;
    const unmarkedCount = deckOrder.length - knownCount - unknownCount;

    document.getElementById("flashcardKnownCount").textContent = knownCount;
    document.getElementById("flashcardUnknownCount").textContent = unknownCount;

    document.getElementById("flashcardSummaryText").textContent = unmarkedCount > 0
        ? `You went through all ${deckOrder.length} cards. ${unmarkedCount} card${unmarkedCount === 1 ? "" : "s"} left unmarked.`
        : `You went through all ${deckOrder.length} cards.`;

    const reviewUnknownBtn = document.getElementById("flashcardReviewUnknownBtn");
    if (reviewUnknownBtn) {
        reviewUnknownBtn.style.display = unknownCount > 0 ? "inline-flex" : "none";
    }

    document.getElementById("flashcardViewer").style.display = "none";
    document.getElementById("flashcardSummary").style.display = "block";
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