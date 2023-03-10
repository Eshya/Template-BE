const { Schema, model } = require("mongoose");
const Sapronak = require('../sapronak/sapronak.model')
const Periode = require('../periode/periode.model')
const KegiatanImage = require('../kegiatan-image/kegiatan-image.model')

const pakanPakaiSchema = new Schema({
    jenisPakan: {
        type: Schema.Types.ObjectId,
        ref: Sapronak,
        autopopulate: {maxDepth: 2}
    }, 
    beratPakan: {type: Number, required: true},
    beratZak: {type: Number, required: true}
})

const ovkPakaiSchema = new Schema({
    jenisOVK: {
        type: Schema.Types.ObjectId,
        ref: Sapronak,
        autopopulate: {maxDepth: 2}
    },
    kuantitas: {type: Number, required: true}
})

const beratSchema = new Schema({
    beratTimbang: {type: Number, required: true},
    populasi: {type: Number, default: 1}
})

const scheme = new Schema({
    periode: {
        type: Schema.Types.ObjectId,
        ref: Periode,
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
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('KegiatanHarian', scheme, 'kegiatan-harian')