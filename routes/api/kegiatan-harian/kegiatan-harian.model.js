const { Schema, model } = require("mongoose");

const pakanPakaiSchema = new Schema({
    jenisPakan: {type: String, required: true}, 
    beratPakan: {type: Number, required: true}
})

const beratSchema = new Schema({
    beratTimbang: {type: Number, required: true},
    populasi: {type: Number, default: 1}
})

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
    pakanPakai: [pakanPakaiSchema],
    pemusnahan: {
        type: Number,
        required: true
    },
    deplesi: {
        type: Number,
        required: true
    },
    berat: [beratSchema]
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('KegiatanHarian', scheme, 'kegiatan-harian')