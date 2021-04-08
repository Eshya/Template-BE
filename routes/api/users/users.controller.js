const {parseQuery, createError, isDevMode} = require('../../helpers');
const Role = require('../roles/roles.model');
const Model = require('./users.model');
const selectPublic = '-createdAt -updatedAt -password';
const passwordHash = require('password-hash');

const _find = async (req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort(sort);
    if(isPublic){
        data.select(selectPublic);
    }
    const results = await Promise.all([count, data]);
    return {length: results[0], data: results[1]};
}

const _beforeSave = (data) => {
    if(data.password){
        data.password = passwordHash.generate(data.password, {saltLength: 10});
    }
    if(!data.username){
        delete data.username;
    }
    return data;
}

exports.findAll = async (req, res, next) => {
    try {
        const result = await _find(req, false);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

exports.findPublic = async (req, res, next) => {
    try {
        const result = await _find(req, true);
        res.json(result)
    } catch (error) {
        next(error);
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const result = await Model.countDocuments(where).exec();
        res.json({length: result});
    } catch (error) {
        next(error);
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.insert = async (req, res, next) => {
    const data = _beforeSave(req.body);
    try {
        const result = await Model.create(data);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = _beforeSave(req.body)
    try {
        const result = await (await Model.findByIdAndUpdate(id, data, {new: true})).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    const data = _beforeSave(req.body);
    try {
        const result = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const result = await Model.deleteMany(where).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);   
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const result = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        
    }
}