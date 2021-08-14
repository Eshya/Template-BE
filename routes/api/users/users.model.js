const {Schema, model} = require('mongoose');

const scheme = new Schema({
    fullname: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        unique: true,
        trim: true,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        select: true
    },
    phoneNumber: {
        type: Number,
        required: true
    },
    role: {
        type: Schema.Types.ObjectId,
        ref: 'Roles', select: true,
        autopopulate: true
    },
    image: {
        type: Schema.Types.ObjectId,
        ref: 'UserImage', select: true,
        autopopulate: {maxDepth: 1},
        default: null
    },
    noKTP: {
        type: String,
        default: null
    },
    asalKemitraan: {
        type: String,
        default: null
    },
    tokenFcm: {
        type: String,
        default: null
    },
    idFirebase: {
        type: String,
        default: null
    }
}, {timestamps: true, versionKey: false});
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Users', scheme, 'users');

