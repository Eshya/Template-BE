const { Schema, model } = require("mongoose");

const pakanPakaiSchema = new Schema({
    jenisPakan: {
        type: Schema.Types.ObjectId,
        ref: 'Sapronak',
        autopopulate: {maxDepth: 2}
    }, 
    beratPakan: Number,
    beratZak: {type: Number, required: true}
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
        required: true
    },
    pakanPakai: [pakanPakaiSchema],
    pemusnahan: {
        type: Number
    },
    deplesi: {
        type: Number
    },
    berat: [beratSchema],
    populasi: {
        type: Number,
    },
    catatan: {
        type: String,
    },
    image: {
        type: Schema.Types.ObjectId,
        ref: 'KegiatanImage', select: true,
        autopopulate: {maxDepth: 1},
        default: null
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('KegiatanHarian', scheme, 'kegiatan-harian')