const { createConnection, Schema, model } = require('mongoose');
const Kemitraan = require('../kemitraan/kemitraan.model');
const dbName = process.env.DB_NAME_AUTH
const mongoString = process.env.MONGO_CONNECTIONSTRING

const options = {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    dbName
}

const scheme = new Schema({
    fullname: {
        type: String,
        required: true,
        select: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        required: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        //select: true,
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
        autopopulate: { maxDepth: 1 },
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
    kemitraanUser: {
        type: Schema.Types.ObjectId,
        ref: Kemitraan, select: true,
        autopopulate: { maxDepth: 1 },
    },
    tokenFCM: {
        type: String,
        default: null
    },
    idFirebase: {
        type: String,
        default: null
    },
    kelola: [{
        type: Schema.Types.ObjectId,
        default: null
    }],
    resetPasswordToken: {
        type: String,
        default: null,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
        select: false
    },
    address: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
    },
    province: {
        type: Schema.Types.ObjectId,
        ref: 'Provinces',
        select: true,
        autopopulate: true
    },
    regency: {
        type: Schema.Types.ObjectId,
        ref: 'Regencies',
        select: true,
        autopopulate: true
    },
    isPPLActive: {
        type: Boolean,
        default: null,
        select: true
    }
}, { timestamps: true, versionKey: false })
scheme.plugin(require('mongoose-autopopulate'));
scheme.plugin(require('mongoose-delete'), { deleteAt: true, overrideMethods: true })
const dbAuth = createConnection(mongoString, options);
module.exports = dbAuth.model('Users', scheme, 'users');