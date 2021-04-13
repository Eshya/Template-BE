const {Schema, model} = require('mongoose');
const scheme = new Schema({
    kode: {
        type: String,
        required: true,
        trim: true
    },
    alamat: {
        type: String,
        required: true
    },
    jumlahFlock: {
        type: Number,
        required: true
    },
    tipe: {
        type: Schema.Types.ObjectId,
        ref: 'TipeKandang', select: true,
        autopopulate: {maxDepth: 1}
    },
    periode: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Periode', select: true,
            autopopulate: {maxDepth: 2},
        }
    ],
    totalPopulasi: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isMandiri: {
        type: Boolean,
        required: true
    },
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Kandang', scheme, 'kandang');