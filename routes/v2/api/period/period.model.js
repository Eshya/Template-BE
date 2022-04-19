const {Schema, model} = require('mongoose')
const scheme = new Schema({
    periodName: {
        type: Number,
        default: 1
    },
    chickenShed: {
        type: Schema.Types.ObjectId,
        ref: 'ChickenShed', select: true,
        autopopulate: {maxdepth: 1}
    },
    population: {
        type: Number,
        required: true
    },
    DOC: {
        type: Schema.Types.ObjectId,
        ref: 'Product', select: true,
        autopopulate: {maxdepth: 1}
    },
    priceDOC: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    finishDate: {
        type: Date,
        default: null
    },
    isEnd: {
        type: Boolean,
        default: false
    },
    isPartnership: {
        type: Boolean,
        default: false
    },
    partnership: {
        type: Schema.Types.ObjectId,
        ref: 'Partnership', select: true,
        autopopulate: {maxdepth: 1}
    },
    fieldConsultant: {
        type: Schema.Types.ObjectId,
        required: false
    }
})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Period', scheme, 'period')