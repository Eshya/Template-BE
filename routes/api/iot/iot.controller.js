const Model = require('./iot.model')
exports.findByUser = async (req, res, next) => {
    try {
        const data = await Model.getWhere('name', req.user.username)
        res.json({
            result: data,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const data = await Model.getWhereId('id', req.params.id);
        res.json({
            result: data,
            messasge: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findByFlock = async (req, res, next) => {
    try {
        const data = await Model.getFlock(req.params.id)
        res.json({
            result: data,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findUser = async (req, res, next) => {
    try {
        const data = await Model.getUser('name', req.user.username)
        res.json({
            result: data,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.update = async (req, res, next) => {
    try {
        const result = await Model.update('id', req.params.id, req.body);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.delete = async (req, res, next) => {
    try {
        const result = await Model.delete('id', req.params.id);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}