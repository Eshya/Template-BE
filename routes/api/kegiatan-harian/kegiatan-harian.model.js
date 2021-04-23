const { Schema, model } = require("mongoose");
const scheme = new Schema({
    periode: {
        type: Schema.Types.ObjectId,
        ref: 'Periode',
        autopopulate: {maxDepth: 1}
    },
    tanggal: {
        type: Date,
        required: true,
    },
    jenisPakan: {
        type: String,
        required: true
    },
    beratPakan: {
        type: Number,
        required: true
    },
    pemusnahan: {
        type: Number,
        required: true
    },
    beratBadan: {
        type: Number,
        required: true
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('KegiatanHarian', scheme, 'kegiatan-harian')