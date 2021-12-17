const express = require('express');
const router = express.Router();
const {projectName, createError} = require('../helpers');
const debug = require('debug')(`${projectName}:api`);
const cron = require('node-cron')

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

module.exports = router;