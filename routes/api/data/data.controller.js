const Model = require('./data.model');
const {parseQuery} = require('../../helpers')

exports.findAll = async (req, res, next) => {
    try {
        const {where, limit, offset, sort} = parseQuery(req.query);
        const data = Model.find(where).limit(limit).skip(offset).sort(sort);
        const results = await Promise.all([count, data]);
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        
    } catch (error) {
        next(error)
    }
}

