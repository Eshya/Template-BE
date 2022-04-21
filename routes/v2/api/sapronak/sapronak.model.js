const { Schema, model} = require('mongoose')
const scheme = new Schema({
    period: {
        type: Schema.Types.ObjectId,
        select: true, ref: 'Period',
        autopopulate: {maxDepth: 1}
    },
    date: {
        type: Date,
        required: true
    },
    notes: String,
    OVKSupply: [{
        type: Schema.Types.ObjectId,
        select: true, ref: 'OVKSupply',
        autopopulate: {maxDepth: 1}
    }],
    feedSupply: [{
        type: Schema.Types.ObjectId,
        select: true, ref: 'FeedSupply',
        autopopulate: {maxDepth: 1}
    }]
}, { versionKey: false, timestapms: true })
scheme.plugin(require('mongoose-autopopulate'))
module.exports = model('Sapronak', scheme, 'sapronak');
