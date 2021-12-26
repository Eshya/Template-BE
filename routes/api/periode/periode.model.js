const { Schema, model } = require("mongoose");
const scheme = new Schema({
    kandang: {
        type: Schema.Types.ObjectId,
        ref: 'Kandang', select: false,
        autopopulate: {maxdepth: 1}
    },
    jenisDOC: {
        type: Schema.Types.ObjectId,
        ref: 'JenisDOC', select: true,
        autopopulate: true
    },
    populasi: {
        type: Number,
        required: true
    },
    hargaSatuan: {
        type: Number,
        required: true
    },
    tanggalMulai: {
        type: Date,
        required: true
    },
    tanggalAkhir: {
        type: Date,
        default: null
    },
    isEnd: {
        type: Boolean,
        default: false
    },
    kemitraan: {
        type: Schema.Types.ObjectId,
        ref: 'Kemitraan', 
        transform: o => o == null ? '' : o,
        autopopulate: {maxdepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Periode', scheme, 'periode');