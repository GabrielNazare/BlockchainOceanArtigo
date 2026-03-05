const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    remetente: { type: String, required: true },
    destinatario: { type: String, required: true },
    valor: { type: Number, required: true },
    data_hora: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
