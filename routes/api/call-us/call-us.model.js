const {Schema, model} = require('mongoose');
const shceme = new Schema({
    sendBy: {
        type: Schema.Types.ObjectId,
        ref: 'Users', select: true,
        autopopulate: {maxDepth: 1}
    },
    message: {
        type: String,
        required: true
    }
}, {versionKey: false, timestamps: true})
module.exports = model('CallUs', shceme, 'call-us');