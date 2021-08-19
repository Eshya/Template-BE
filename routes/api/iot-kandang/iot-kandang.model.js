const { Schema, model } = require("mongoose");

const scheme = new Schema({
    iot: {
        type: Number,
        required: true,
        unique: true
    },
    kandang: {
        type: Schema.Types.ObjectId,
        ref: 'Kandang',
        select: true, autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('IotKandang', scheme, 'iot-kandang');
