const {Schema, model} = require('mongoose');
const scheme = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
}, {versionKey: false, timestamps: true})
module.exports = model('JenisDOC', scheme, 'jenis-DOC');