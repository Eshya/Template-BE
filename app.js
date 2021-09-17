var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const cors = require('cors');
const db = require('./configs/db.conf');

const serverkey = require('./uploads/fcm-key-80953-firebase-adminsdk-zim0e-e7af1e28bb.json');

const FCM = require('fcm-node');
const fcm = new FCM(serverkey);

db.connect();

const compression = require('compression');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const staticFile = 'public';
const passport = require('passport');

var app = express();

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "",
            version: "0.0.1",
            description: "",
            license: {
                name: "MIT",
                url: "https://spdx.org/licenses/MIT.html",
            },
            contact: {
                name: "",
                url: "",
                email: ""
            }
        },
        servers: [
            {
                url: "http://localhost:3000/api"
            }
        ],
    },
    apis: ["./routes/documentation/*.js"]
}

const specs = swaggerJsDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

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


module.exports = app;
