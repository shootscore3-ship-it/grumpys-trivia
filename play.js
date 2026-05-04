const GAME_ID = "main";
const gameRef = db.ref(`games/${GAME_ID}`);

const joinView = document.getElementById("joinView");
const gameView = document.getElementById("gameView");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");

const scoreText = document.getElementById("scoreText");
const timerText = document.getElementById("timerText");
const statusText = document.getElementById("statusText");
const categoryText = document.getElementById("categoryText");
const questionText = document.getElementById("questionText");
const choicesEl = document.getElementById("choices");

let playerId = localStorage.getItem("grumpysTriviaPlayerId");
let playerName = localStorage.getItem("grumpysTriviaPlayerName");
let currentGame = null;
let currentPlayer = null;

const BLOCKED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt",
  "nigger", "nigga", "fag", "faggot", "retard", "whore", "slut",
  "cum", "porn", "sex", "hitler", "nazi"
];

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function makePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function cleanName(name) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9 _.-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 18);
}

function isNameAllowed(name) {
  const lowered = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  return !BLOCKED_WORDS.some(word => lowered.includes(word));
}

async function joinGame() {
  const cleanedName = cleanName(nameInput.value);

  if (!cleanedName) {
    alert("Enter a nickname first.");
    return;
  }

  if (!isNameAllowed(cleanedName)) {
    alert("Pick a different nickname.");
    return;
  }

  playerId = playerId || makePlayerId();
  playerName = cleanedName;

  localStorage.setItem("grumpysTriviaPlayerId", playerId);
  localStorage.setItem("grumpysTriviaPlayerName", playerName);

  await gameRef.child(`players/${playerId}`).set({
    id: playerId,
    name: playerName,
    score: 0,
    joinedAt: Date.now(),
    answers: {}
  });

  joinView.classList.add("hidden");
  gameView.classList.remove("hidden");
}

async function submitAnswer(choiceIndex) {
  if (!currentGame || currentGame.phase !== "question" || !playerId) return;

  const questionIndex = currentGame.questionIndex;
  const existingAnswer = currentPlayer?.answers?.[questionIndex];

  if (existingAnswer) {
    statusText.textContent = "Answer already submitted. You cannot change it.";
    return;
  }

  await gameRef.child(`players/${playerId}/answers/${questionIndex}`).set({
    choiceIndex,
    answeredAt: Date.now(),
    scored: false
  });

  document.querySelectorAll(".choice").forEach((btn, index) => {
    btn.disabled = true;

    if (index === choiceIndex) {
      btn.classList.add("selected");
    }
  });

  statusText.textContent = "Answer submitted. Waiting for reveal...";
}

function renderChoices(game) {
  choicesEl.innerHTML = "";

  if (!game.choices) return;

  const questionIndex = game.questionIndex;
  const existingAnswer = currentPlayer?.answers?.[questionIndex];
  const selectedIndex = existingAnswer?.choiceIndex;

  game.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;

    if (selectedIndex === index) {
      btn.classList.add("selected");
    }

    if (existingAnswer || game.phase !== "question") {
      btn.disabled = true;
    }

    if (game.phase === "reveal") {
      if (index === game.correctAnswerIndex) {
        btn.classList.add("correct");
      } else if (selectedIndex === index && selectedIndex !== game.correctAnswerIndex) {
        btn.classList.add("wrong");
      }
    }

    btn.onclick = () => submitAnswer(index);
    choicesEl.appendChild(btn);
  });
}

async function renderGame(game) {
  currentGame = game || {};

  timerText.textContent = formatTime(currentGame.timer || 0);

  if (!playerId) return;

  const playerSnap = await gameRef.child(`players/${playerId}`).once("value");
  currentPlayer = playerSnap.val();

  scoreText.textContent = currentPlayer?.score || 0;

  if (!currentGame.phase || currentGame.phase === "join") {
    statusText.textContent = "You are in. Waiting for the round to start...";
    categoryText.textContent = "Get Ready";
    questionText.textContent = "Watch the TV for the round countdown.";
    choicesEl.innerHTML = "";
    return;
  }

  if (currentGame.phase === "question") {
    const existingAnswer = currentPlayer?.answers?.[currentGame.questionIndex];

    statusText.textContent = existingAnswer
      ? "Answer submitted. Waiting for reveal..."
      : "Answer now!";

    categoryText.textContent = currentGame.category || "Trivia";
    questionText.textContent = currentGame.question || "Question loading...";
    renderChoices(currentGame);
    return;
  }

  if (currentGame.phase === "reveal") {
    statusText.textContent = "Answer revealed. Check the TV leaderboard.";
    categoryText.textContent = currentGame.category || "Trivia";
    questionText.textContent = currentGame.question || "Answer revealed.";
    renderChoices(currentGame);
    return;
  }

  if (currentGame.phase === "final") {
    statusText.textContent = "Round complete!";
    categoryText.textContent = "Final";
    questionText.textContent = "Check the TV for the winner.";
    choicesEl.innerHTML = "";
  }
}

joinBtn.addEventListener("click", joinGame);

if (playerName) {
  nameInput.value = playerName;
}

gameRef.on("value", snap => {
  renderGame(snap.val());
});
