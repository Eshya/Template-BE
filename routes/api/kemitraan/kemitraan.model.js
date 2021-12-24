const { Schema, model } = require("mongoose");
const scheme = new Schema({
    name: {
        type: String,
        required: true
    },
    alamat: String
},{versionKey: false, timestamps: true})
module.exports = model('Kemitraan', scheme, 'kemitraan')