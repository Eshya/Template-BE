const Model = require('./nekropsi.model')
const {parseQuery} = require('../../helpers');
const {admin} = require('../../../configs/firebase.conf')
const {clearKey} = require('../../../configs/redis.conf')

const _beforeSave = (data) => {
    if(!data.actionPlan1) {
        delete data.actionPlan1
        delete data.actionPlan2
        delete data.actionPlan3
    }
}

const notifConfig = {
    priority: "high",
    timeToLive: 60 * 60 * 24
}

const notification = (message, token) => {
    admin.messaging().sendToDevice(token, message, notifConfig)
    .then(response => {
        console.log(response)
    })
}


exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = Model.countDocuments(where);
        const data = Model.find(where).limit(limit).skip(offset).sort('updatedAt');
        const results = await Promise.all([count, data]);
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        next(error);
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
        const results = Model.create(data);
        clearKey(Model.collection.collectionName);
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
        clearKey(Model.collection.collectionName);
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