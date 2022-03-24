const {Schema, model} = require('mongoose')
const scheme = new Schema({
    app_version: {
        type: String,
        required: true
    },
    is_mandatory: {
        type: Boolean,
        default: false
    }
}, {timestamps: false, versionKey: false})
module.exports = model('Version', scheme, 'version')