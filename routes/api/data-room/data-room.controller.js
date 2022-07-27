const Model = require('./data-room.model')
const {parseQuery} = require('../../helpers')

//required
exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query)
    try {
        const count = Model.countDocuments(where)
        const data = Model.find(where).limit(limit).skip(offset).sort(sort)
        const results = await Promise.all([count, data])
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        next(errot)
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.countDocuments(where)
        res.json({length: results})
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id)
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
        const results = await Model.create(data)
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async(req, res, next) => {
    const id = req.params.id
    const data = req.body
    try {
        const result = await Model.findByIdAndUpdate(id, data, {new: true, upsert: false, multiple: false}).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec()
        res.json({
            data: results,
            mesage: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeById = async(req, res, next) => {
    const id = req.params.id
    try {
        const result = await Model.deleteById(id).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.delete(where).exec()
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findByDate = async (req, res, next) => {
    const day = req.query.day
    const month = req.query.month
    const year = req.query.year
    try {
        let start
        const date = new Date()
        if (!day && !month && year){ start = date.setFullYear(year, 0, 1)}
        if (!day && month) {start = date.setFullYear(year, month-1, 1)}
        if (day && month) {start = date.setFullYear(year, month-1, day)}
        const now = Date.now()
        console.log(new Date(start))
        const results = await Model.aggregate([
            {$match: {'date': {
                $gte: new Date(start),
                $lt: new Date(now)
            }}}
        ])
        res.json({
            data: results,
            mesage: "Ok"
        })
    } catch (error) {
        next(error)
    }
}

exports.findByDepartment = async (req, res, next) => {
    const params = req.params.department
    try {
        const results = await Model.aggregate([
            {$project: {
                date: 1,
                business: params === "business" ? 1 : "$$REMOVE",
                CF: params === "CF" ? 1 : "$$REMOVE",
                CLB: params === "CLB" ? 1 : "$$REMOVE",
                CFS: params === "CFS" ? 1 : "$$REMOVE",
                tech: params === "tech" ? 1 : "$$REMOVE",
            }}
        ])
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}