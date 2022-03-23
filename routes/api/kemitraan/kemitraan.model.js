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
    province: {
        type: Schema.Types.ObjectId,
        ref: 'Provinces',
        select: true,
        autopopulate: true
    },
    regency: {
        type: Schema.Types.ObjectId,
        ref: 'Regencies',
        select: true,
        autopopulate: true
    },
    districts: {
        type: Schema.Types.ObjectId,
        ref: 'Districts',
        select: true,
        autopopulate: true
    },
},{versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Kemitraan', scheme, 'kemitraan')