import express from "express";
import session from "express-session";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "public");
const historicoPath = path.join(publicDir, "historico.json");

app.use(express.static(publicDir));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "segredo_super_secreto",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

const usuarios = {
  admin: "admin123",
};

function checkAuth(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    console.log("🚫 Tentativa de acesso sem login.");
    res.status(401).send("Não autorizado");
  }
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (usuarios[username] && usuarios[username] === password) {
    req.session.usuario = username;
    req.session.save((err) => {
      if (err) {
        console.error("Erro ao salvar sessão:", err);
        return res
          .status(500)
          .json({ success: false, message: "Erro interno" });
      }
      return res.json({ success: true });
    });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Usuário ou senha inválidos." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.use("/painel", checkAuth);
app.use("/historico.json", checkAuth);

app.get("/painel", (req, res) => {
  res.sendFile(path.join(publicDir, "painel.html"));
});

app.get("/chamado", (req, res) => {
  res.sendFile(path.join(publicDir, "chamado.html"));
});

app.post("/chamado", async (req, res) => {
  const { nome, setor, problema } = req.body;
  if (!nome || !setor || !problema) {
    return res
      .status(400)
      .json({ success: false, message: "Campos obrigatórios faltando." });
  }

  if (!fs.existsSync(historicoPath)) {
    fs.writeFileSync(historicoPath, "[]", "utf-8");
  }

  let historico = [];
  try {
    historico = JSON.parse(fs.readFileSync(historicoPath, "utf-8"));
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Erro ao ler histórico." });
  }

  let ipCliente = req.ip || req.socket.remoteAddress || "";
  if (ipCliente.startsWith("::ffff:")) ipCliente = ipCliente.substring(7);

  const protocolo = `WEB#${(historico.length + 1).toString().padStart(4, "0")}`;

  const novoChamado = {
    timestamp: new Date().toISOString(),
    nome,
    jid: "WEB",
    setor,
    problema,
    resposta: `Protocolo: ${protocolo}`,
    ip: ipCliente,
    comentario: [],
    resolvido: false,
  };

  historico.push(novoChamado);

  try {
    fs.writeFileSync(
      historicoPath,
      JSON.stringify(historico, null, 2),
      "utf-8"
    );
    console.log("✅ Chamado salvo:", novoChamado);

    // mensagem para o grupo WhatsApp

    const grupoNotificacao = "1@g.us";
    const msgGrupo = `🚨 *Novo chamado criado pela WEB!*

👤 Usuário: ${nome}
📂 Setor: ${setor.charAt(0).toUpperCase() + setor.slice(1)}
🌐 IP: ${ipCliente}
📝 Problema: ${problema}
🔢 Protocolo: #${protocolo.slice(4)}
📅 ${new Date().toLocaleString("pt-BR")}`;

    try {
      await fetch("http://localhost/send-whatsapp-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupo: grupoNotificacao, mensagem: msgGrupo }),
      });
      console.log("✅ Notificação enviada para grupo WhatsApp.");
    } catch (err) {
      console.error("Erro ao notificar grupo WhatsApp:", err);
    }

    return res.json({ success: true, protocolo });
  } catch (err) {
    console.error("Erro ao salvar chamado:", err);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao salvar chamado." });
  }
});

app.post("/atualizar-chamado", checkAuth, (req, res) => {
  const { protocolo, comentario, resolvido } = req.body;
  const usuario = req.session.usuario;

  if (!protocolo) {
    return res
      .status(400)
      .json({ success: false, message: "Protocolo é obrigatório." });
  }

  let historico = [];
  try {
    historico = JSON.parse(fs.readFileSync(historicoPath, "utf-8"));
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Erro ao ler histórico." });
  }

  const idx = historico.findIndex((chamado) =>
    chamado.resposta.includes(protocolo)
  );
  if (idx === -1) {
    return res
      .status(404)
      .json({ success: false, message: "Chamado não encontrado." });
  }

  if (!historico[idx].comentarios) {
    historico[idx].comentarios = [];
  }

  if (comentario) {
    historico[idx].comentarios.push({
      usuario,
      texto: comentario,
      timestamp: new Date().toISOString(),
    });
  }

  if (resolvido !== undefined) {
    historico[idx].resolvido = resolvido;
  }

  try {
    fs.writeFileSync(
      historicoPath,
      JSON.stringify(historico, null, 2),
      "utf-8"
    );
    res.json({ success: true, message: "Chamado atualizado." });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Erro ao salvar atualização." });
  }
});

app.get("/", (req, res) => {
  res.redirect("/painel");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando em http://192.168.8.109:${port}`);
});
