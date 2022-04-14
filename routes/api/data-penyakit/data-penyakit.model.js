const { Schema, model } = require("mongoose");
const scheme = new Schema({
    code: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    }
}, {versionKey: false})
scheme.plugin(require('mongoose-delete'), {deleteAt: true, overrideMethods: true})
module.exports = model('data-penyakit', scheme, 'data-penyakit')