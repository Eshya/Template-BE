const { Schema, model } = require("mongoose");
const scheme = new Schema ({
    name: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: false
    },
    size: {
        type: Number,
        required: false
    }
}, {timestamps: true, versionKey: false})
module.exports = model('KegiatanImage', scheme, 'kegiatan-image');