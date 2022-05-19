const express = require('express');
const router = express.Router();

// router.use('/chicken-shed/v2', require('./v2/chicken-shed'))
// router.use('/period/v2', require('./v2/period'))
// router.use('/sapronak/v2', require('./v2/sapronak'))
// router.use('/data/v2', require('./v2/data'))
// router.use('/daily-activity/v2', require('./v2/daily-activity'))
// router.use('/sales/v2', require('./v2/sales'))
// router.use('/partnership/v2', require('./v2/partnership'))
// router.use('/nekropsi/v2', require('./v2/nekropsi'))

router.use('/api', require('./api'))

module.exports = router;