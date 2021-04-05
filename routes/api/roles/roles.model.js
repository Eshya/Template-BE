const {Schema, model} = require('mongoose');
const scheme = new Schema({
    name: {
        type: String,
        lowercase: true,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        required: false
    }
}, {versionKey: false});
module.exports = model('Roles', scheme, 'roles');