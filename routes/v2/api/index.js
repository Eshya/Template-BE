const express = require('express')
const router = express.Router()
const {projectName, createError} = require('../../helpers')
const debug = require('debug')(`${projectName}:api`);

const fs = require('fs')
const files = fs.readdirSync(__dirname);

files.forEach((endpoint)=> {
    if (endpoint!='index.js') {
        debug('v2/'+endpoint)
        router.use(`/${endpoint}`, require(`./${endpoint}`));
    }
});

router.get('/', (req, res, next)=>{
  res.send(createError(401, `You're not allowed`));
});

module.exports = router