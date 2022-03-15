const { Schema, model } = require("mongoose");
const scheme = new Schema({
    name: {
        type: String,
        required: true
    },
    alamat: String,
    email: {
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    phoneNumber: {
      type: Number,
      required: true
    },
    contactPerson: String,
},{versionKey: false, timestamps: true})
module.exports = model('Kemitraan', scheme, 'kemitraan')