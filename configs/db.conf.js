const debug = require('debug')(`${process.env.npm_package_name}:mongoose`);
const chalk = require('chalk');
const mongoose = require('mongoose');

const host = process.env.DB_HOST || 'localhost'
const dbPort = process.env.DB_PORT || 27017
const dbName = process.env.DB_NAME || 'chickin'
const user = process.env.DB_USER || 'chickindb'
const pass = process.env.DB_PASS || 'IniDBch1ck1n'
const mongoString = process.env.MONGO_CONNECTIONSTRING || `mongodb://${host}:${dbPort}`
const db = mongoose.connection

debug(`${host},${dbPort},${dbName},${user},${pass},${mongoString}`)

const mysql = require('mysql2/promise');
const config = require('./mysql.conf');

async function query(sql, params){
    const connection = await mysql.createConnection(config.db);
    const [result] = await connection.execute(sql, params)
    return result;
}

// const options = {
//     useFindAndModify: false,
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
//     auth: {
//         authdb: 'admin'
//     }
// }



// const user = 'pismgdefuse';
// const pass = '@pisdefuseMG20201qaz';

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
        // authdb: 'admin'
    }
}

let initialRetry = 0;
const handleError = (err) => {
    if (err) {
        const {name, errorLabels} = err;
        debug(`${name} : ${errorLabels}`);
        debug(err)
        if (initialRetry < 3) {
            initialRetry++
            debug(chalk.bgCyanBright(`${initialRetry} retry...`));
            setTimeout(() => {
                mongoose.connect(mongoString, options, handleError);
            }, 3000);
        } else if(initialRetry === 3) {
            debug(chalk.bgCyanBright(`failed to connect db`));
            mongoose.disconnect();
            process.exit(1);
        }
    } else {
        initialRetry = 0;
    }
}

db.once('open', () => {
    debug(chalk.yellow('db connected!'));
})

exports.connect = () => {
    debug(chalk.gray('init db connect.....'));
    mongoose.connect(mongoString, options, handleError);
}

exports.connection = db;
exports.query = query