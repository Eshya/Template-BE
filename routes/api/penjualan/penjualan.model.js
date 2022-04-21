const { Schema, model, SchemaType } = require("mongoose");
const scheme = new Schema ({
    periode: {
        type: Schema.Types.ObjectId,
        ref: 'Periode', select: true,
        autopopulate: {maxDepth: 1}
    },
    tanggal: {
        type: Date,
        required: true
    },
    beratBadan: {
        type: Number,
        required: true
    },
    qty: {
        type: Number,
        required: true
    },
    harga: {
        type: Number,
        required: true
    },
    pembeli: String,
    catatan: String
}, {versionKey: false, timestamps: true});
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Penjualan', scheme, 'penjualan');