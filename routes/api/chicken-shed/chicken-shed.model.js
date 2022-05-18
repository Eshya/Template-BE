const { createConnection, Schema, model} = require('mongoose');
const host = process.env.DB_HOST || '103.31.39.17'
const dbPort = process.env.DB_PORT || 27018
const dbName = process.env.DB_NAME_AUTH || 'chickin-auth-stagging'
const user = process.env.DB_USER || 'chickindb'
const pass = process.env.DB_PASS || 'IniDBch1ck1n'
const mongoString = process.env.MONGO_CONNECTIONSTRING || `mongodb://${host}:${dbPort}`

const options = {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    dbName,
    user,
    pass,
    auth: {
        authSource: 'admin'
    }
}

const UsersSchema = new Schema({
    fullname: {
        type: String,
        required: true,
        select: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        select: true,
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
    }
}, {timestamps: true, versionKey: false})

const dbAuth = createConnection(mongoString, options);
const Users = dbAuth.model('Users', UsersSchema);

const scheme = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true
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
    districts: {
        type: Schema.Types.ObjectId,
        ref: 'Districts',
        select: true,
        autopopulate: true
    },
    capacity: {
        type: Number,
        require: true,
    },
    type: {
        type: Schema.Types.ObjectId,
        ref: 'TipeKandang', select: true,
        autopopulate: {maxDepth: 1}
    },
    isActive: {
        type: Boolean,
        default: false
    },
    totalIncome: {
        type: Number,
        require: true,
    },
    lastIncome: {
        type: Number,
        require: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: Users,
        autopopulate: {maxDepth: 1}
    }
}, {versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
scheme.plugin(require('mongoose-delete'), {deleteAt: true, overrideMethods: true})
module.exports = model('ChickenShed', scheme, 'chicken-shed');