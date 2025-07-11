const formChamado = document.getElementById("formChamado");
if (formChamado) {
  formChamado.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const setor = document.getElementById("setor").value;
    const problema = document.getElementById("problema").value;
    const msg = document.getElementById("msgResposta");
    msg.textContent = "Enviando...";

    try {
      const res = await fetch("/chamado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, setor, problema }),
      });
      const data = await res.json();
      if (data.success) {
        msg.textContent = `✅ Chamado aberto! Protocolo: ${data.protocolo}`;
        formChamado.reset();
      } else {
        msg.textContent = "Erro ao abrir chamado.";
      }
    } catch {
      msg.textContent = "Erro na comunicação com o servidor.";
    }
  });
}
