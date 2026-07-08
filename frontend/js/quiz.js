// quiz.js – FE2: Quiz Set Detail Page (Step 14)
// Displays a generated multiple-choice quiz set.
// Data comes from getQuizSet(setId) — js/ai-learning-api.js.
// Rule: never reveal the correct option before the user picks an answer.

let currentQuizSet = null;
let currentQuestionIndex = 0;
let userAnswers = {}; // { [questionId]: optionKey }

document.addEventListener("DOMContentLoaded", async () => {
    const isAuthenticated = window.authReady ? await window.authReady : false;
    if (!isAuthenticated) return; // layout.js already redirects to login.html

    const params = new URLSearchParams(window.location.search);
    const setId = params.get("setId");

    if (!setId) {
        showQuizError("No quiz set ID provided. Please open this page from a document.");
        return;
    }

    await loadQuizSet(setId);
    initQuizControls();
});

async function loadQuizSet(setId) {
    const loader = document.getElementById("quizLoader");
    const viewer = document.getElementById("quizViewer");

    try {
        const res = await getQuizSet(setId);
        currentQuizSet = res.data;

        if (!currentQuizSet || !Array.isArray(currentQuizSet.questions) || currentQuizSet.questions.length === 0) {
            throw new Error("This quiz set has no questions.");
        }

        document.getElementById("quizSetTitle").textContent = currentQuizSet.title || "Quiz";
        document.getElementById("quizSetMeta").textContent =
            `${currentQuizSet.questionCount || currentQuizSet.questions.length} questions · Generated ${formatGeneratedAt(currentQuizSet.createdAt)}`;

        const backLink = document.getElementById("quizBackLink");
        if (backLink && currentQuizSet.documentId) {
            backLink.href = `document-detail.html?id=${currentQuizSet.documentId}`;
        }

        currentQuestionIndex = 0;
        userAnswers = {};
        renderCurrentQuestion();

        loader.style.display = "none";
        viewer.style.display = "block";
    } catch (err) {
        console.error("Failed to load quiz set", err);
        loader.style.display = "none";
        showQuizError(
            typeof mapAiLearningError === "function" ? mapAiLearningError(err) : (err.message || "Failed to load quiz set.")
        );
    }
}

function renderCurrentQuestion() {
    if (!currentQuizSet) return;
    const questions = currentQuizSet.questions;
    const question = questions[currentQuestionIndex];

    document.getElementById("quizProgress").textContent =
        `Question ${currentQuestionIndex + 1} / ${questions.length}`;
    document.getElementById("quizQuestionText").textContent = question.questionText || "";

    const difficultyBadge = document.getElementById("quizDifficultyBadge");
    if (difficultyBadge) {
        const difficulty = question.difficulty || "";
        difficultyBadge.textContent = typeof formatDifficulty === "function" ? formatDifficulty(difficulty) : difficulty;
        difficultyBadge.className = "status-badge quiz-difficulty-badge " + difficulty.toLowerCase();
        difficultyBadge.style.display = difficulty ? "inline-flex" : "none";
    }

    const selectedOption = userAnswers[question.questionId];
    renderOptions(question, selectedOption);
    renderFeedback(question, selectedOption);

    const prevBtn = document.getElementById("quizPrevBtn");
    const nextBtn = document.getElementById("quizNextBtn");
    if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
    if (nextBtn) {
        nextBtn.textContent = currentQuestionIndex === questions.length - 1 ? "Finish" : "Next →";
    }

    document.getElementById("quizSummary").style.display = "none";
    document.getElementById("quizViewer").style.display = "block";
}

// Renders the 4 MCQ options. Before the user answers: plain selectable list,
// no correctness shown. After the user answers: locks selection, highlights
// correct/incorrect (handled in renderFeedback via CSS classes here).
function renderOptions(question, selectedOption) {
    const list = document.getElementById("quizOptionsList");
    list.innerHTML = "";

    (question.options || []).forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option-btn";
        btn.dataset.optionKey = opt.optionKey;

        const keySpan = document.createElement("span");
        keySpan.className = "quiz-option-key";
        keySpan.textContent = opt.optionKey;

        const textSpan = document.createElement("span");
        textSpan.className = "quiz-option-text";
        textSpan.textContent = opt.optionText;

        btn.appendChild(keySpan);
        btn.appendChild(textSpan);

        if (selectedOption) {
            // Already answered this question: lock it and reveal correctness.
            btn.disabled = true;
            if (opt.optionKey === question.correctOption) {
                btn.classList.add("correct");
            } else if (opt.optionKey === selectedOption) {
                btn.classList.add("incorrect");
            }
        } else {
            btn.addEventListener("click", () => handleSelectOption(question, opt.optionKey));
        }

        list.appendChild(btn);
    });
}

function renderFeedback(question, selectedOption) {
    const feedback = document.getElementById("quizFeedback");
    if (!feedback) return;

    if (!selectedOption) {
        feedback.style.display = "none";
        feedback.textContent = "";
        return;
    }

    const isCorrect = selectedOption === question.correctOption;
    feedback.className = "quiz-feedback " + (isCorrect ? "correct" : "incorrect");
    feedback.textContent = isCorrect
        ? `Correct! ${question.explanation || ""}`
        : `Not quite. The correct answer is ${question.correctOption}. ${question.explanation || ""}`;
    feedback.style.display = "block";
}

function handleSelectOption(question, optionKey) {
    // Once answered, the choice is locked — re-clicking options after this does nothing
    // because renderOptions() disables all buttons on the next render.
    userAnswers[question.questionId] = optionKey;
    renderOptions(question, optionKey);
    renderFeedback(question, optionKey);
}

function goToPreviousQuestion() {
    if (currentQuestionIndex <= 0) return;
    currentQuestionIndex--;
    renderCurrentQuestion();
}

function goToNextQuestion() {
    const questions = currentQuizSet.questions;
    if (currentQuestionIndex >= questions.length - 1) {
        showQuizSummary();
        return;
    }
    currentQuestionIndex++;
    renderCurrentQuestion();
}

function showQuizSummary() {
    const questions = currentQuizSet.questions;
    const answeredCount = Object.keys(userAnswers).length;
    const correctCount = questions.filter(q => userAnswers[q.questionId] === q.correctOption).length;

    document.getElementById("quizSummaryText").textContent =
        answeredCount === questions.length
            ? `You answered ${correctCount} / ${questions.length} correctly.`
            : `You answered ${answeredCount} / ${questions.length} questions (${correctCount} correct so far).`;

    document.getElementById("quizViewer").style.display = "none";
    document.getElementById("quizSummary").style.display = "block";
}

function initQuizControls() {
    const prevBtn = document.getElementById("quizPrevBtn");
    const nextBtn = document.getElementById("quizNextBtn");
    const retakeBtn = document.getElementById("quizRetakeBtn");

    if (prevBtn) prevBtn.addEventListener("click", goToPreviousQuestion);
    if (nextBtn) nextBtn.addEventListener("click", goToNextQuestion);
    if (retakeBtn) {
        retakeBtn.addEventListener("click", () => {
            currentQuestionIndex = 0;
            renderCurrentQuestion();
        });
    }
}

function showQuizError(message) {
    const errorState = document.getElementById("quizErrorState");
    if (errorState) {
        errorState.textContent = message;
        errorState.style.display = "block";
    }
}