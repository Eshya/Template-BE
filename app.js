require('dotenv').config()
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs')
const cron = require('node-cron');
const fetch = require('node-fetch');

const cors = require('cors');
const db = require('./configs/db.conf');

// const serverkey = require('./uploads/fcm-key-80953-firebase-adminsdk-zim0e-e7af1e28bb.json');

// const FCM = require('fcm-node');
// const fcm = new FCM(serverkey);

db.connect();

const compression = require('compression');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const staticFile = 'public';
const passport = require('passport');

var app = express();

app.use(logger('dev'));
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'blsnhfou34fwlekjnfwlkms2ndflkqnnyt',
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 6},
    store: new MongoStore({mongooseConnection: db.connection})
}))
app.use(compression());
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(require('./routes'));
app.use(express.static(path.join(__dirname, staticFile)));

app.use('/robot.txt', (req, res, next) => {
    res.type('text/plain')
    res.send("User-agent: *\nDisallow: /");
})

app.use('/uploads', (req, res, next) => {
    const regex = /((\w+\/)+)(\w+.[a-z]{3,4}$)/gm
    res.sendFile(req.path.replace(regex,'$3'),{root:`./uploads/${req.path.replace(regex,'$1')}`})
})

app.all('/*', (req, res, next) => {
    res.sendFile('index.html', {root: staticFile});
})

app.use((err, req, res) => {
    if(process.env.NODE_ENV ==- 'development'){
        if(err.name == 'mongoError'){
            console.error({message: err.errmsg});
        } else {
            console.error(err);
        }
    }
    if (err.status && err.status!==500) {
        res.status(err.status).send(err);
    } else {
        res.status(500).send({message: 'Internal Server Error'});
    }
})

cron.schedule('35 23 * * *', async() => {
    console.log('running a task');
    await fetch(`${process.env.BE_URL}/api/periode/autoClosingCultivate/`, {
        method: 'POST',
        headers: {'apiKey': `${process.env.BE_API_KEY}`, "Content-Type": "application/json"}
    }).then(res => res.json()).then(data => console.log(data))
}, {
    timezone: "Asia/Jakarta" 
});

// delete image scheduler

const removeFile = (url) => {
    return new Promise((resolve, reject) => {
        fs.unlink(url, err => {
            if(err) reject();
            resolve();
        })
    })
}

function finding(model, image) {
    return new Promise((resolve, reject) => {
        var tempt = []
        model.find().then((results) => {
            for(let i = 0; i < results.length; i++){
                if(results[i].image == null) return delete results[i]
                const element = results[i].image.path
                tempt.push(element);
            }
        })
        setTimeout(() => {
            image.find({path: {$nin: tempt}})
            .then((imageFind) => {
                if(!imageFind.length) return reject(createError(400, 'all image has been deleted!'))
                for (const element of imageFind){
                    const rmFile = removeFile(element.path)
                    const rmData = image.findByIdAndRemove(element._id).exec();
                    resolve([rmFile, rmData])
                }
            })
        }, 2000)
    })
}

module.exports = app;
