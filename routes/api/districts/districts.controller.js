const Model = require('./districts.model')
const {parseQuery} = require('../../helpers');

exports.findAll = async (req, res, next) => {
    try {
        const {limit, offset, sort} = parseQuery(req.query);
        const { codeRegency } = req.query;
        const filter = {}
        if (codeRegency) {
            filter.code_regency = codeRegency
        }
        const count = await Model.countDocuments(filter);
        const results = await Model.find(filter).limit(limit).skip(offset).sort(sort);
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