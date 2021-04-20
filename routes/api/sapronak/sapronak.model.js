const { Schema, model } = require("mongoose");
const scheme = new Schema({
    periode: {
        type: Schema.Types.ObjectId,
        ref: 'Periode',
        autopopulate: { maxDepth: 1 }
    },
    produk: {
        type: Schema.Types.ObjectId,
        ref: 'Produk',
        autopopulate: { maxDepth: 1}
    },
    tanggal: {
        type: Date,
        required: true
    },
    kuantitas: {
        type: Number,
        required: true
    },
    hargaSatuan: {
        type: Number,
        required: true
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Sapronak', scheme, 'sapronak');