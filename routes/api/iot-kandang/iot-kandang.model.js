const { Schema, model } = require("mongoose");

const scheme = new Schema({
    iot: {
        type: Number,
        required: true,
        unique: true
    },
    Periode: {
        type: Schema.Types.ObjectId,
        ref: 'Periode',
        select: true, autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('IotKandang', scheme, 'iot-kandang');
