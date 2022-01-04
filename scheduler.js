const cron = require('node-cron')
const Periode = require('./routes/api/periode/periode.model')

async function autoEnd(){
    const now = new Date(Date.now())
    const data = await Periode.find()
}

exports.autoEnd = autoEnd