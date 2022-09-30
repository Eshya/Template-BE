const { Schema, model } = require("mongoose");
const scheme = new Schema({
    namaKandang: {
        type: Schema.Types.ObjectId,
        ref: Kandang,
        autopopulate: {maxDepth: 1}
    },
    tanggal: {
        type: Date,
        required: true
    },
    pakanPakai: [pakanPakaiSchema],
    ovkPakai: [ovkPakaiSchema],
    pemusnahan: {
        type: Number,
        required: true
    },
    deplesi: {
        type: Number,
        required: true
    },
    berat: [beratSchema],
    populasi: {
        type: Number,
    },
    catatan: {
        type: String,
    },
    image: [{
        type: Schema.Types.ObjectId,
        ref: KegiatanImage, select: true,
        autopopulate: {maxDepth: 1},
        default: null
    }]
}, {versionKey: false, timestamps: true})
module.exports = model('Absensi', scheme, 'absensi');