const API_URL = "https://opentdb.com/api.php?amount=5&type=multiple&difficulty=easy";

const JOIN_SECONDS = 20;
const QUESTION_SECONDS = 20;
const REVEAL_SECONDS = 8;
const FINAL_SECONDS = 40;

const phaseLabel = document.getElementById("phaseLabel");
const timerEl = document.getElementById("timer");
const categoryEl = document.getElementById("category");
const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const messageEl = document.getElementById("message");
const roundProgressEl = document.getElementById("roundProgress");

let questions = [];
let currentQuestionIndex = 0;
let correctAnswerIndex = 0;

const fakeLeaderboardSets = [
  [
    ["Mike", 100], ["Sarah", 100], ["Table 7", 0], ["Jake", 0], ["Lisa", 0]
  ],
  [
    ["Sarah", 200], ["Mike", 100], ["Jake", 100], ["Table 7", 100], ["Lisa", 0]
  ],
  [
    ["Sarah", 300], ["Table 7", 200], ["Mike", 200], ["Lisa", 100], ["Jake", 100]
  ],
  [
    ["Table 7", 400], ["Sarah", 300], ["Mike", 300], ["Lisa", 200], ["Jake", 100]
  ],
  [
    ["Table 7", 500], ["Sarah", 400], ["Mike", 300], ["Lisa", 300], ["Jake", 200]
  ]
];

function decodeHtml(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function shuffle(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function startCountdown(seconds) {
  let remaining = seconds;
  timerEl.textContent = formatTime(remaining);

  return new Promise(resolve => {
    const interval = setInterval(() => {
      remaining--;
      timerEl.textContent = formatTime(Math.max(remaining, 0));

      if (remaining <= 0) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

function updateLeaderboard(index) {
  const leaderboardList = document.getElementById("leaderboardList");
  const set = fakeLeaderboardSets[index] || fakeLeaderboardSets[fakeLeaderboardSets.length - 1];

  leaderboardList.innerHTML = set
    .map(([name, score]) => `<li><span>${name}</span><strong>${score}</strong></li>`)
    .join("");
}

function showJoinScreen() {
  phaseLabel.textContent = "Join Now";
  categoryEl.textContent = "Grumpy's Trivia";
  questionEl.textContent = "Scan the QR code and get ready to play!";
  messageEl.textContent = "A new 5-question round is starting.";
  roundProgressEl.textContent = "Round starts soon";

  answersEl.innerHTML = `
    <div class="answer">Fast answers score points</div>
    <div class="answer">Top 5 shown after each question</div>
    <div class="answer">Play from your phone</div>
    <div class="answer">Winner shown at the end</div>
  `;
}

function showQuestion(questionData, index) {
  phaseLabel.textContent = "Question";
  currentQuestionIndex = index;

  categoryEl.textContent = decodeHtml(questionData.category);
  questionEl.textContent = decodeHtml(questionData.question);
  messageEl.textContent = "Answer now on your phone.";
  roundProgressEl.textContent = `Question ${index + 1} of ${questions.length}`;

  const choices = shuffle([
    ...questionData.incorrect_answers,
    questionData.correct_answer
  ]).map(decodeHtml);

  correctAnswerIndex = choices.indexOf(decodeHtml(questionData.correct_answer));

  answersEl.innerHTML = choices
    .map((choice, i) => `<div class="answer" data-index="${i}">${String.fromCharCode(65 + i)}. ${choice}</div>`)
    .join("");
}

function showAnswerReveal(index) {
  phaseLabel.textContent = "Answer";
  messageEl.textContent = "Current Top 5 leaderboard is updated.";
  roundProgressEl.textContent = `Answer reveal ${index + 1} of ${questions.length}`;

  document.querySelectorAll(".answer").forEach((answer, i) => {
    if (i === correctAnswerIndex) {
      answer.classList.add("correct");
    } else {
      answer.classList.add("dim");
    }
  });

  updateLeaderboard(index);
}

function showFinalScreen() {
  phaseLabel.textContent = "Final";
  categoryEl.textContent = "Winner";
  questionEl.textContent = "Table 7 wins this round!";
  messageEl.textContent = "Next round starts when the trivia slide comes back.";

  answersEl.innerHTML = `
    <div class="answer correct">1st Place: Table 7</div>
    <div class="answer">2nd Place: Sarah</div>
    <div class="answer">3rd Place: Mike</div>
    <div class="answer">4th Place: Lisa</div>
  `;

  roundProgressEl.textContent = "Round complete";
}

async function loadQuestions() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.results || data.results.length < 5) {
      throw new Error("Not enough trivia questions returned.");
    }

    questions = data.results;
  } catch (error) {
    console.error(error);

    questions = [
      {
        category: "General Trivia",
        question: "What planet is known as the Red Planet?",
        correct_answer: "Mars",
        incorrect_answers: ["Venus", "Jupiter", "Saturn"]
      },
      {
        category: "Sports",
        question: "How many points is a touchdown worth?",
        correct_answer: "6",
        incorrect_answers: ["3", "7", "10"]
      },
      {
        category: "Entertainment",
        question: "What movie features a character named Buzz Lightyear?",
        correct_answer: "Toy Story",
        incorrect_answers: ["Shrek", "Cars", "Finding Nemo"]
      },
      {
        category: "Geography",
        question: "Which country is directly north of the United States?",
        correct_answer: "Canada",
        incorrect_answers: ["Mexico", "Brazil", "France"]
      },
      {
        category: "Food & Drink",
        question: "What drink is traditionally made with ginger beer, lime, and vodka?",
        correct_answer: "Moscow Mule",
        incorrect_answers: ["Margarita", "Old Fashioned", "Mojito"]
      }
    ];
  }
}

async function runRound() {
  showJoinScreen();
  await startCountdown(JOIN_SECONDS);

  for (let i = 0; i < questions.length; i++) {
    showQuestion(questions[i], i);
    await startCountdown(QUESTION_SECONDS);

    showAnswerReveal(i);
    await startCountdown(REVEAL_SECONDS);
  }

  showFinalScreen();
  await startCountdown(FINAL_SECONDS);

  phaseLabel.textContent = "Next Round";
  timerEl.textContent = "0:00";
}

async function init() {
  await loadQuestions();
  runRound();
}

init();
