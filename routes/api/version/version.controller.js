const Model = require('./version.model')
const {parseQuery} = require('../../helpers')

exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query)
    try {
        const results = await Model.find(where).limit(limit).skip(offset).sort(sort)
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (err) {
        next(err)
    }
}

exports.findById = async (req, res, next) => {
    const id = req.params.id
    try {
        const result = await Model.findById(id)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        data.user = req.user._id
        const result = await Model.create(data)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id
    const data = req.body
    try {
        const results = await Model.findByIdAndUpdate(id, data, {new: true}).exec()
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeById = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Model.findByIdAndRemove(id).exec()
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.checkVersion = async (req, res, next) => {
    const current = req.body.current
    let message
    try {
        const findVersion = await Model.findOne()
        findVersion.app_version === current && findVersion.is_mandatory === true ? message = "FORCE_UPDATE" : (findVersion.app_version !== current && findVersion.is_mandatory === false) ? message = "UPDATE_AVAILABLE" : message = "NO_NEED_UPDATE"
        res.json(message)
    } catch (error) {
        next(error)
    }
}