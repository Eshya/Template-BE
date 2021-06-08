const admin = require('firebase-admin');
const service = require('../../../uploads/chickinappstesting-8d1ad-firebase-adminsdk-g54ck-c16ee4e2b6.json');

admin.initializeApp({
    credential: admin.credential.cert(service)
})

module.exports = admin;