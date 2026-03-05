const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    data_hora: { type: String, required: true },
    hash_anterior: { type: String, required: true },
    transacoes: [{
        remetente: String,
        destinatario: String,
        valor: Number
    }],
    prova: { type: Number, required: true },
    hash: { type: String, required: true }
});

module.exports = mongoose.model('Block', blockSchema);
