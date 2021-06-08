const admin = require('./notification.config');

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

// exports.getNotificationSuhu = async (req, res, next) => {
    
//     try {
        
//     } catch (error) {
//         next(error)
//     }
// }