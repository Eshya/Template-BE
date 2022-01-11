const {Schema, model} = require('mongoose');
const scheme = new Schema({
    kode: {
        type: String,
        required: true,
        trim: true,
        // unique: true
    },
    alamat: {
        type: String,
        required: true
    },
    kota: {
        type: String,
        required: true
    },
    populasi: {
        type: Number,
        require: true,
    },
    tipe: {
        type: Schema.Types.ObjectId,
        ref: 'TipeKandang', select: true,
        autopopulate: {maxDepth: 1}
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isMandiri: {
        type: Boolean,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
scheme.plugin(require('mongoose-delete'), {deletedAt: true, overrideMethods: 'all'})
module.exports = model('Kandang', scheme, 'kandang');