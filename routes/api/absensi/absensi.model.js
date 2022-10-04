const { Schema, model } = require("mongoose");
const AbsensiImage = require('../absensi-image/absensi-image.model')
const Kandang = require('../kandang/kandang.model')
const scheme = new Schema({
    namaKandang: {
        type: String,
        required: true
    },
    idKandang: {
        type: Schema.Types.ObjectId,
        ref: Kandang, select: true,
        autopopulate: {maxDepth: 1},
        default: null
    },
    lokasiPPL: {
        type: String,
        required: true
    },
    jamKunjungan: {
        type: String,
        required: true
    },
    tanggal: {
        type: Date,
        required: true
    },
    catatan: {
        type: String,
    },
    fotoKandang: [{
        type: Schema.Types.ObjectId,
        ref: AbsensiImage, select: true,
        autopopulate: {maxDepth: 1},
        default: null
    }],
    fotoRecording: [{
        type: Schema.Types.ObjectId,
        ref: AbsensiImage, select: true,
        autopopulate: {maxDepth: 1},
        default: null
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        default: null
    }
}, {versionKey: false, timestamps: true})
module.exports = model('Absensi', scheme, 'absensi');