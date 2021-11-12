const admin = require('./notification.config');
const Nekropsi = require('../nekropsi/nekropsi.model');
const Periode = require('../periode/periode.model');

const options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
}

exports.example = async (req, res, next) => {
    const token = req.body.token
    const message = req.body.message
    try {
        const notif = await admin.messaging().sendToDevice(token, message, options)
        res.json({
            data: notif,
            message: "Notification sent successfully"
        })
    } catch (error) {
        next(error);
    }
}

const isValidRequest = (req, res) => {
  if(!req.body || !req.body.endpoint){
    res.status(400)
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({
      error: {
        id: 'no-endpoint',
        message: 'Subscription must have an endpoint'
      }
    }))
    return false
  }
  return true
}
