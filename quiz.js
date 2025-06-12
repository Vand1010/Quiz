const bgMusic = document.getElementById("bgMusic");
const clickSound = document.getElementById("clickSound");

const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const openCardBtn = document.getElementById("openCard");
const cardMessage = document.getElementById("cardMessage");

const quizData = [
  {                  
    question: "Qual versículo bíblico melhor representa nosso amor?",
    options: [
      "“O amor é paciente, o amor é bondoso.” (1 Coríntios 13:4)",
      "“Acima de tudo, porém, revistam-se do amor.” (Colossenses 3:14)",
      "“O amor cobre multidão de pecados.” (1 Pedro 4:8)",
      "“Onde quer que você vá, irei eu.” (Rute 1:16)"
    ],
    correct: 2
  },
  {
    question: "Se virássemos uma dupla famosa, qual seria nosso nome?",
    options: [
      "Amor & Coração",
      "Mozim & Mozona",
      "Tico & Teca",
      "Casalzão da Massa"
    ],
    correct: 3
  },
  {
    question: "Aonde foi nosso primeiro beijo?",
    options: [
      "Festa",
      "Praia",
      "shopping",
    ],
    correct: 0
  },
  {
    question: "Qual foi nosso primeiro encontro?",
    options: [
      "Festa",
      "Shopping",
      "Em casa",
      "Subway"
    ],
    correct: 3
  },
  {
    question: "Qual nossa comida favorita??",
    options: [
      "Pizza",
      "Sushi",
      "Lasanha",
      "Hamburguer"
    ],
    correct: 1
  },
  {
    question: "Quem na Bíblia representa melhor nosso jeitinho de casal?",
    options: [
      "Adão e Eva (inseparáveis, mesmo com confusão!)",
      "Rute e Boaz (amor com propósito)",
      "José e Maria (parceria em tudo)",
      "Cântico dos Cânticos (só romance!)"
    ],
    correct: 1
  },
  {
    question: "Se nosso amor fosse um salmo, qual seria o refrão?",
    options: [
      "“O Senhor é o nosso pastor e nada nos faltará”",
      "“Louvem ao Senhor com danças e abraços!”",
      "“Feliz o casal que anda nos caminhos do amor”",
      "“Grandes são as bênçãos de um relacionamento em Deus”"
    ],
    correct: 3
  },
  {
    question: "O que não pode faltar num momento nosso juntos?",
    options: [
      "Comida gostosa e risadas",
      "Um bom versículo e carinho",
      "Filminho com coberta",
      "Tudo isso e mais um pouco!"
    ],
    correct: 3
  }
];

let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;

function playClickSound() {
  if (clickSound) {
    clickSound.pause();
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }
}

function showQuestion() {
  selectedAnswer = null;
  nextBtn.classList.add("hidden");

  if (currentQuestion === 0) {
    backBtn.classList.add("hidden");
  } else {
    backBtn.classList.remove("hidden");
  }

  const current = quizData[currentQuestion];
  questionEl.textContent = current.question;
  answersEl.innerHTML = "";

  current.options.forEach((option, i) => {
    const btn = document.createElement("button");
    btn.classList.add("option-btn", "clickable");
    btn.textContent = option;
    btn.addEventListener("click", () => {
      playClickSound();
      selectedAnswer = i;

      answersEl.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      nextBtn.classList.remove("hidden");
    });
    answersEl.appendChild(btn);
  });
}

nextBtn.addEventListener("click", () => {
  if (selectedAnswer === null) return;

  if (selectedAnswer === quizData[currentQuestion].correct) {
    score++;
  }

  currentQuestion++;

  if (currentQuestion < quizData.length) {
    showQuestion();
  } else {
    showResults();
  }
});

backBtn.addEventListener("click", () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    showQuestion();
  }
  if (currentQuestion === 0) {
    backBtn.classList.add("hidden");
  }
  nextBtn.classList.remove("hidden");
});

function showResults() {
  questionEl.textContent = `Você acertou ${score} de ${quizData.length} perguntas! 💖`;
  answersEl.innerHTML = "";
  nextBtn.classList.add("hidden");
  backBtn.classList.add("hidden");

  const metade = Math.ceil(quizData.length / 2);

  if (score >= metade && openCardBtn) {
    openCardBtn.classList.remove("hidden");
    openCardBtn.classList.add("animate-show");
  } else {
    const aviso = document.createElement("p");
    aviso.textContent = "Responda melhor da próxima vez para desbloquear o presente! 😉";
    aviso.style.color = "white";
    aviso.style.marginTop = "1rem";
    answersEl.appendChild(aviso);
  }
}

// Inicializa o quiz
showQuestion();

// Música: tocar no primeiro clique na página
let musicaIniciada = false;
window.addEventListener("click", () => {
  if (!musicaIniciada && bgMusic) {
    bgMusic.play().catch(err => console.log("Erro ao tocar música:", err));
    musicaIniciada = true;
  }
});

// Som do clique para botões clicáveis
document.body.addEventListener("click", e => {
  if (e.target.classList.contains("clickable")) {
    playClickSound();
  }
});

// Botão "Abrir meu presente"
if (openCardBtn && cardMessage) {
  openCardBtn.addEventListener("click", () => {
    cardMessage.classList.remove("hidden");
    openCardBtn.style.display = "none";
  });
}

// Slideshow background
const bgDiv = document.createElement("div");
bgDiv.classList.add("slideshow-background");
document.body.appendChild(bgDiv);

const imagens = [
  "assets/foto1.jpeg",
  "assets/foto2.jpeg",
  "assets/foto3.jpeg",
  "assets/foto4.jpeg",
  "assets/foto5.jpeg",
  "assets/foto6.jpeg",
  "assets/foto7.jpeg",
  "assets/foto8.jpeg",
  "assets/foto9.jpeg",
  "assets/foto10.jpeg",
  "assets/foto11.jpeg",
  "assets/foto12.jpeg"
];

let index = 0;

function trocarImagemDeFundo() {
  bgDiv.style.backgroundImage = `url('${imagens[index]}')`;
  index = (index + 1) % imagens.length;
}

trocarImagemDeFundo();
setInterval(trocarImagemDeFundo, 3000);
