const {Schema, model} = require('mongoose');
const scheme = new Schema({
    pertanyaan: {
        type: String,
        required: true
    },
    jawaban: {
        type: String,
        required: true
    }
}, {versionKey: false, timestamps: true});
module.exports = model('Faq', scheme, 'faq')