const { Schema, model } = require("mongoose");
const scheme = new Schema({
    day: {
        type: Number,
        required: true
    },
    bodyWeight: {
        type: Number,
        required: true
    },
    dailyGain: {
        type: Number,
        required: true
    },
    adg: {
        type: Number,
        required: true
    },
    dailyIntake: {
        type: Number,
        required: true
    },
    cumIntake: {
        type: Number,
        required: true
    },
    fcr: {
        type: Number,
        required: true
    },
    ip: {
        type: Number,
        required: true
    },
    deplesi: {
        type: Number,
        required: true
    },
    rgr: {
        type: Number,
        required: true
    }
}, {versionKey: false, timestamps: true})
module.exports = model('Data', scheme, 'data')