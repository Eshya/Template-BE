const {Schema, model} = require('mongoose')
const scheme = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    regency: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    totalIncome: {
        type: Number,
        default: 0
    },
    lastIncome: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true
    },
    images: [{
        type: Schema.Types.ObjectId,
        ref: 'ChickenshedImage',
        select: true,
        autopopulate: {maxDepth: 1}
    }]
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-delete'), {deleteAt: true, overrideMethods: true})
module.exports = model('ChickenShed', scheme, 'chicken-shed')