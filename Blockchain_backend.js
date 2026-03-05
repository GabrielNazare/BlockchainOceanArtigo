require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

// Modelos
const Wallet = require('./models/Wallet');
const Block = require('./models/Block');
const Transaction = require('./models/Transaction');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Conexão MongoDB
const mongooseOptions = {
    serverSelectionTimeoutMS: 50000,
    family: 4 // Força o IPv4 para evitar bugs do Node no Windows com Atlas
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
    .then(() => console.log('Conectado ao MongoDB...'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

class Carteira {
    constructor(nome) {
        this.nome = nome;
        this.chave = crypto.randomBytes(16).toString('hex');
    }
}

class Blockchain {
    constructor() {
        this.difficulty = 4;
    }

    async adicionar_carteira(carteira) {
        const novaCarteira = new Wallet(carteira);
        return await novaCarteira.save();
    }

    async validar_carteira(hash_carteira) {
        const carteira = await Wallet.findOne({ chave: hash_carteira });
        return !!carteira;
    }

    async buscar_ultimo_bloco() {
        return await Block.findOne().sort({ index: -1 });
    }

    prova_de_trabalho(bloco) {
        let prova = 0;
        let hash = '';
        while (true) {
            const blocoString = JSON.stringify({ ...bloco, prova });
            hash = crypto.createHash('sha256').update(blocoString).digest('hex');
            if (hash.substring(0, this.difficulty) === '0'.repeat(this.difficulty)) {
                break;
            }
            prova++;
        }
        return { prova, hash };
    }

    async adicionar_transacao(hash_remetente, hash_destinatario, valor) {
        const remetenteValido = await this.validar_carteira(hash_remetente);
        const destinatarioValido = await this.validar_carteira(hash_destinatario);

        if (!remetenteValido || !destinatarioValido) {
            return { error: 'Uma ou mais carteiras são inválidas.', index: null };
        }

        const transacao = new Transaction({
            remetente: hash_remetente,
            destinatario: hash_destinatario,
            valor: valor
        });
        await transacao.save();

        const ultimo_bloco = await this.buscar_ultimo_bloco();
        return { mensagem: 'Transação registrada no pool.', index: ultimo_bloco ? ultimo_bloco.index + 1 : 1 };
    }

    async criar_novo_bloco(hash_carteira, hash_anterior = '0') {
        const transacoesPendentes = await Transaction.find();

        const blocoData = {
            index: (await Block.countDocuments()) + 1,
            data_hora: new Date().toISOString(),
            hash_anterior: hash_anterior,
            transacoes: transacoesPendentes.map(t => ({
                remetente: t.remetente,
                destinatario: t.destinatario,
                valor: t.valor
            }))
        };

        // Recompensa de mineração
        blocoData.transacoes.push({
            remetente: 'Sistema',
            destinatario: hash_carteira,
            valor: 10
        });

        const { prova, hash } = this.prova_de_trabalho(blocoData);

        const novo_bloco = new Block({
            ...blocoData,
            prova: prova,
            hash: hash
        });

        await novo_bloco.save();

        // Limpar transações que foram incluídas no bloco
        await Transaction.deleteMany({ _id: { $in: transacoesPendentes.map(t => t._id) } });

        return novo_bloco;
    }

    async cadeia_valida() {
        const cadeia = await Block.find().sort({ index: 1 });
        for (let i = 1; i < cadeia.length; i++) {
            const bloco_atual = cadeia[i];
            const bloco_anterior = cadeia[i - 1];
            if (bloco_atual.hash_anterior !== bloco_anterior.hash) {
                console.log(`Hash anterior inválido no bloco ${bloco_atual.index}`);
                return false;
            }
        }
        return true;
    }
}

const Ocean_Blockchain = new Blockchain();

app.post('/criar_carteira', async (req, res) => {
    const { nome } = req.body;
    if (!nome) return res.status(400).send('Nome é obrigatório.');

    const nova_carteira = new Carteira(nome);
    await Ocean_Blockchain.adicionar_carteira(nova_carteira);

    res.status(201).json({ chave: nova_carteira.chave, nome: nova_carteira.nome });
});

app.post('/inserir_transacao', async (req, res) => {
    const { hash_remetente, hash_destinatario, valor } = req.body;
    const resultado = await Ocean_Blockchain.adicionar_transacao(hash_remetente, hash_destinatario, valor);
    if (resultado.error) {
        return res.status(400).send(resultado.error);
    }
    res.status(201).json({ mensagem: resultado.mensagem });
});

app.get('/minerar', async (req, res) => {
    const hash_carteira = req.query.hash_carteira;

    if (!hash_carteira) {
        return res.status(400).json({ mensagem: 'Hash da carteira não fornecido.' });
    }

    const ultimo_bloco = await Ocean_Blockchain.buscar_ultimo_bloco();
    const hash_anterior = ultimo_bloco ? ultimo_bloco.hash : '0';
    const novo_bloco = await Ocean_Blockchain.criar_novo_bloco(hash_carteira, hash_anterior);

    res.status(200).json({
        mensagem: 'Novo bloco minerado com sucesso',
        bloco: novo_bloco
    });
});


app.get('/saldo', async (req, res) => {
    const hash_carteira = req.query.hash_carteira;
    const carteiraValida = await Ocean_Blockchain.validar_carteira(hash_carteira);

    if (!carteiraValida) {
        return res.status(400).json({ erro: 'Hash de carteira inválido.' });
    }

    let saldo = 0;
    const cadeia = await Block.find();

    cadeia.forEach(bloco => {
        bloco.transacoes.forEach(transacao => {
            if (transacao.destinatario === hash_carteira) {
                saldo += transacao.valor;
            }
            if (transacao.remetente === hash_carteira) {
                saldo -= transacao.valor;
            }
        });
    });

    res.status(200).json({ saldo: saldo, mensagem: 'Consulta de saldo realizada com sucesso.' });
});

app.get('/buscar_cadeia', async (req, res) => {
    const cadeia = await Block.find().sort({ index: 1 });
    res.status(200).json(cadeia);
});

app.get('/validar_cadeia', async (req, res) => {
    const validacao = await Ocean_Blockchain.cadeia_valida();
    res.status(200).json({ validada: validacao });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
