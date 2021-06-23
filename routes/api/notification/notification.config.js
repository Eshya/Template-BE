const admin = require('firebase-admin');
const service = require('../../../uploads/chickinappstesting-8d1ad-firebase-adminsdk-g54ck-20ff502a2b.json')

admin.initializeApp({
  credential: admin.credential.cert(service),
  databaseURL: "https://chickinappstesting-8d1ad-default-rtdb.firebaseio.com"
});

module.exports = admin;