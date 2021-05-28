const { Schema, model } = require("mongoose");
const scheme = new Schema({
    iot: {
        type: Number,
        required: true
    },
    flock: {
        type: Schema.Types.ObjectId,
        ref: 'Flock',
        select: true, autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('IotFlock', scheme, 'iot-flock');
