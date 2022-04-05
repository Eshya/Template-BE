const {Schema, model} = require('mongoose');
const scheme = new Schema({
    code: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
}, {versionKey: false});
module.exports = model('Provinces', scheme, 'provinces');