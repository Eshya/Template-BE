const { Schema, model } = require('mongoose');
const scheme = new Schema ({
    tipe: {
        type: String,
        required: true
    }
}, {versionKey: false})
module.exports = model('TipeKandang', scheme, 'tipe-kandang');