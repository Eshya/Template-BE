const {model, Schema} = require('mongoose')
const scheme = new Schema({
    date: {
        type: Date,
        required: true
    },
    business: {
        revenue: {
            value: Number,
            unit: String
        },
        margin: {
            value: Number,
            unit: String
        },
        tonase: {
            value: Number,
            unit: String
        }
    },
    CF: {
        revenue: {
            value: Number,
            unit: String
        },
        margin: {
            value: Number,
            unit: String
        },
        tonase: {
            value: Number,
            unit: String
        }
    },
    CLB: {
        revenue: {
            value: Number,
            unit: String
        },
        margin: {
            value: Number,
            unit: String
        },
        tonase: {
            value: Number,
            unit: String
        }
    },
    CFS: {
        revenue: {
            value: Number,
            unit: String
        },
        margin: {
            value: Number,
            unit: String
        },
        tonase: {
            value: Number,
            unit: String
        },
        farmInputPopulation: {
            value: Number,
            unit: String
        }
    },
    tech: {
        farmers: {
            value: Number,
            unit: String
        },
        farm: {
            value: Number,
            unit: String
        },
        population: {
            value: Number,
            unit: String
        },
        iotInstallation: {
            value: Number,
            unit: String
        }
    }
}, {timestamps: true, versionKey: false})
module.exports = model('Investor', scheme, 'investor');
