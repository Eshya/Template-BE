const {Schema, model} = require('mongoose');
const scheme = new Schema({
    name: {
        type: String,
        required: true
    }
}, {versionKey: false})
module.exports = model('JenisDOC', scheme, 'jenis-DOC');