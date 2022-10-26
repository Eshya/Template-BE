const { Schema, model } = require("mongoose");
const AbsensiImage = require('../absensi-image/absensi-image.model')
const Kandang = require('../kandang/kandang.model')
const PPL = require('../peternak/peternak.model')
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
    lat: {
        type: Number,
        required: true
    },
    long: {
        type: Number,
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
        ref: AbsensiImage, 
        autopopulate: {maxDepth: 1},
        default: null
    }],
    fotoRecording: [{
        type: Schema.Types.ObjectId,
        ref: AbsensiImage, 
        autopopulate: {maxDepth: 1},
        default: null
    }],
    device: {
        id: {
            type: String,
            default: null
        },
        name: {
            type: String,
            default: null
        }
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: PPL, select: true,
        autopopulate: {maxDepth: 1},
        default: null
    },
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Absensi', scheme, 'absensi');