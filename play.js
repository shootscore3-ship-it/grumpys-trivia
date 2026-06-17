const GAME_ID = "main";
const gameRef = db.ref(`games/${GAME_ID}`);
const claimedNamesRef = db.ref("claimedNames");

const joinView = document.getElementById("joinView");
const gameView = document.getElementById("gameView");
const nameInput = document.getElementById("nameInput");
const pinInput = document.getElementById("pinInput");
const joinBtn = document.getElementById("joinBtn");
const joinError = document.getElementById("joinError");

const scoreText = document.getElementById("scoreText");
const timerText = document.getElementById("timerText");
const statusText = document.getElementById("statusText");
const categoryText = document.getElementById("categoryText");
const questionText = document.getElementById("questionText");
const choicesEl = document.getElementById("choices");

let playerId = localStorage.getItem("grumpysTriviaPlayerId");
let playerName = localStorage.getItem("grumpysTriviaPlayerName");
let playerNameKey = localStorage.getItem("grumpysTriviaNameKey");
let savedPin = localStorage.getItem("grumpysTriviaPin");
let currentGame = null;
let currentPlayer = null;

const BLOCKED_WORDS = [
  // Profanity / crude language
  "fuck", "fucker", "fucking", "shit", "shitty", "bitch", "asshole",
  "dick", "cock", "pussy", "cunt", "cum", "jizz", "porn", "sex",
  "slut", "whore", "horny", "nude", "nudes",

  // Sexual / creepy joke names
  "daddy", "mommy", "mama", "papi", "stepdad", "stepmom",
  "milf", "dilf", "sugarbaby", "sugar", "baby",
  "suck", "sucks", "sucker", "lick", "licker", "spank",
  "sexy", "thicc", "gyatt", "onlyfans", "simp", "cougar", "hoe", "hoes",

  // Bathroom / gross names
  "fart", "farter", "farting", "poop", "pooper", "poopy",
  "pee", "piss", "butt", "booty", "balls", "nuts", "booger",
  "toilet", "diarrhea", "diarrhoea", "crap", "turd", "shart",
  "barf", "vomit", "stinky", "smelly", "boob", "boobs",

  // Hate / slurs / violent content
  "rape", "rapist", "molest", "pedo", "pedophile",
  "nigger", "nigga", "fag", "faggot", "retard", "spic",
  "chink", "kike", "hitler", "nazi", "kkk", "isis", "terrorist",

  // Admin/staff impersonation
  "admin", "administrator", "owner", "staff", "employee", "manager",
  "host", "triviahost", "grumpysowner", "grumpysstaff", "grumpysmanager",
  "ceo", "president", "mod", "moderator", "security", "bartender",
  "server", "cook", "chef", "dj", "announcer",

  // Political bait names
  "trump", "biden", "obama", "maga", "liberal", "conservative",

  // Drug / bar-inappropriate joke names
  "weed", "stoner", "drunk", "wasted",

  // Common troll / fake names
  "skibidi", "ohio", "chungus", "yeet", "sus", "imposter",
  "amongus", "npc", "bot", "trash", "loser", "anonymous",
  "unknown", "none", "null", "undefined", "test",

  // “Your mom” type names
  "yourmom", "yourdad", "urmom", "urdad", "yomama"
];

const BLOCKED_EXACT_NAMES = [
  "admin",
  "administrator",
  "owner",
  "staff",
  "manager",
  "employee",
  "host",
  "triviahost",
  "grumpys",
  "grumpysowner",
  "grumpysstaff",
  "grumpysmanager",

  "daddy",
  "mommy",
  "mama",
  "papi",
  "farter",
  "fart",
  "pooper",
  "poop",
  "butt",
  "booty",

  "trump",
  "biden",
  "obama",
  "maga",

  "guest",
  "player",
  "winner",
  "loser",
  "anonymous",
  "unknown",
  "test"
];

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function cleanName(name) {
  return String(name || "")
    .trim()
    // Only allow letters, numbers, spaces, apostrophes, hyphens, and periods
    .replace(/[^a-zA-Z0-9 '\-.]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 15);
}

function makeNameKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeNameForFilter(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/[^a-z0-9]/g, "");
}

function isHardBlockedName(name) {
  const raw = String(name || "").toLowerCase();

  // Removes spaces, dots, hyphens, apostrophes, underscores, etc.
  // Example: "T-r.u m p" becomes "trump"
  const compact = raw.replace(/[^a-z0-9]/g, "");

  const compactNumbers = raw.replace(/[^0-9]/g, "");

  const hardBlocked = [
    "trump",
    "biden",
    "obama",
    "maga",

    "daddy",
    "mommy",
    "mama",
    "papi",

    "fart",
    "farter",
    "poop",
    "pooper",
    "pee",
    "piss",
    "butt",
    "booty",

    "admin",
    "owner",
    "manager",
    "staff",
    "host",
    "grumpys",
    "grumpy",

    "fuck",
    "shit",
    "bitch",
    "asshole",
    "dick",
    "pussy",
    "cunt",
    "sex",
    "porn",
    "hitler",
    "nazi"
  ];

  if (compactNumbers.includes("69") || compactNumbers.includes("420")) {
    return true;
  }

  return hardBlocked.some(word => compact.includes(word));
}

function isNameAllowed(name) {
  const cleaned = cleanName(name);
  const key = makeNameKey(cleaned);
  const normalized = normalizeNameForFilter(cleaned);

  // Example: "Dadddddy" gets checked closer to "Dadddy"
  const reducedRepeats = normalized.replace(/(.)\1{3,}/g, "$1$1$1");

  const words = cleaned.split(" ").filter(Boolean);

  // Must have a real name
  if (!cleaned || key.length < 2) {
    return false;
  }

  // Max 15 visible characters
  if (cleaned.length > 15) {
    return false;
  }

  // Max 2 words
  if (words.length > 2) {
    return false;
  }

  // No word longer than 12 characters
  if (words.some(word => word.length > 12)) {
    return false;
  }

  // Only letters, numbers, spaces, apostrophes, hyphens, and periods
  if (/[^a-zA-Z0-9 '\-.]/.test(cleaned)) {
    return false;
  }

  // No repeated letters/numbers more than 3 in a row
  // Example blocked: "Saaaam", "Mikeeee", "1111"
  if (/(.)\1{3,}/i.test(cleaned)) {
    return false;
  }

  // Must include at least one letter
  if (!/[a-z]/i.test(cleaned)) {
    return false;
  }

  // Ban inappropriate number patterns, including:
  // 69, 6 9, 6-9, 6.9, 6/9, and 420
  const compactNumbers = cleaned.replace(/[^0-9]/g, "");
  if (compactNumbers.includes("69") || compactNumbers.includes("420")) {
    return false;
  }

  // Ban exact fake/admin/troll names
  if (BLOCKED_EXACT_NAMES.includes(normalized) || BLOCKED_EXACT_NAMES.includes(reducedRepeats)) {
    return false;
  }

  // Ban guest-style names
  if (normalized.includes("guest")) {
    return false;
  }

  // Ban Grumpy's impersonation names
  if (normalized.includes("grumpys") || normalized.includes("grumpy")) {
    return false;
  }

  // Ban “your mom” variants even with spaces/punctuation
  if (
    normalized.includes("yourmom") ||
    normalized.includes("yourdad") ||
    normalized.includes("urmom") ||
    normalized.includes("urdad") ||
    normalized.includes("yomama")
  ) {
    return false;
  }

  // Ban obvious bad words, including versions with spaces, periods, hyphens, or number swaps
  const blocked = BLOCKED_WORDS.some(word => {
    const badWord = normalizeNameForFilter(word);

    return normalized.includes(badWord) || reducedRepeats.includes(badWord);
  });

  if (blocked) {
    return false;
  }

  return true;
}

function isPinValid(pin) {
  return /^[0-9]{4}$/.test(pin);
}

function setJoinError(message) {
  joinError.textContent = message;
  joinError.style.color = message ? "#ffb3b3" : "#bbb";
}

async function joinGame() {
  setJoinError("");

  const rawName = nameInput.value;
  const cleanedName = cleanName(rawName);
  const nameKey = makeNameKey(cleanedName);
  const pin = pinInput.value.trim();

  if (!cleanedName || nameKey.length < 2) {
    setJoinError("Enter a nickname with at least 2 letters/numbers.");
    return;
  }

  if (isHardBlockedName(rawName) || isHardBlockedName(cleanedName) || !isNameAllowed(cleanedName)) {
    setJoinError("Pick a different nickname. Use a normal first name or first name and last initial.");
    return;
  }

  if (!isPinValid(pin)) {
    setJoinError("Enter a 4-digit PIN.");
    return;
  }

  const nameSnap = await claimedNamesRef.child(nameKey).once("value");
  const existingProfile = nameSnap.val();

  if (existingProfile && existingProfile.pin !== pin) {
    setJoinError("That name is already taken. Use the correct PIN or pick a different name.");
    return;
  }

  if (existingProfile) {
    playerId = existingProfile.playerId;
  } else {
    playerId = `player_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    await claimedNamesRef.child(nameKey).set({
      playerId,
      displayName: cleanedName,
      pin,
      totalScore: 0,
      gamesPlayed: 0,
      wins: 0,
      createdAt: Date.now(),
      lastPlayed: Date.now()
    });
  }

  playerName = cleanedName;
  playerNameKey = nameKey;
  savedPin = pin;

  localStorage.setItem("grumpysTriviaPlayerId", playerId);
  localStorage.setItem("grumpysTriviaPlayerName", playerName);
  localStorage.setItem("grumpysTriviaNameKey", playerNameKey);
  localStorage.setItem("grumpysTriviaPin", savedPin);

  const gameSnap = await gameRef.once("value");
  const game = gameSnap.val() || {};

  await gameRef.child(`players/${playerId}`).set({
    id: playerId,
    name: playerName,
    nameKey: playerNameKey,
    score: 0,
    joinedAt: Date.now(),
    joinedRoundId: game.roundId || null,
    joinedPhase: game.phase || "unknown",
    answers: {}
  });

  await claimedNamesRef.child(nameKey).update({
    displayName: cleanedName,
    lastPlayed: Date.now()
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

function getJoinStatusMessage(game, player) {
  if (!game || !game.phase) {
    return "Waiting for the TV screen to start the game.";
  }

  if (!player) {
    return "Joining game...";
  }

  if (game.phase === "join") {
    return "You are in. Get ready — the round is about to start.";
  }

  if (game.phase === "question") {
    return "You joined during the round. Answer this question now!";
  }

  if (game.phase === "reveal") {
    return "You joined between questions. Wait for the next question to answer.";
  }

  if (game.phase === "final") {
    return "This round just ended. Stay here for the next round.";
  }

  return "Waiting for the next question...";
}

async function renderGame(game) {
  currentGame = game || {};
  timerText.textContent = formatTime(currentGame.timer || 0);

  if (!playerId) return;

  const playerSnap = await gameRef.child(`players/${playerId}`).once("value");
  currentPlayer = playerSnap.val();

  scoreText.textContent = currentPlayer?.score || 0;

  if (!currentGame.phase || currentGame.phase === "join") {
    statusText.textContent = getJoinStatusMessage(currentGame, currentPlayer);
    categoryText.textContent = "Get Ready";
    questionText.textContent = "Watch the TV for the round countdown.";
    choicesEl.innerHTML = "";
    return;
  }

  if (currentGame.phase === "question") {
    const existingAnswer = currentPlayer?.answers?.[currentGame.questionIndex];

    statusText.textContent = existingAnswer
      ? "Answer submitted. Waiting for reveal..."
      : getJoinStatusMessage(currentGame, currentPlayer);

    categoryText.textContent = currentGame.category || "Trivia";
    questionText.textContent = currentGame.question || "Question loading...";
    renderChoices(currentGame);
    return;
  }

  if (currentGame.phase === "reveal") {
    statusText.textContent = getJoinStatusMessage(currentGame, currentPlayer);
    categoryText.textContent = currentGame.category || "Trivia";
    questionText.textContent = currentGame.question || "Answer revealed.";
    renderChoices(currentGame);
    return;
  }

  if (currentGame.phase === "final") {
    statusText.textContent = getJoinStatusMessage(currentGame, currentPlayer);
    categoryText.textContent = "Final";
    questionText.textContent = "Check the TV for the winner.";
    choicesEl.innerHTML = "";
  }
}

joinBtn.addEventListener("click", joinGame);

if (playerName) nameInput.value = playerName;
if (savedPin) pinInput.value = savedPin;

gameRef.on("value", snap => {
  renderGame(snap.val());
});
