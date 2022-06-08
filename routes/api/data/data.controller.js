const Model = require('./data.model');
const {parseQuery} = require('../../helpers')
const Promise = require("bluebird");

exports.findByDay = async (req, res, next) => {
    try {
        // console.log(req.query.day)
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
        const results = await Model.findById(req.params.id);
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

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

exports.findAllDataPool = async (req, res, next) => {
    const {limit, offset} = parseQuery(req.query);
    const { type } = req.query;
    try {
        const count = await Model.countDocuments();
        const data = await Model.find().limit(limit).skip(offset).sort({ day: 1 }).select('day ' + type);
        res.json({
            message: 'Ok',
            length: count,
            data: data
        })
    } catch (error) {
        next(error)
    }
}

exports.updateDataPool = async (req, res, next) => {
    const {type} = req.query;
    const data = req.body;

    let results = []
    await Promise.map(data, async (dataItem) => {
        try {
            const filter = { day: dataItem.day };
            const update = {}
            if (type == "bodyWeight") {
                update.bodyWeight = dataItem.bodyWeight
            }
            if (type == "rgr") {
                update.rgr = dataItem.rgr
            }
            if (type == "deplesi") {
                update.deplesi = dataItem.deplesi
            }
            if (type == "dailyIntake") {
                update.dailyIntake = dataItem.dailyIntake
            }
            if (type == "fcr") {
                update.fcr = dataItem.fcr
            }
            if (type == "ip") {
                update.ip = dataItem.ip
            }

            const result = await Model.findOneAndUpdate(filter, update, {new: true}).exec();
            results.push(result)
        } catch (error) {
            next(error);
        }
    });

    res.json({
        data: results,
        message: 'OK'
    })
}
