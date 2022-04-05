const Model = require('./province.model')
const {parseQuery} = require('../../helpers');

exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = await Model.countDocuments(where);
        const results = await Model.find(where).limit(limit).skip(offset).sort(sort);
        res.json({
            message: 'Ok',
            length: count,
            data: results
        })
    } catch (error) {
        next(error);
    }
}

exports.findById = async (req, res, next) => {
    try {
        const results = await Model.findOne({code: req.params.id});
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}