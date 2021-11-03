const {Schema, model} = require('mongoose');
const shceme = new Schema({
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, {versionKey: false, timestamps: true})
module.exports = model('CallUs', shceme, 'call-us');