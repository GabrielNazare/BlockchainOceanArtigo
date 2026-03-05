const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    chave: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Wallet', walletSchema);
