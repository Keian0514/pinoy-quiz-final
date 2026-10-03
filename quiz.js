"use strict";

const requestedCategory = new URLSearchParams(window.location.search)
    .get("category")
    ?.trim()
    .toUpperCase();
const currentCategory = Object.hasOwn(quizData, requestedCategory) ? requestedCategory : "HISTORY";
const categoryStyles = {
    HISTORY: { tint: "#FBE9E4", border: "#DD6B55" },
    GEOGRAPHY: { tint: "#E5F0F4", border: "#174A66" },
    "MUSIC/ARTS": { tint: "#FBE4F0", border: "#4C8B77" },
    "SOCIAL CULTURE": { tint: "#E5F0EB", border: "#4C8B77" },
    FOOD: { tint: "#FFF2D5", border: "#F4B942" },
    "LOGO QUIZ": { tint: "#E8F0F3", border: "#10384F" }
};
const currentCategoryStyle = categoryStyles[currentCategory];
document.body.style.backgroundColor = currentCategoryStyle.tint;
const levels = Object.keys(quizData[currentCategory]);
const passingScore = 18;
let activeAnswerSound = null;
let hasTriggeredWinEffect = false;

function shuffleArray(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }

    return items;
}

function playAudio(file, fallbackFile = null) {
    if (localStorage.getItem("sfxEnabled") !== "true") return;

    window.clickSound?.pause();
    if (window.clickSound) window.clickSound.currentTime = 0;

    activeAnswerSound?.pause();
    activeAnswerSound = new Audio(file);
    activeAnswerSound.preload = "auto";
    activeAnswerSound.volume = 1;
    console.log(file);

    const playback = activeAnswerSound.play();
    if (!playback || typeof playback.then !== "function") return Promise.resolve(true);

    return playback.then(() => true).catch((error) => {
        console.error(`Audio failed to play: ${file}`, error);
        return fallbackFile && fallbackFile !== file
            ? playAudio(fallbackFile)
            : false;
    });
}

function playAnswerFeedback(isCorrect) {
    if (localStorage.getItem("sfxEnabled") !== "true") return;

    playAudio(`assets/music/${isCorrect ? "correct" : "wrong"}.mp3`);

    if (typeof navigator.vibrate === "function") {
        navigator.vibrate(isCorrect ? 80 : [70, 40, 90]);
    }
}

function playFinalOutcomeSound(isPassing) {
    playAudio(`assets/music/${isPassing ? "confetti" : "sad"}.mp3`, isPassing ? "assets/music/correct.mp3" : "assets/music/wrong.mp3");
}

function createShuffledQuizData() {
    return Object.fromEntries(levels.map((level) => [
        level,
        shuffleArray(quizData[currentCategory][level].map((question) => {
            const options = question.options.map((text, index) => ({
                text,
                isCorrect: index === question.answer
            }));
            shuffleArray(options);

            return {
                ...question,
                options: options.map((option) => option.text),
                answer: options.findIndex((option) => option.isCorrect)
            };
        }))
    ]));
}

let activeQuizData = createShuffledQuizData();
let currentLevel = "Easy";
let currentLevelIndex = 0;
let currentQuestionIndex = 0;
let currentScore = 0;
let totalScore = 0;
let hasAnswered = false;
let autoAdvanceTimeout = null;

const categoryTranslationKeys = {
    HISTORY: "history",
    GEOGRAPHY: "geography",
    "MUSIC/ARTS": "musicArts",
    "SOCIAL CULTURE": "socialCulture",
    FOOD: "food",
    "LOGO QUIZ": "logoQuiz"
};

const levelNumber = document.querySelector("#level-number");
const selectedCategoryLabel = document.querySelector("#selected-category");
const totalScoreLabel = document.querySelector("#total-score");
const questionLabel = document.querySelector("#question-label");
const levelScoreLabel = document.querySelector("#level-score");
const progressFill = document.querySelector("#progress-fill");
const questionCard = document.querySelector("#question-card");
questionCard.style.backgroundColor = currentCategoryStyle.tint;
questionCard.style.borderTop = `3px solid ${currentCategoryStyle.border}`;
const questionImage = document.querySelector("#question-image");
const questionText = document.querySelector("#question-text");
const optionsList = document.querySelector("#options-list");
const answerFeedback = document.querySelector("#answer-feedback");
const nextButton = document.querySelector("#next-button");
const levelModal = document.querySelector("#level-modal");
const modalEyebrow = document.querySelector("#modal-eyebrow");
const modalTitle = document.querySelector("#modal-title");
const modalScore = document.querySelector("#modal-score");
const modalTotal = document.querySelector("#modal-total");
const modalMessage = document.querySelector("#modal-message");
const modalAction = document.querySelector("#modal-action");
const scoreNameField = document.querySelector("#score-name-field");
const scoreNameInput = document.querySelector("#score-name");
const scoreSaveStatus = document.querySelector("#score-save-status");
const gameOverActions = document.querySelector("#game-over-actions");
const restartButton = document.querySelector("#restart-button");
const retryButton = document.querySelector("#retry-button");

function renderQuestion() {
    const questions = activeQuizData[currentLevel];
    const question = questions[currentQuestionIndex];

    selectedCategoryLabel.textContent = t(categoryTranslationKeys[currentCategory]);
    levelNumber.textContent = String(currentLevelIndex + 1);
    questionLabel.textContent = t("questionProgress", {
        current: currentQuestionIndex + 1,
        total: questions.length
    });
    levelScoreLabel.textContent = t("correctCount", { count: currentScore });
    totalScoreLabel.textContent = String(totalScore);
    progressFill.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
    questionText.textContent = question.question;
    questionImage.hidden = !question.image;
    if (question.image) {
        questionImage.src = question.image;
        questionImage.onerror = () => {
            questionImage.hidden = true;
        };
    } else {
        questionImage.removeAttribute("src");
        questionImage.onerror = null;
    }
    answerFeedback.textContent = "";
    answerFeedback.className = "answer-feedback";
    nextButton.disabled = true;
    hasAnswered = false;

    optionsList.replaceChildren();
    question.options.forEach((option, optionIndex) => {
        const optionButton = document.createElement("button");
        const key = document.createElement("span");
        const label = document.createElement("span");

        optionButton.type = "button";
        optionButton.className = "option-button quiz-option";
        optionButton.setAttribute("aria-pressed", "false");
        key.className = "option-key";
        key.setAttribute("aria-hidden", "true");
        key.textContent = String.fromCharCode(65 + optionIndex);
        label.textContent = option;
        optionButton.append(key, label);
        optionButton.addEventListener("click", () => selectAnswer(optionIndex, optionButton));
        optionsList.append(optionButton);
    });

    questionCard.classList.remove("question-enter");
    void questionCard.offsetWidth;
    questionCard.classList.add("question-enter");
}

function selectAnswer(selectedIndex, selectedButton) {
    if (hasAnswered) return;

    hasAnswered = true;
    const question = activeQuizData[currentLevel][currentQuestionIndex];
    const optionButtons = [...optionsList.querySelectorAll(".option-button")];
    const isCorrect = selectedIndex === question.answer;
    const isFinalQuestion = currentLevelIndex === levels.length - 1 &&
        currentQuestionIndex === activeQuizData[currentLevel].length - 1;

    optionButtons.forEach((button, index) => {
        button.disabled = true;
        if (index === selectedIndex) {
            button.setAttribute("aria-pressed", "true");
        }
        if (index === question.answer) {
            button.classList.add("is-correct");
        }
    });

    if (isCorrect) {
        selectedButton.classList.add("correct-pop");
        window.setTimeout(() => selectedButton.classList.remove("correct-pop"), 500);
        currentScore += 1;
        totalScore += 1;
        if (isFinalQuestion && totalScore >= passingScore) {
            playAudio("assets/music/confetti.mp3", "assets/music/correct.mp3");
            triggerWinEffect();
        } else {
            playAnswerFeedback(true);
        }
        answerFeedback.textContent = t("correctFeedback");
        answerFeedback.classList.add("is-correct");
    } else {
        selectedButton.classList.add("shake");
        window.setTimeout(() => selectedButton.classList.remove("shake"), 500);
        playAnswerFeedback(false);
        selectedButton.classList.add("is-incorrect");
        answerFeedback.textContent = t("incorrectFeedback", { answer: question.options[question.answer] });
        answerFeedback.classList.add("is-incorrect");
    }

    levelScoreLabel.textContent = t("correctCount", { count: currentScore });
    totalScoreLabel.textContent = String(totalScore);
    nextButton.disabled = false;
}

function triggerWinEffect() {
    if (hasTriggeredWinEffect) return;
    hasTriggeredWinEffect = true;

    window.setTimeout(() => {
        if (typeof window.confetti !== "function") return;

        const colors = ["#10384F", "#F4B942", "#DD6B55", "#4C8B77"];
        window.confetti({ particleCount: 110, spread: 76, origin: { y: 0.65 }, colors, zIndex: 9999 });
        window.setTimeout(() => {
            window.confetti({ particleCount: 70, spread: 110, origin: { y: 0.65 }, colors, zIndex: 9999 });
        }, 220);
    }, 200);
}

function showLevelSummary() {
    const isFinalLevel = currentLevelIndex === levels.length - 1;
    const nextLevel = levels[currentLevelIndex + 1];
    const levelQuestionCount = activeQuizData[currentLevel].length;
    const categoryQuestionCount = levels.reduce(
        (count, level) => count + activeQuizData[level].length,
        0
    );
    const isPassing = totalScore >= passingScore;

    if (isFinalLevel && isPassing && !hasTriggeredWinEffect) {
        playAudio("assets/music/confetti.mp3", "assets/music/correct.mp3");
        triggerWinEffect();
    }

    document.body.classList.toggle("quiz-fail-state", isFinalLevel && !isPassing);
    document.documentElement.classList.toggle("quiz-fail-state", isFinalLevel && !isPassing);

    const translatedLevel = t(currentLevel.toLowerCase());
    const translatedCategory = t(categoryTranslationKeys[currentCategory]);

    modalEyebrow.textContent = t(isFinalLevel ? "quizComplete" : "levelComplete");
    modalTitle.textContent = t(isFinalLevel
        ? (isPassing ? "winMessage" : "tryAgainMessage")
        : "levelUp");
    modalScore.textContent = t("levelScore", {
        level: translatedLevel,
        score: currentScore,
        total: levelQuestionCount
    });
    modalTotal.textContent = t("categoryScore", {
        category: translatedCategory,
        score: totalScore,
        total: categoryQuestionCount
    });
    modalMessage.textContent = isFinalLevel
        ? ""
        : t("movingToLevel", { level: t(nextLevel.toLowerCase()) });
    modalMessage.hidden = isFinalLevel;
    scoreNameField.hidden = !isFinalLevel;
    gameOverActions.hidden = !isFinalLevel;
    retryButton.hidden = !isFinalLevel || isPassing;
    scoreSaveStatus.textContent = "";
    modalAction.dataset.action = isFinalLevel ? "save-score" : "continue";
    modalAction.textContent = isFinalLevel
        ? t("saveScore")
        : t("continueToLevel", { level: t(nextLevel.toLowerCase()) });
    if (isFinalLevel) {
        scoreNameInput.value = localStorage.getItem("pinoyQuizPlayerName") || "";
    }
    levelModal.showModal();

    if (isFinalLevel && !isPassing) playFinalOutcomeSound(false);

    if (!isFinalLevel) {
        autoAdvanceTimeout = window.setTimeout(advanceFromModal, 2400);
    }
}

function advanceFromModal() {
    window.clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = null;
    levelModal.close();

    if (currentLevelIndex === levels.length - 1) {
        currentLevelIndex = 0;
        totalScore = 0;
        activeQuizData = createShuffledQuizData();
    } else {
        currentLevelIndex += 1;
    }

    currentLevel = levels[currentLevelIndex];
    currentQuestionIndex = 0;
    currentScore = 0;
    renderQuestion();
}

function saveFinalScore() {
    if (modalAction.disabled) return;

    const name = scoreNameInput.value.trim() || "Kabayan";

    try {
        const savedScores = JSON.parse(localStorage.getItem("pinoyQuizScores") || "[]");
        const scores = Array.isArray(savedScores)
            ? savedScores
                .filter((entry) =>
                    entry &&
                    typeof entry.name === "string" &&
                    entry.name.trim() &&
                    Number.isFinite(Number(entry.score))
                )
                .map((entry) => ({ ...entry, name: entry.name.trim(), score: Number(entry.score) }))
            : [];
        const newScore = {
            name,
            score: totalScore,
            category: currentCategory,
            date: new Date().toISOString()
        };
        scores.push(newScore);
        scores.sort((first, second) => second.score - first.score);
        const topScores = scores.slice(0, 10);

        localStorage.setItem("pinoyQuizScores", JSON.stringify(topScores));
        localStorage.setItem("pinoyQuizPlayerName", name);
        scoreSaveStatus.textContent = t(topScores.includes(newScore) ? "scoreSaved" : "scoreOutsideTopTen");
        modalAction.disabled = true;
    } catch {
        scoreSaveStatus.textContent = t("scoreSaveFailure");
    }
}

function restartCurrentGame() {
    window.clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = null;
    levelModal.close();
    currentLevelIndex = 0;
    currentLevel = levels[0];
    currentQuestionIndex = 0;
    currentScore = 0;
    totalScore = 0;
    hasAnswered = false;
    hasTriggeredWinEffect = false;
    document.body.classList.remove("quiz-fail-state");
    document.documentElement.classList.remove("quiz-fail-state");
    activeQuizData = createShuffledQuizData();
    modalAction.disabled = false;
    renderQuestion();
}

nextButton.addEventListener("click", () => {
    if (!hasAnswered) return;

    if (currentQuestionIndex < activeQuizData[currentLevel].length - 1) {
        currentQuestionIndex += 1;
        renderQuestion();
    } else {
        if (currentLevelIndex === levels.length - 1) {
            nextButton.classList.add("suppress-click-sound");
            window.setTimeout(() => nextButton.classList.remove("suppress-click-sound"), 0);
        }
        showLevelSummary();
    }
});

modalAction.addEventListener("click", () => {
    if (modalAction.dataset.action === "save-score") {
        saveFinalScore();
        return;
    }

    advanceFromModal();
});
restartButton.addEventListener("click", restartCurrentGame);
retryButton.addEventListener("click", restartCurrentGame);
levelModal.addEventListener("cancel", (event) => event.preventDefault());

renderQuestion();