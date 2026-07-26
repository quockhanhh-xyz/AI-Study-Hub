// quiz.js – FE2: Quiz Set Detail Page (Step A: Learning UX)
// Displays a generated multiple-choice quiz set.
// Data comes from getQuizSet(setId) — js/ai-learning-api.js.
// Rule: never reveal the correct option before the user picks an answer.
// Rule: the FINAL score always comes from the backend submit-attempt response,
// never from a client-side count — the FE only sends { startedAt, completedAt, answers }.

let currentQuizSet = null;
let currentSetId = null;
let currentQuestionIndex = 0;
let userAnswers = {}; // { [questionId]: optionKey }
let quizStartedAt = null;
let isReviewMode = false;
let isSubmitting = false;
let lastAttemptResult = null; // { attemptId, score, totalQuestions, correctCount, percentage, completedAt }

document.addEventListener("DOMContentLoaded", async () => {
    const isAuthenticated = window.authReady ? await window.authReady : false;
    if (!isAuthenticated) return; // layout.js already redirects to login.html

    const params = new URLSearchParams(window.location.search);
    const setId = params.get("setId");

    if (!setId) {
        showQuizError("No quiz set ID provided. Please open this page from a document.");
        return;
    }

    currentSetId = setId;
    await loadQuizSet(setId);
    initQuizControls();
});

async function loadQuizSet(setId) {
    const loader = document.getElementById("quizLoader");
    const viewer = document.getElementById("quizViewer");

    try {
        const res = await AiLearningAPI.getQuizSet(setId);
        currentQuizSet = res.data;

        if (!currentQuizSet || !Array.isArray(currentQuizSet.questions) || currentQuizSet.questions.length === 0) {
            throw new Error("This quiz set has no questions.");
        }

        document.getElementById("quizSetTitle").textContent = currentQuizSet.title || "Quiz";
        document.getElementById("quizRetakeBtn")?.addEventListener("click", (e) => {
            e.preventDefault();
            startNewAttempt();
        });

        document.getElementById("quizSummaryBackLink")?.addEventListener("click", (e) => {
            e.preventDefault();
            const backUrl = currentQuizSet.documentId 
                ? `document-detail.html?id=${currentQuizSet.documentId}&tab=tools` 
                : "documents.html";
            window.location.href = backUrl;
        });

        document.getElementById("quizSetMeta").textContent =
            `${currentQuizSet.questionCount || currentQuizSet.questions.length} questions · Generated ${formatGeneratedAt(currentQuizSet.createdAt)}`;

        const backUrl = currentQuizSet.documentId 
            ? `document-detail.html?id=${currentQuizSet.documentId}&tab=tools` 
            : "documents.html";
            
        const backLink = document.getElementById("quizBackLink");
        if (backLink) {
            backLink.href = backUrl;
            backLink.onclick = (e) => {
                e.preventDefault();
                if (document.referrer && document.referrer.includes("document-detail.html")) {
                    window.history.back();
                } else {
                    window.location.replace(backUrl);
                }
            };
        }

        startNewAttempt();

        // Attempt history is a nice-to-have — load it in the background and
        // fail silently if the endpoint isn't available yet.
        loadAttemptHistory();

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

// Resets state for a fresh attempt (initial load AND every "Retry quiz").
function startNewAttempt() {
    currentQuestionIndex = 0;
    userAnswers = {};
    quizStartedAt = new Date();
    const backLink = document.getElementById("quizBackLink");
    if (backLink) backLink.style.display = "inline-block";
    isReviewMode = false;

    document.getElementById("quizSummary").style.display = "none";
    document.getElementById("quizViewer").style.display = "block";
    renderCurrentQuestion();
}

function renderCurrentQuestion() {
    if (!currentQuizSet) return;
    const questions = currentQuizSet.questions;
    const question = questions[currentQuestionIndex];

    const reviewBanner = document.getElementById("quizReviewBanner");
    if (reviewBanner) reviewBanner.style.display = isReviewMode ? "flex" : "none";

    const progressText = document.getElementById("quizProgressText");
    if (progressText) {
        progressText.textContent = `Question ${currentQuestionIndex + 1} / ${questions.length}`;
    }
    
    const progressBar = document.getElementById("quizProgressBar");
    if (progressBar) {
        progressBar.max = questions.length;
        progressBar.value = currentQuestionIndex + 1;
    }

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
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const skipHint = document.getElementById("quizSkipHint");

    if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
    if (nextBtn) {
        if (isReviewMode) {
            nextBtn.textContent = "Next →";
            nextBtn.disabled = isLastQuestion;
            if (skipHint) skipHint.style.display = "none";
        } else {
            if (selectedOption) {
                nextBtn.textContent = isLastQuestion ? "Finish" : "Next →";
                if (skipHint) skipHint.style.display = "none";
            } else {
                nextBtn.textContent = isLastQuestion ? "Skip & Finish" : "Skip question →";
                if (skipHint) skipHint.style.display = "block";
            }
            nextBtn.disabled = false;
        }
    }

    document.getElementById("quizSummary").style.display = "none";
    document.getElementById("quizViewer").style.display = "block";
}

// Renders the 4 MCQ options. Before the user answers: plain selectable list,
// no correctness shown. After the user answers: locks selection, highlights
// correct/incorrect. In review mode every question is already answered, so
// this naturally renders as a locked, graded view.
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
            btn.disabled = true;
            if (opt.optionKey === selectedOption) {
                btn.classList.add("selected");
            }
            if (opt.optionKey === question.correctOption) {
                btn.classList.add("correct");
            } else if (opt.optionKey === selectedOption) {
                btn.classList.add("incorrect");
            } else {
                btn.classList.add("muted");
            }
        } else if (!isReviewMode) {
            btn.addEventListener("click", () => handleSelectOption(question, opt.optionKey));
        } else {
            btn.disabled = true;
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
    
    let html = `<strong>${isCorrect ? 'Correct!' : 'Not quite.'}</strong><br><br>`;
    if (!isCorrect) {
        html += `<strong>Your answer:</strong> ${selectedOption}<br>`;
    }
    html += `<strong>Correct answer:</strong> ${question.correctOption}<br><br>`;
    html += `<strong>Explanation:</strong> ${question.explanation || ""}`;
    
    feedback.innerHTML = html;
    feedback.style.display = "block";
}

function handleSelectOption(question, optionKey) {
    if (isReviewMode) return; // answers are locked while reviewing
    userAnswers[question.questionId] = optionKey;
    renderOptions(question, optionKey);
    renderFeedback(question, optionKey);
    
    // Update next button from "Skip" to normal since an answer was selected
    const nextBtn = document.getElementById("quizNextBtn");
    const skipHint = document.getElementById("quizSkipHint");
    const isLastQuestion = currentQuestionIndex === currentQuizSet.questions.length - 1;
    
    if (nextBtn) {
        nextBtn.textContent = isLastQuestion ? "Finish" : "Next →";
    }
    if (skipHint) {
        skipHint.style.display = "none";
    }
}

function goToPreviousQuestion() {
    if (currentQuestionIndex <= 0) return;
    currentQuestionIndex--;
    renderCurrentQuestion();
}

function goToNextQuestion() {
    const questions = currentQuizSet.questions;
    const isLastQuestion = currentQuestionIndex >= questions.length - 1;

    if (isReviewMode) {
        if (!isLastQuestion) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        }
        return;
    }

    if (isLastQuestion) {
        finishQuiz();
        return;
    }

    currentQuestionIndex++;
    renderCurrentQuestion();
}

// Submits the attempt to the backend. The backend is the single source of
// truth for score/correctCount/percentage — we never compute or show our own.
async function finishQuiz() {
    if (isSubmitting) return;
    isSubmitting = true;

    document.getElementById("quizViewer").style.display = "none";
    document.getElementById("quizSummary").style.display = "block";
    const backLink = document.getElementById("quizBackLink");
    if (backLink) backLink.style.display = "none";
    
    document.getElementById("quizSummaryResult").style.display = "none";
    document.getElementById("quizSummaryError").style.display = "none";
    document.getElementById("quizSummarySubmitting").style.display = "block";

    const answers = Object.entries(userAnswers).map(([questionId, selectedOption]) => ({
        questionId: Number(questionId),
        selectedOption
    }));

    try {
        const res = await AiLearningAPI.submitQuizAttempt(currentSetId, {
            startedAt: quizStartedAt.toISOString(),
            completedAt: new Date().toISOString(),
            answers
        });
        lastAttemptResult = res.data;
        renderQuizResult();
        loadAttemptHistory(); // refresh history with the just-submitted attempt
    } catch (err) {
        console.error("Failed to submit quiz attempt", err);
        document.getElementById("quizSummarySubmitting").style.display = "none";
        const errorEl = document.getElementById("quizSummaryError");
        errorEl.textContent =
            (typeof mapAiLearningError === "function" ? mapAiLearningError(err) : (err.message || "Failed to submit your quiz attempt."))
            + " Your answers weren't lost — you can try submitting again.";
        errorEl.style.display = "block";
    } finally {
        isSubmitting = false;
    }
}

function renderQuizResult() {
    if (!lastAttemptResult) return;

    document.getElementById("quizSummarySubmitting").style.display = "none";
    document.getElementById("quizSummaryError").style.display = "none";
    document.getElementById("quizSummaryResult").style.display = "block";

    const { correctCount, totalQuestions, percentage } = lastAttemptResult;
    const answeredCount = Object.keys(userAnswers).length;
    const incorrectCount = answeredCount - correctCount;
    const skippedCount = totalQuestions - answeredCount;

    const scoreEl = document.getElementById("quizStatScore");
    if (scoreEl) scoreEl.textContent = `${Math.round(percentage * 10) / 10}%`;

    const correctEl = document.getElementById("quizStatCorrect");
    if (correctEl) correctEl.textContent = correctCount;

    const incorrectEl = document.getElementById("quizStatIncorrect");
    if (incorrectEl) incorrectEl.textContent = incorrectCount;

    const skippedEl = document.getElementById("quizStatSkipped");
    if (skippedEl) skippedEl.textContent = skippedCount;

    const statsGrid = document.querySelector(".quiz-summary-stats");
    if (statsGrid) {
        renderQuizProgressFeedback(lastAttemptResult, "quizSummaryProgress", statsGrid);
    }
}

function renderQuizProgressFeedback(data, containerId, parentEl) {
    if (!data || !data.progressStatus || !parentEl) return;

    let existing = document.getElementById(containerId);
    if (existing) existing.remove();

    const progressDiv = document.createElement("div");
    progressDiv.id = containerId;
    progressDiv.style.marginTop = "10px";
    progressDiv.style.display = "flex";
    progressDiv.style.alignItems = "center";
    progressDiv.style.justifyContent = "center";
    progressDiv.style.gap = "6px";
    
    let icon = "";
    let text = "";
    
    switch (data.progressStatus) {
        case "IMPROVED":
            progressDiv.className = "progress-improved";
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="18" width="18"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M9.5 3.5h4v4" stroke-width="1.5"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M13.5 3.5 7.85 9.15c-0.09346 0.09161 -0.21912 0.14293 -0.35 0.14293 -0.13088 0 -0.25654 -0.05132 -0.35 -0.14293l-2.3 -2.3c-0.09346 -0.09161 -0.21912 -0.14293 -0.35 -0.14293 -0.13088 0 -0.25654 0.05132 -0.35 0.14293L0.5 10.5" stroke-width="1.5"></path></svg>`;
            text = `Great! You improved by ${data.progressPercentage}% compared to the last time.`;
            break;
        case "REGRESSED":
            progressDiv.className = "progress-regressed";
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="18" width="18" style="transform: scaleY(-1);"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M9.5 3.5h4v4" stroke-width="1.5"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M13.5 3.5 7.85 9.15c-0.09346 0.09161 -0.21912 0.14293 -0.35 0.14293 -0.13088 0 -0.25654 -0.05132 -0.35 -0.14293l-2.3 -2.3c-0.09346 -0.09161 -0.21912 -0.14293 -0.35 -0.14293 -0.13088 0 -0.25654 0.05132 -0.35 0.14293L0.5 10.5" stroke-width="1.5"></path></svg>`;
            text = `Don't give up! You regressed by ${data.progressPercentage}% compared to the last time. Keep trying!`;
            break;
        case "SAME":
            progressDiv.className = "progress-same";
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" /></svg>`;
            text = `You are maintaining your performance! Try to break through next time.`;
            break;
        case "FIRST_ATTEMPT":
            progressDiv.className = "progress-first-attempt";
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>`;
            text = `Congratulations on completing your first quiz!`;
            break;
        default:
            return;
    }

    progressDiv.innerHTML = `${icon} <span>${text}</span>`;
    parentEl.insertAdjacentElement("afterend", progressDiv);
}

function startReview() {
    if (!lastAttemptResult) return;
    isReviewMode = true;
    currentQuestionIndex = 0;
    document.getElementById("quizSummary").style.display = "none";
    document.getElementById("quizViewer").style.display = "block";
    const backLink = document.getElementById("quizBackLink");
    if (backLink) backLink.style.display = "inline-block";
    renderCurrentQuestion();
}

function backToSummaryFromReview() {
    isReviewMode = false;
    document.getElementById("quizViewer").style.display = "none";
    document.getElementById("quizSummary").style.display = "block";
    const backLink = document.getElementById("quizBackLink");
    if (backLink) backLink.style.display = "none";
    renderQuizResult();
}

function retryQuiz() {
    startNewAttempt();
}

// Attempt history is optional / best-effort: if the endpoint isn't available
// yet (BE3 still in progress) or returns an error, just hide the section.
async function loadAttemptHistory() {
    const section = document.getElementById("quizHistorySection");
    const list = document.getElementById("quizHistoryList");
    if (!section || !list) return;

    try {
        const res = await AiLearningAPI.getQuizAttemptHistory(currentSetId);
        const attempts = Array.isArray(res.data) ? res.data : [];

        if (attempts.length === 0) {
            section.style.display = "none";
            return;
        }

        const sorted = [...attempts].sort(
            (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
        );

        list.innerHTML = "";
        sorted.forEach(attempt => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.flexDirection = "column";
            li.style.gap = "4px";
            li.style.padding = "8px 0";
            li.style.borderBottom = "1px solid var(--border)";

            const scoreSpan = document.createElement("span");
            scoreSpan.className = "quiz-history-score";
            scoreSpan.textContent = `${Math.round(attempt.percentage * 10) / 10}% · ${attempt.correctCount}/${attempt.totalQuestions} correct · ${formatGeneratedAt(attempt.completedAt)}`;

            li.appendChild(scoreSpan);
            
            if (attempt.progressStatus && attempt.progressStatus !== "FIRST_ATTEMPT") {
                const prog = document.createElement("div");
                prog.style.fontSize = "12px";
                prog.style.fontWeight = "600";
                prog.style.display = "flex";
                prog.style.alignItems = "center";
                prog.style.gap = "4px";

                if (attempt.progressStatus === "IMPROVED") {
                    prog.style.color = "#059669";
                    prog.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="14" width="14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M9.5 3.5h4v4" stroke-width="1.5"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M13.5 3.5 7.85 9.15c-0.09346 0.09161 -0.21912 0.14293 -0.35 0.14293 -0.13088 0 -0.25654 -0.05132 -0.35 -0.14293l-2.3 -2.3c-0.09346 -0.09161 -0.21912 -0.14293 -0.35 -0.14293 -0.13088 0 -0.25654 0.05132 -0.35 0.14293L0.5 10.5" stroke-width="1.5"></path></svg> ${attempt.progressPercentage}%`;
                } else if (attempt.progressStatus === "REGRESSED") {
                    prog.style.color = "#dc2626";
                    prog.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="14" width="14" style="transform: scaleY(-1);"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M9.5 3.5h4v4" stroke-width="1.5"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M13.5 3.5 7.85 9.15c-0.09346 0.09161 -0.21912 0.14293 -0.35 0.14293 -0.13088 0 -0.25654 -0.05132 -0.35 -0.14293l-2.3 -2.3c-0.09346 -0.09161 -0.21912 -0.14293 -0.35 -0.14293 -0.13088 0 -0.25654 0.05132 -0.35 0.14293L0.5 10.5" stroke-width="1.5"></path></svg> ${attempt.progressPercentage}%`;
                } else if (attempt.progressStatus === "SAME") {
                    prog.style.color = "var(--muted)";
                    prog.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" /></svg> No change`;
                }
                
                li.appendChild(prog);
            }
            
            list.appendChild(li);
        });

        section.style.display = "block";
    } catch (err) {
        // Silent — history is a bonus feature, not required for Step A demo.
        section.style.display = "none";
    }
}

function initQuizControls() {
    const prevBtn = document.getElementById("quizPrevBtn");
    const nextBtn = document.getElementById("quizNextBtn");
    const retakeBtn = document.getElementById("quizRetakeBtn");
    const reviewBtn = document.getElementById("quizReviewAnswersBtn");
    const backToSummaryBtn = document.getElementById("quizBackToSummaryBtn");

    if (prevBtn) prevBtn.addEventListener("click", goToPreviousQuestion);
    if (nextBtn) nextBtn.addEventListener("click", goToNextQuestion);
    if (retakeBtn) retakeBtn.addEventListener("click", retryQuiz);
    if (reviewBtn) reviewBtn.addEventListener("click", startReview);
    if (backToSummaryBtn) backToSummaryBtn.addEventListener("click", backToSummaryFromReview);
}

function showQuizError(message) {
    const errorState = document.getElementById("quizErrorState");
    if (errorState) {
        errorState.textContent = message;
        errorState.style.display = "block";
    }
}