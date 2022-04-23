const {Schema, model} = require('mongoose')
const scheme = new Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Pakan', 'OVK', 'DOC'],
        required: true
    },
    OVKType: String,
    notes: String,
    image: {
        type: Schema.Types.ObjectId,
        ref: 'ProductImage',
        select: true, autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Product', scheme, 'product')