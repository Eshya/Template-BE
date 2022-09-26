const {Schema, model} = require('mongoose');
const FaqImage = require('../faq-image/faq-image.model')
const scheme = new Schema({
    pertanyaan: {
        type: String,
        required: true
    },
    jawaban: {
        type: String,
        required: true
    },
    image: {
        type: Schema.Types.ObjectId,
        ref: FaqImage, select: true,
        autopopulate: {maxDepth: 1},
        default: null
    }
}, {versionKey: false, timestamps: true});
module.exports = model('Faq', scheme, 'faq')