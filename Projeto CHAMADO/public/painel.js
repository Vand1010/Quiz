const usuario = sessionStorage.getItem("usuarioLogado");
const welcomeDiv = document.getElementById("welcome");
const btnLogout = document.getElementById("btnLogout");

if (!usuario) {
  window.location.href = "login.html";
} else {
  welcomeDiv.textContent = `Bem-vindo, ${usuario}!`;
}

btnLogout.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  sessionStorage.removeItem("usuarioLogado");
  window.location.href = "login.html";
});

let chamadoAtual = null;
let chartChamados = null;
let dadosOriginais = [];

if (document.getElementById("historico")) {
  carregarHistorico();
}

async function carregarHistorico() {
  try {
    const resp = await fetch("/historico.json");
    if (!resp.ok) throw new Error("Erro ao carregar histórico");
    dadosOriginais = await resp.json();
    filtrar();
  } catch (e) {
    console.error(e);
    document.getElementById("historico").innerText = "Erro ao carregar histórico.";
  }
}

window.filtrar = function filtrar() {
  const nomeFiltro = document.getElementById("filtroNome")?.value.toLowerCase() || "";
  const dataFiltro = document.getElementById("filtroData")?.value || "";
  const statusFiltro = document.getElementById("filtroStatus")?.value || "";

  const filtrado = dadosOriginais.filter((item) => {
    const nomeOK = !nomeFiltro || (item.nome && item.nome.toLowerCase().includes(nomeFiltro));
    const dataOK = !dataFiltro || (item.timestamp && item.timestamp.startsWith(dataFiltro));
    const statusOK =
      !statusFiltro ||
      (statusFiltro === "pendente" && !item.resolvido) ||
      (statusFiltro === "resolvido" && item.resolvido);
    return nomeOK && dataOK && statusOK;
  });

  renderizarHistorico(filtrado);
  desenharGraficoChamados(filtrado, dataFiltro || "Todos os dias");
};

function renderizarHistorico(dados) {
  const div = document.getElementById("historico");
  div.innerHTML = "";

  dados.slice().reverse().forEach((item) => {
    const el = document.createElement("div");
    el.className = "item";
    el.dataset.protocolo = extrairProtocolo(item.resposta);

    if (item.resolvido) {
      el.style.backgroundColor = "#2e553a";
      el.style.boxShadow = "0 0 10px #34d399";
    }

    el.innerHTML = `
      <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
      <div><strong>${item.nome}</strong> (${item.jid})</div>
      <div><strong>Setor:</strong> ${item.setor}</div>
      <div class="pergunta">💬 ${item.problema}</div>
      <div class="resposta">🤖 ${item.resposta}</div>
    `;

    el.addEventListener("click", () => {
      mostrarDetalhesChamado(item, el);
    });

    div.appendChild(el);
  });
}

function mostrarDetalhesChamado(chamado, elChamado) {
  chamadoAtual = chamado;
  document.querySelectorAll(".detalhesChamado").forEach((d) => d.remove());

  const div = document.createElement("div");
  div.className = "detalhesChamado";
  div.style.position = "relative"; // necessário para posicionar botão fechar
  div.style.background = "#222";
  div.style.padding = "15px";
  div.style.marginTop = "10px";
  div.style.borderRadius = "8px";
  div.style.color = "#eee";

  div.innerHTML = `
    <h4>Detalhes do chamado</h4>
    <button class="btnFecharDetalhes" title="Fechar">×</button>
    <p><strong>Origem:</strong> ${chamado.jid}</p>
    <p><strong>🌐 IP:</strong> ${chamado.ip || "-"}</p>
    <p><strong>Setor:</strong> ${chamado.setor}</p>
    <p><strong>Problema:</strong> ${chamado.problema}</p>
    <p><strong>Protocolo:</strong> ${extrairProtocolo(chamado.resposta)}</p>
    <div><strong>Comentários:</strong> ${formatarComentarios(chamado.comentarios)}</div>
    <textarea placeholder="Nova observação..." rows="3" style="width:100%;margin-top:8px;"></textarea>
    <div style="margin-top:8px;">
      <label style="color:${chamado.resolvido ? "#34d399" : "#fff"};">
        <input type="checkbox" ${chamado.resolvido ? "checked" : ""}/> Chamado resolvido
      </label>
    </div>
    <button style="margin-top:8px;">Salvar Comentário</button>
  `;

  const chk = div.querySelector("input[type=checkbox]");
  const btnSalvar = div.querySelector("button:nth-of-type(2)");
  const btnFechar = div.querySelector(".btnFecharDetalhes");
  const txt = div.querySelector("textarea");
  const label = div.querySelector("label");

  chk.addEventListener("change", () => {
    label.style.color = chk.checked ? "#34d399" : "#fff";
  });

  btnSalvar.addEventListener("click", async () => {
    const comentario = txt.value.trim();
    if (!comentario) {
      alert("Digite uma observação.");
      return;
    }

    try {
      const resp = await fetch("/atualizar-chamado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolo: extrairProtocolo(chamado.resposta),
          comentario,
          resolvido: chk.checked,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        alert("Comentário adicionado.");
        chamado.comentarios = chamado.comentarios || [];
        chamado.comentarios.push({
          usuario,
          texto: comentario,
          timestamp: new Date().toISOString(),
        });
        chamado.resolvido = chk.checked;
        filtrar();
        div.remove();
      } else {
        alert("Erro: " + data.message);
      }
    } catch (e) {
      alert("Erro ao atualizar chamado.");
    }
  });

  btnFechar.addEventListener("click", () => {
    div.remove();
  });

  elChamado.after(div);
}

function formatarComentarios(lista) {
  if (!lista || lista.length === 0) return "<em>Sem comentários</em>";
  return lista
    .map((c) => `<div>📝 <strong>${c.usuario}</strong> (${new Date(c.timestamp).toLocaleString()}): ${c.texto}</div>`)
    .join("");
}

function extrairProtocolo(resposta) {
  const match = resposta.match(/WEB#\d{4}/);
  return match ? match[0] : "";
}

function desenharGraficoChamados(lista, dataRef) {
  let total = lista.length;
  let resolvidos = lista.filter((x) => x.resolvido).length;
  let pendentes = total - resolvidos;

  const ctx = document.getElementById("grafico").getContext("2d");
  if (chartChamados) chartChamados.destroy();

  chartChamados = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [`Total ${dataRef}`, "Resolvidos", "Pendentes"],
      datasets: [{
        label: "Chamados",
        data: [total, resolvidos, pendentes],
        backgroundColor: ["#5a4da7", "#34d399", "#c53030"],
      }],
    },
    options: {
      plugins: { legend: { labels: { color: "#fff" } } },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } },
      },
    },
  });
}


//scroll
let ultimoScroll = 0;
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
  const scrollAtual = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollAtual > ultimoScroll && scrollAtual > 100) {
    header.style.top = '-100px';
  } else {
    header.style.top = '0';
  }

  ultimoScroll = scrollAtual <= 0 ? 0 : scrollAtual;
});
