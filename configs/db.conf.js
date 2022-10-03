const debug = require('debug')(`${process.env.npm_package_name}:mongoose`);
const chalk = require('chalk');
const mongoose = require('mongoose');

/**
 * Tolong jangan di ganti2 
 * GUNAKAN ENVIRONMENT!!
 */

const dbName = process.env.DB_NAME || 'chickin'
const mongoString = process.env.MONGO_CONNECTIONSTRING
const db = mongoose.connection

const options = {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    dbName
}

let initialRetry = 0;
const handleError = (err) => {
    if (err) {
        const { name, errorLabels } = err;
        debug(`${name} : ${errorLabels}`);
        debug(err)
        if (initialRetry < 3) {
            initialRetry++
            debug(chalk.bgCyanBright(`${initialRetry} retry...`));
            setTimeout(() => {
                mongoose.connect(mongoString, options, handleError);
            }, 3000);
        } else if (initialRetry === 3) {
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
    debug(chalk.gray(`Connecting to ${mongoString} with ${options}`));
    mongoose.connect(mongoString, options, handleError);
}

exports.connection = db;