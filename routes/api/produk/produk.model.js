const { Schema, model } = require("mongoose");
const scheme = new Schema({
    merk: {
        type: String,
        required: true,
    },
    jenis: {
        type: String,
        required: true
    }
}, {versionKey: false, timestamps: true})
module.exports = model('Produk', scheme, 'produk')