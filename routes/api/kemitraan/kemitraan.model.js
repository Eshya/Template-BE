const { createConnection, Schema, model} = require('mongoose');
const Provinces = require('../province/province.model')
const Regencies = require('../regency/regency.model')
const Districts = require('../districts/districts.model')
// const host = process.env.DB_HOST || '103.31.39.17'
// const dbPort = process.env.DB_PORT || 27018
// const dbName = process.env.DB_NAME_AUTH || 'chickin-auth-stagging'
// const user = process.env.DB_USER || 'chickindb'
// const pass = process.env.DB_PASS || 'IniDBch1ck1n'
// const mongoString = process.env.MONGO_CONNECTIONSTRING || `mongodb://${host}:${dbPort}`

// const options = {
//     useFindAndModify: false,
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
//     dbName,
//     user,
//     pass,
//     auth: {
//         authSource: 'admin'
//     }
// }

// const UsersSchema = new Schema({
//     fullname: {
//         type: String,
//         required: true,
//         select: true,
//     },
//     username: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true,
//     }
// }, {timestamps: true, versionKey: false})

// const dbAuth = createConnection(mongoString, options);
// const Users = dbAuth.model('Users', UsersSchema);

const scheme = new Schema({
    name: {
        type: String,
        required: true
    },
    alamat: String,
    email: {
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    phoneNumber: {
      type: Number,
      required: true
    },
    contactPerson: {
        type: Schema.Types.ObjectId,
        // ref: Users,
        // autopopulate: {maxDepth: 1}
        default: null
    },
    province: {
        type: Schema.Types.ObjectId,
        ref: Provinces,
        select: true,
        autopopulate: true
    },
    regency: {
        type: Schema.Types.ObjectId,
        ref: Regencies,
        select: true,
        autopopulate: true
    },
    districts: {
        type: Schema.Types.ObjectId,
        ref: Districts,
        select: true,
        autopopulate: true
    },
    image: {
        type: String,
    }
},{versionKey: false, timestamps: true})
scheme.plugin(require('mongoose-autopopulate'));
scheme.plugin(require('mongoose-delete'), {deleteAt: true, overrideMethods: true})
module.exports = model('Kemitraan', scheme, 'kemitraan')