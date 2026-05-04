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

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function makePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function joinGame() {
  const name = nameInput.value.trim();

  if (!name) {
    alert("Enter a nickname first.");
    return;
  }

  playerId = playerId || makePlayerId();
  playerName = name;

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
  if (!currentGame || currentGame.phase !== "question") return;

  const questionIndex = currentGame.questionIndex;

  await gameRef.child(`players/${playerId}/answers/${questionIndex}`).set({
    choiceIndex,
    answeredAt: Date.now()
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

  if (!game.choices || game.phase !== "question") return;

  game.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
    btn.onclick = () => submitAnswer(index);
    choicesEl.appendChild(btn);
  });
}

async function renderGame(game) {
  currentGame = game || {};

  timerText.textContent = formatTime(currentGame.timer || 0);

  if (!playerId) return;

  const playerSnap = await gameRef.child(`players/${playerId}`).once("value");
  const player = playerSnap.val();

  scoreText.textContent = player?.score || 0;

  if (!currentGame.phase || currentGame.phase === "join") {
    statusText.textContent = "You are in. Waiting for the round to start...";
    categoryText.textContent = "Get Ready";
    questionText.textContent = "Watch the TV for the round countdown.";
    choicesEl.innerHTML = "";
    return;
  }

  if (currentGame.phase === "question") {
    statusText.textContent = "Answer now!";
    categoryText.textContent = currentGame.category || "Trivia";
    questionText.textContent = currentGame.question || "Question loading...";
    renderChoices(currentGame);
    return;
  }

  if (currentGame.phase === "reveal") {
    statusText.textContent = "Answer revealed. Check the TV leaderboard.";
    categoryText.textContent = currentGame.category || "Trivia";
    questionText.textContent = currentGame.question || "Answer revealed.";

    renderChoices({
      ...currentGame,
      phase: "question"
    });

    document.querySelectorAll(".choice").forEach((btn, index) => {
      btn.disabled = true;

      if (index === currentGame.correctAnswerIndex) {
        btn.classList.add("correct");
      }
    });

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
