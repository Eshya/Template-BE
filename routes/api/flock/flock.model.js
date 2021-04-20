const { Schema, model } = require("mongoose");
const scheme = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    populasi: {
        type: Number,
        required: true
    },
    keterangan: {
        type: String,
        default: null
    }
}, {versionKey: false, timestamps: true});
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Flock', scheme, 'flock');