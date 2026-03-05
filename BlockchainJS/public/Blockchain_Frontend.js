document.addEventListener("DOMContentLoaded", function() {
    const botaoMinerar = document.getElementById("minerar");
    const botaoCriarCarteira = document.getElementById("criar_carteira");
    const botaoInserirTransacao = document.getElementById("inserir_transacao");
    const botaoBuscarCadeia = document.getElementById("buscar_cadeia");
    const botaoValidarCadeia = document.getElementById("validar_cadeia");
    const botaoConsultarSaldo = document.getElementById("consultar_saldo");
    
    const outputDiv = document.getElementById("output");

    botaoMinerar.addEventListener("click", function() {
        const hash_carteira = prompt("Informe o hash da carteira para receber a recompensa:");
        if (!hash_carteira) {
            alert("Você precisa fornecer um hash de carteira para minerar.");
            return;
        }
        fetch(`/minerar?hash_carteira=${encodeURIComponent(hash_carteira)}`, { method: "GET" })
        .then(response => response.json())
        .then(data => {
            if (data.mensagem) {
                outputDiv.innerHTML = `<p>${data.mensagem}</p>`;
                if (data.bloco) {
                    outputDiv.innerHTML += `<p>Índice: ${data.bloco.index}</p><p>Hash: ${data.bloco.hash}</p>`;
                }
            }
        })
        .catch(error => {
            console.error("Erro ao minerar bloco:", error);
            outputDiv.innerHTML = `<p>Erro ao minerar bloco.</p>`;
        });
    });

    botaoCriarCarteira.addEventListener("click", function() {
        const nome = prompt("Informe o nome para a nova carteira:");
        if (!nome) return;

        fetch("/criar_carteira", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: nome })
        })
        .then(response => response.json())
        .then(data => {
            outputDiv.innerHTML = `<p>Carteira criada com sucesso! Chave: ${data.chave}</p>`;
        })
        .catch(error => {
            console.error("Erro ao criar carteira:", error);
            outputDiv.innerHTML = `<p>Erro ao criar carteira.</p>`;
        });
    });

    botaoInserirTransacao.addEventListener("click", function() {
        const hash_remetente = prompt("Informe o hash da carteira do remetente:");
        const hash_destinatario = prompt("Informe o hash da carteira do destinatário:");
        const valor = parseFloat(prompt("Informe o valor da transação:"));

        if (!hash_remetente || !hash_destinatario || isNaN(valor)) {
            alert("Informações inválidas. Tente novamente.");
            return;
        }

        fetch("/inserir_transacao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hash_remetente, hash_destinatario, valor })
        })
        .then(response => response.json())
        .then(data => {
            outputDiv.innerHTML = `<p>${data.mensagem}</p>`;
        })
        .catch(error => {
            console.error("Erro ao inserir transação:", error);
            outputDiv.innerHTML = `<p>Erro ao inserir transação.</p>`;
        });
    });

    botaoBuscarCadeia.addEventListener("click", function() {
        fetch("/buscar_cadeia", { method: "GET" })
        .then(response => response.json())
        .then(data => {
            outputDiv.innerHTML = "<h2>Cadeia de Blocos:</h2>";
            data.forEach(bloco => {
                outputDiv.innerHTML += `<div>
                    <h3>Bloco ${bloco.index}</h3>
                    <p>Hash: ${bloco.hash}</p>
                    <p>Hash Anterior: ${bloco.hash_anterior}</p>
                    <p>Prova: ${bloco.prova}</p>
                    <p>Data/Hora: ${bloco.data_hora}</p>
                    <h4>Transações:</h4>
                    ${bloco.transacoes.map(t => `
                        <ul>
                            <li>De: ${t.remetente}\n
                             Para: ${t.destinatario}\n
                              Valor: ${t.valor}</li>
                        </ul>
                    `).join("")}
                </div>`;
            });
        })
        .catch(error => {
            console.error("Erro ao buscar cadeia:", error);
            outputDiv.innerHTML = `<p>Erro ao buscar cadeia.</p>`;
        });
    });

    botaoValidarCadeia.addEventListener("click", function() {
        fetch("/validar_cadeia", { method: "GET" })
        .then(response => response.json())
        .then(data => {
            const validacao = data.validada ? "validada" : "inválida";
            outputDiv.innerHTML = `<p>Cadeia de blocos ${validacao}.</p>`;
        })
        .catch(error => {
            console.error("Erro ao validar cadeia:", error);
            outputDiv.innerHTML = `<p>Erro ao validar cadeia.</p>`;
        });
    });

    botaoConsultarSaldo.addEventListener("click", function() {
        const hash_carteira = document.getElementById("hash_carteira_saldo").value.trim();

        if (!hash_carteira) {
            alert("Você precisa fornecer um hash de carteira.");
            document.getElementById("output_saldo").innerHTML = `<p>Erro: O hash da carteira não pode ser vazio.</p>`;
            return;
        }
        if (!/^[a-f0-9]{32}$/i.test(hash_carteira)) {
            alert("O hash da carteira parece estar em um formato inválido. Por favor, verifique.");
            document.getElementById("output_saldo").innerHTML = `<p>Erro: Formato de hash inválido.</p>`;
            return;
        }
        fetch(`/saldo?hash_carteira=${encodeURIComponent(hash_carteira)}`, { method: "GET" })
        .then(response => response.json())
        .then(data => {
            if (data.mensagem) {
                document.getElementById("output_saldo").innerHTML = `<p>Saldo da carteira: ${data.saldo}</p>`;
            } else {
                document.getElementById("output_saldo").innerHTML = `<p>${data.erro}</p>`;
            }
        })
        .catch(error => {
            console.error("Erro ao consultar saldo:", error);
            document.getElementById("output_saldo").innerHTML = `<p>Erro ao consultar saldo.</p>`;
        });
    });
});