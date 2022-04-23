const {Schema, model} = require('mongoose')
const scheme = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product', select: true,
        autopopulate: {maxDepth: 1}
    },
    quantity: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'))
module.exports = model('FeedSupply', scheme, 'feed-supply')