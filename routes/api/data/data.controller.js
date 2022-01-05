const Model = require('./data.model');
const {parseQuery} = require('../../helpers')

exports.findByDay = async (req, res, next) => {
    try {
        console.log(req.query.day)
        const result = await Model.findOne({day: req.query.day})
        res.json({
            message: 'Ok',
            data: result
        })
    } catch (error) {
        next(error)
    }
}

exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = Model.countDocuments(where);
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
<<<<<<< HEAD
        const results = await Model.findById(req.params.id);
        res.json({
            data: results,
            message: 'Ok'
        })
=======
        
>>>>>>> a8b076e... get harga
    } catch (error) {
        next(error)
    }
}

<<<<<<< HEAD
exports.insert = async (req, res, next) => {
    const data = req.body;
    try {
        const results = await Model.create(data);
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = req.body;
    try {
        const results = await Model.findByIdAndUpdate(id, data, {new: true}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    const data = req.body;
    try {
        const results = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.deleteMany(where).exec();
        res.json({
            data: results,
            message: 'OK'
        })
    } catch (error) {
        next(error);
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const results = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}
=======
>>>>>>> a8b076e... get harga
