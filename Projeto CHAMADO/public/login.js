document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Por favor, preencha usuário e senha.");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      sessionStorage.setItem("usuarioLogado", username);  // <<<<<<<<<<<<<<<<<<
      window.location.href = "/painel";
    } else {
      alert(data.message || "Usuário ou senha inválidos.");
    }
  } catch (error) {
    console.error("Erro na requisição:", error);
    alert("Erro de comunicação com o servidor.");
  }
});
