const admin = require('firebase-admin')

const serviceAccount = require('./chickinappstesting-8d1ad-firebase-adminsdk-g54ck-032e248587.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chickinappstesting-8d1ad-default-rtdb.firebaseio.com"
})

exports.module= admin