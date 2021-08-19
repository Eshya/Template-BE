const {Schema, model} = require('mongoose');
const scheme = new Schema({
    kode: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    alamat: {
        type: String,
        required: true
    },
    tipe: {
        type: Schema.Types.ObjectId,
        ref: 'TipeKandang', select: true,
        autopopulate: {maxDepth: 1}
    },

    // periode: [
    //     {
    //         type: Schema.Types.ObjectId,
    //         ref: 'Periode', 
    //         default: null,
    //         autopopulate: {maxDepth: 1},
    //     }
    // ],
    // flock: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Flock',
    //     autopopulate: {maxDepth: 1}
    // }],
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
module.exports = model('Kandang', scheme, 'kandang');