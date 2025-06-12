const bgMusic = document.getElementById("bgMusic");
const clickSound = document.getElementById("clickSound");
let musicaIniciada = false;

// Tocar música no primeiro clique em qualquer lugar da página
window.addEventListener("click", () => {
  if (!musicaIniciada && bgMusic) {
    bgMusic.play().catch(err => console.log("Erro ao tocar música:", err));
    musicaIniciada = true;
  }
});

// Som do clique em todos os botões que tenham a classe 'clickable'
document.querySelectorAll(".clickable").forEach(btn => {
  btn.addEventListener("click", () => {
    if (clickSound) {
      clickSound.pause();
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }
  });
});

// Código específico para o botão "Abrir meu presente"
const openCardBtn = document.getElementById("openCard");
const cardMessage = document.getElementById("cardMessage");

if (openCardBtn && cardMessage) {
  openCardBtn.addEventListener("click", () => {
    cardMessage.classList.remove("hidden");
    openCardBtn.style.display = "none";
  });
}


