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
    },
    kandang: {
        type: Schema.Types.ObjectId,
        ref: 'Kandang',
        default: null,
        autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true});
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Flock', scheme, 'flock');