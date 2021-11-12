const debug = require('debug')(`${process.env.npm_package_name}:mongoose`);
const chalk = require('chalk');
const mongoose = require('mongoose');
const host = '103.31.39.17'
const dbPort = 27017
// const dbName = 'fortesting'
const dbName = 'chickin'
const user = 'chickindb'
const pass = 'IniDBch1ck1n'
// const host = 'cluster0.ivozh.mongodb.net';
// const dbName = 'chickin';
// const user = 'forSale';
// const pass = 'IniN4manyaP4ssw0rd';
// const mongoString = `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority`;
const mongoString = `mongodb://${host}:${dbPort}`
// const db = mongoose.connection
const db = mongoose.connection

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