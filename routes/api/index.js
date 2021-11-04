const express = require('express');
const router = express.Router();
const {projectName} = require('../helpers');
const debug = require('debug')(`${projectName}:api`);

const fs = require('fs');
const files = fs.readdirSync(__dirname);

files.forEach((endpoint)=> {
    if (endpoint!='index.js') {
        debug(endpoint)
        router.use(`/${endpoint}`, require(`./${endpoint}`));
    }
});

router.get('/', (req, res, next)=>{
  res.send(createError(401, `You're not allowed`));
});

router.post('/verifyRecaptcha', (req, res, next)=>{
  const requestify = require('requestify');
  const url = 'https://www.google.com/recaptcha/api/siteverify';
  const secret = '6Ld8fr4UAAAAAOfNqjT679qqU9qBbegFY11GKNEO';
  const data = {
    secret,
    response: req.body.token,
  };
  requestify.post(url, data, {
    dataType: 'form-url-encoded',
  }).then((response)=>{
    const body = response.getBody();
    res.json(body);
  });
});

const EventEmitter = require('events');
const kandang = require('./kandang/kandang.model');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

myEmitter.on('notifyme', (data) => {
  console.log('a notification occurred!');
  console.log(data);
});

router.post('/webhook', (req, res, next)=> {
  myEmitter.emit('notifyme', req.body);
  res.json(req.body);
});

// myEmitter.emit("update");
// let currentTime = 0;
// setInterval(() => {
//   currentTime++;
//   myEmitter.emit("update", currentTime);
// }, 1000);

// myEmitter.on('update', (time) => {
//   console.log('updated');
//   console.log(`${time}`);
// })

const firebase = require('firebase-admin')
const request = require('request')

module.exports = router;