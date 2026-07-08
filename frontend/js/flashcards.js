// flashcards.js – FE2: Flashcard Set Detail Page (Step 14)
// Displays a generated flashcard set with flip front/back interaction.
// Data comes from getFlashcardSet(setId) — js/ai-learning-api.js.

let currentFlashcardSet = null;
let currentCardIndex = 0;
let isCardFlipped = false;

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
    const errorState = document.getElementById("flashcardErrorState");
    const viewer = document.getElementById("flashcardViewer");

    try {
        const res = await getFlashcardSet(setId);
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

        currentCardIndex = 0;
        isCardFlipped = false;
        renderCurrentCard();

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

function renderCurrentCard() {
    if (!currentFlashcardSet) return;
    const cards = currentFlashcardSet.flashcards;
    const card = cards[currentCardIndex];

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

    document.getElementById("flashcardProgress").textContent = `Card ${currentCardIndex + 1} / ${cards.length}`;

    const cardEl = document.getElementById("flashcardCard");
    cardEl.classList.toggle("flipped", isCardFlipped);

    const prevBtn = document.getElementById("flashcardPrevBtn");
    const nextBtn = document.getElementById("flashcardNextBtn");
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex === cards.length - 1;
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
    if (!currentFlashcardSet || currentCardIndex >= currentFlashcardSet.flashcards.length - 1) return;
    currentCardIndex++;
    isCardFlipped = false;
    renderCurrentCard();
}

function initFlashcardControls() {
    const stage = document.getElementById("flashcardStage");
    const flipBtn = document.getElementById("flashcardFlipBtn");
    const prevBtn = document.getElementById("flashcardPrevBtn");
    const nextBtn = document.getElementById("flashcardNextBtn");

    if (stage) {
        stage.addEventListener("click", flipCurrentCard);
        stage.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                flipCurrentCard();
            }
        });
    }
    if (flipBtn) flipBtn.addEventListener("click", flipCurrentCard);
    if (prevBtn) prevBtn.addEventListener("click", goToPreviousCard);
    if (nextBtn) nextBtn.addEventListener("click", goToNextCard);

    document.addEventListener("keydown", (e) => {
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
