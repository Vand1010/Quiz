import dotenv from "dotenv";
import { WebSocketServer } from "ws";
dotenv.config();

import baileys from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Cliente conectado ao WebSocket.");
  ws.on("close", () => console.log("Cliente desconectado."));
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
//validador de IP
function validarIP(ip) {
  const regex =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return regex.test(ip);
}

const publicDir = path.resolve(__dirname, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

const historicoPath = path.resolve(publicDir, "historico.json");
const protocoloPath = path.resolve(publicDir, "protocolo.txt");

function garantirArquivoHistorico() {
  if (!fs.existsSync(historicoPath)) {
    fs.writeFileSync(historicoPath, "[]", "utf-8");
    console.log("⚠️ Arquivo historico.json criado vazio.");
  }
}

function salvarHistorico(nome, jid, pergunta, resposta) {
  let historico = [];
  try {
    if (fs.existsSync(historicoPath)) {
      historico = JSON.parse(fs.readFileSync(historicoPath, "utf-8") || "[]");
    }
    const novoItem = {
      timestamp: new Date().toISOString(),
      nome,
      jid,
      pergunta,
      resposta,
    };
    console.log("📝 Histórico:", novoItem);
    historico.push(novoItem);
    fs.writeFileSync(
      historicoPath,
      JSON.stringify(historico, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("❌ Erro ao salvar histórico:", err);
  }
}

function getNumeroEmoji(n) {
  return `${n}\uFE0F\u20E3`;
}

function gerarMenu(nome) {
  return `✨ Olá *${nome}*, seja muito bem-vindo(a) ao *Help Desk Carris*! 🚍
  
💬 Estou aqui para te ajudar com o que precisar.  
Escolha uma das opções abaixo para abrir seu chamado:

📋 *MENU DE CHAMADOS*
${getNumeroEmoji(1)} - NGS travando
${getNumeroEmoji(2)} - Impressora não imprime
${getNumeroEmoji(3)} - Telefone sem sinal
${getNumeroEmoji(4)} - Sem internet
${getNumeroEmoji(5)} - Computador travado
${getNumeroEmoji(6)} - Computador não liga
${getNumeroEmoji(7)} - Falta de energia
${getNumeroEmoji(8)} - Outro problema

✍️ *Digite o número da opção desejada* que eu continuo o atendimento. 🚀`;
}

function lerUltimoProtocolo() {
  try {
    if (fs.existsSync(protocoloPath)) {
      const conteudo = fs.readFileSync(protocoloPath, "utf-8");
      return parseInt(conteudo) || 0;
    }
  } catch {}
  return 0;
}

function salvarUltimoProtocolo(num) {
  try {
    fs.writeFileSync(protocoloPath, num.toString());
  } catch (e) {
    console.error("Erro salvando protocolo:", e);
  }
}
function gerarProtocolo() {
  const ultimo = lerUltimoProtocolo();
  const novo = ultimo + 1;
  salvarUltimoProtocolo(novo);
  return `ZAP#${novo.toString().padStart(4, "0")}`;
}


const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = baileys;

const conversas = {};
const chamados = {};
const TIMEOUT_MS = 30 * 60 * 1000;

function limparConversaTimeout(jid) {
  if (conversas[jid]) {
    clearTimeout(conversas[jid].timeout);
    conversas[jid].timeout = setTimeout(() => {
      console.log(
        chalk.yellow(`⌛ Timeout: limpando estado da conversa ${jid}`)
      );
      delete conversas[jid];
      delete chamados[jid];
    }, TIMEOUT_MS);
  }
}

const setores = {
  1: {
    descricao: "🚀 NGS travando",
    sugestao: `1️⃣ Feche o programa e abra novamente.
2️⃣ Reinicie a máquina.
3️⃣ Na página de login, recarregue a página até trocar o servidor TS1, TS2 ou TS3, e tente novamente.`,
  },
  2: {
    descricao: "🖨️ Impressora não imprime",
    sugestao:
      "🔌 Verifique se a impressora está ligada e os cabos estão conectados corretamente.",
  },
  3: {
    descricao: "📞 Telefone sem sinal",
    sugestao:
      "📶 Verifique se o telefone está conectado corretamente e reinicie o aparelho.",
  },
  4: {
    descricao: "🌐 Sem internet",
    sugestao: "🔌 Verifique os cabos de rede e reinicie o computador/modem.",
  },
  5: {
    descricao: "💻 Computador travado",
    sugestao: `1️⃣ Pressione Ctrl + Alt + Del e tente fechar o programa travado.
2️⃣ Se não funcionar, desligue o computador segurando o botão de energia por 5 segundos.
3️⃣ Ligue novamente e verifique se o problema persiste.`,
  },
  6: {
    descricao: "⚙️ Computador não liga",
    sugestao: `1️⃣ Confira se o cabo de energia está bem conectado.
2️⃣ Teste outra tomada.
3️⃣ Aperte o botão de ligar e observe se há algum sinal.`,
  },
  7: {
    descricao: "⚡ Falta de energia",
    sugestao:
      "🔦 Verifique se há energia em outras máquinas ou lâmpadas próximas.",
  },
  8: {
    descricao: "❓ Outro problema",
    sugestao:
      "Descreva o problema que está enfrentando para que possamos ajudar melhor.",
  },
};

const setoresValidos = [
  "abastecimento",
  "assessoria de manutencao",
  "borracharia",
  "cco",
  "chapeacao",
  "compras",
  "contabilidade",
  "direcao",
  "disciplina",
  "ferramentaria",
  "ger operacao",
  "instrutores",
  "juridico",
  "largada",
  "memoria",
  "monitoramento",
  "planop",
  "psicologia",
  "recebedoria",
  "rh",
  "sacc",
  "servico medico",
  "sesmt",
  "vigilancia",
  "outro",
];
function listarSetoresEstilizado() {
  let texto = "*📋 Lista de Setores Válidos:*\n\n";
  setoresValidos.forEach((setor) => {
    const nomeFormatado = setor.charAt(0).toUpperCase() + setor.slice(1);
    texto += `🔹 *${nomeFormatado}*\n`;
  });
  texto += `\n*Por favor, digite o setor exatamente como está acima.*`;
  return texto;
}

async function startBot() {
  console.log("🤖 Iniciando Helpdesk Carris...");
  garantirArquivoHistorico();
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({ auth: state });

  global.sock = sock;
 async function enviarMensagemGrupo(chamado) {
  const grupo = "1@g.us";

  const msgGrupo = `🚨 *Chamado criado pelo WHATS!*

👤 Usuário: ${chamado.nome}
📂 Setor: ${chamado.setor.charAt(0).toUpperCase() + chamado.setor.slice(1)}
🌐 IP: ${chamado.ip}
📝 Problema: ${chamado.problema}
🔢 *Protocolo:* ${chamado.protocolo}
📅 ${new Date().toLocaleString("pt-BR")}
`;

  try {
    await sock.sendMessage(grupo, { text: msgGrupo });
    console.log("Mensagem enviada ao grupo");
  } catch (err) {
    console.error("Erro ao enviar mensagem para o grupo:", err);
  }
}


  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === "open")
      console.log(chalk.green("✅ Bot conectado no WhatsApp!"));
    if (connection === "close") {
      const reconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.yellow("⚠️ Reconectando?"), reconnect);
      if (reconnect) startBot();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    let textoRaw = "";
    if (msg.message.conversation) textoRaw = msg.message.conversation;
    else if (msg.message.extendedTextMessage?.text)
      textoRaw = msg.message.extendedTextMessage.text;
    else if (msg.message.buttonsResponseMessage?.selectedButtonId)
      textoRaw = msg.message.buttonsResponseMessage.selectedButtonId;
    else if (msg.message.listResponseMessage?.singleSelectReply?.selectedRowId)
      textoRaw =
        msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    else textoRaw = "";

    const nome = msg.pushName || "amigo";
    const jid = msg.key.remoteJid;
    const texto = textoRaw.trim().toLowerCase();

    console.log(chalk.blue(`📩 Mensagem de ${nome}: ${textoRaw}`));
    console.log("DEBUG estado atual da conversa:", conversas[jid]);

    if (textoRaw.length < 1 && texto !== "menu") {
      await sock.sendMessage(jid, {
        text: "Digite *menu* e veja as opções disponíveis.",
      });
      return;
    }

    if (conversas[jid]?.estado === "finalizado" && texto !== "menu") {
      await sock.sendMessage(jid, {
        text: "⚠️ Atendimento encerrado. Para abrir um novo chamado, digite *menu*.",
      });
      return;
    }

    if (texto === "menu") {
      delete conversas[jid];
      delete chamados[jid];
      await sock.sendMessage(jid, { text: gerarMenu(nome) });
      return;
    }

    if (!conversas[jid]) {
      if (setores[texto]) {
        const opcao = setores[texto];
        conversas[jid] = { estado: "aguardando_descricao", opcao: texto };
        await sock.sendMessage(jid, {
          text: `✅ Você escolheu: *${opcao.descricao}*.\nPor favor, conte um pouco mais sobre o problema para que possamos ajudar melhor.`,
        });
      } else {
        await sock.sendMessage(jid, { text: gerarMenu(nome) });
      }
      return;
    }

    if (conversas[jid]?.estado === "aguardando_descricao") {
      const descricaoProblema = textoRaw.trim();
      if (!descricaoProblema) {
        await sock.sendMessage(jid, {
          text: "🙋‍♂️ Ainda não recebi a descrição do problema. Por favor, conte um pouco mais para que eu possa ajudar.",
        });
        return;
      }
      conversas[jid].descricaoProblema = descricaoProblema;
      conversas[jid].estado = "aguardando_setor";
      await sock.sendMessage(jid, {
        text: "Ótimo! Agora, para continuar, por favor me informe o setor onde você trabalha.",
      });
      return;
    }

    if (conversas[jid]?.estado === "aguardando_setor") {
      const setorUsuario = normalizeText(textoRaw);
      if (!setoresValidos.includes(setorUsuario)) {
        await sock.sendMessage(jid, {
          text: `⚠️ Ops, não reconheci o setor informado.\n\nPor favor, escolha um dos setores abaixo:\n${listarSetoresEstilizado()}`,
        });
        return;
      }
      conversas[jid].setorUsuario = setorUsuario;
      conversas[jid].estado = "aguardando_ip";

      await sock.sendMessage(jid, {
        text:
          "Perfeito! Agora, por favor, informe o IP da sua máquina.\n\n" +
          "⚠️ *Importante:* Você pode encontrar o IP assim:\n" +
          "No ícone oculto da barra de tarefas, procure pelo aplicativo *Win VNC* — lá seu IP estará visível.\n\n" +
          "🌐 Exemplo de IP: 192.168.0.0\n\n" +
          "Se precisar de ajuda, é só falar conosco, estamos aqui para ajudar! 😊",
      });

      return;
    }

    if (conversas[jid]?.estado === "aguardando_ip") {
      const ipUsuario = textoRaw.trim();

      if (!validarIP(ipUsuario)) {
        // IP inválido, pede confirmação para continuar e já envia dica, só 1 vez
        conversas[jid].estado = "confirmar_ip_invalido";
        conversas[jid].ipTentativa = ipUsuario;
        await sock.sendMessage(jid, {
          text:
            `⚠️ O IP informado "${ipUsuario}" parece inválido.\n\n` +
            `Antes de prosseguir, aqui vai uma dica rápida para encontrar o IP correto:\n` +
            `📌 No Windows, pressione Win + R, digite "cmd" e no prompt digite "ipconfig". ` +
            `Procure pelo "Endereço IPv4".\n\n` +
            `Não achou? ou o computador nao liga? Digite *sim* para abrir chamado com IP invalido ou *não* para enviar o IP correto.`,
        });
        return;
      }

      // IP válido, cria chamado normalmente
      conversas[jid].ip = ipUsuario;

      const opcao = setores[conversas[jid].opcao];
      const protocolo = gerarProtocolo();
      const descricaoProblema = conversas[jid].descricaoProblema;
      const setorUsuario = conversas[jid].setorUsuario;

      const novoChamado = {
  timestamp: new Date().toISOString(),
  nome,
  jid,
  setor: setorUsuario,
  ip: ipUsuario,
  problema: `${opcao.descricao} - ${descricaoProblema}`,
  protocolo,
  resposta: `Protocolo: ${protocolo}`,
};


      let historico = [];
      try {
        if (fs.existsSync(historicoPath)) {
          historico = JSON.parse(fs.readFileSync(historicoPath, "utf-8"));
        }
      } catch (err) {
        console.error("Erro ao ler histórico:", err);
      }

      historico.push(novoChamado);

      try {
        fs.writeFileSync(
          historicoPath,
          JSON.stringify(historico, null, 2),
          "utf-8"
        );
        console.log("✅ Chamado do WhatsApp salvo:", novoChamado);
      } catch (err) {
        console.error("Erro ao salvar chamado:", err);
      }

      await enviarMensagemGrupo(novoChamado);

      chamados[jid] = {
        protocolo,
        setor: setorUsuario,
        ip: ipUsuario,
        problema: `${opcao.descricao} - ${descricaoProblema}`,
      };

      let resposta =
  `✅ Chamado criado com sucesso!\n\n` +
  `📂 Setor: ${setorUsuario.charAt(0).toUpperCase() + setorUsuario.slice(1)}\n` +
  `🌐 IP: ${ipUsuario}\n` +
  `🔢 Número do chamado: ${protocolo}\n` +
  `📆 ${new Date().toLocaleString("pt-BR")}\n\n`;

if (opcao.sugestao) {
  resposta += `🔎 Sugestão rápida:\n${opcao.sugestao}\n\n`;
}

resposta +=
  "Se o problema continuar, não se preocupe — um atendente entrará em contato com você em breve.\n" +
  "E lembre-se: digite *menu* a qualquer momento para abrir novos chamados ou obter ajuda.";

    await sock.sendMessage(jid, { text: resposta });


      conversas[jid] = { estado: "finalizado" };
      await sock.sendMessage(jid, { text: resposta });
      limparConversaTimeout(jid);
      return;
    }

    if (conversas[jid]?.estado === "confirmar_ip_invalido") {
      const resposta = texto.trim().toLowerCase();

      if (resposta === "sim") {
  const opcao = setores[conversas[jid].opcao];
  const protocolo = gerarProtocolo();
  console.log("Protocolo gerado no IP inválido:", protocolo); // DEBUG

  const descricaoProblema = conversas[jid].descricaoProblema;
  const setorUsuario = conversas[jid].setorUsuario;
  const ipUsuario = conversas[jid].ipTentativa;

  const novoChamado = {
  timestamp: new Date().toISOString(),
  nome,
  jid,
  setor: setorUsuario,
  ip: ipUsuario,
  problema: `${opcao.descricao} - ${descricaoProblema}`,
  protocolo,
  resposta: `Protocolo: ${protocolo}`,
};



       let historico = [];
try {
  if (fs.existsSync(historicoPath)) {
    historico = JSON.parse(fs.readFileSync(historicoPath, "utf-8"));
  }
} catch (err) {
  console.error("Erro ao ler histórico:", err);
}

historico.push(novoChamado);

try {
  fs.writeFileSync(
    historicoPath,
    JSON.stringify(historico, null, 2),
    "utf-8"
  );
  console.log("✅ Chamado salvo (IP inválido):", novoChamado);
} catch (err) {
  console.error("Erro ao salvar chamado:", err);
}

        await enviarMensagemGrupo(novoChamado);

        chamados[jid] = {
          protocolo,
          setor: setorUsuario,
          ip: ipUsuario,
          problema: `${opcao.descricao} - ${descricaoProblema}`,
        };
  let respostaFinal = `✅ *Chamado criado com sucesso!*

📂 Setor: ${setorUsuario.charAt(0).toUpperCase() + setorUsuario.slice(1)}
🌐 IP: ${ipUsuario} (IP inválido informado)
🔢 Número do chamado: ${protocolo}
📅 Data e hora: ${new Date().toLocaleString("pt-BR")}`;

if (opcao.sugestao) {
  respostaFinal += `

🔎 Sugestão rápida:
${opcao.sugestao}`;
}

respostaFinal += `

Se o problema persistir, fique tranquilo — um atendente entrará em contato com você em breve.
Para abrir novos chamados ou obter ajuda, digite *menu* a qualquer momento.`;

await sock.sendMessage(jid, { text: respostaFinal });
        // Após salvar o chamado

        conversas[jid] = { estado: "finalizado" };
        limparConversaTimeout(jid);
        return;
      } else if (resposta === "não" || resposta === "nao") {
        conversas[jid].estado = "aguardando_ip";
        delete conversas[jid].ipTentativa;
        await sock.sendMessage(jid, {
          text: "Por favor, envie o IP correto da máquina.",
        });
        return;
      } else {
        await sock.sendMessage(jid, {
          text: "Por favor, responda apenas com *sim* ou *não*.",
        });
        return;
      }
    }
  });
}

// index.js (bot)
import express from "express";
const app = express();
app.use(express.json());

app.post("/send-whatsapp-group", async (req, res) => {
  const { grupo, mensagem } = req.body;
  if (!global.sock) return res.status(503).json({ error: "Bot não conectado" });

  try {
    await global.sock.sendMessage(grupo, { text: mensagem });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

const PORT = 0;
app.listen(PORT, () => console.log(`Bot API rodando na porta ${PORT}`));

startBot();
