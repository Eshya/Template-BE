const { default: axios } = require('axios');
const {parseQuery} = require('../../helpers');
const Model = require('./iot-flock.model');
const selectPublic = '-createdAt -updatedAt';

const _find = async(req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort(sort)
    if(isPublic){
        data.select(selectPublic);
    }
    const results = await Promise.all([count, data])
    return {length: results[0], data: results[1]}
}


exports.findAll = async (req, res, next) => {
    try {
        let merged = [];
        let token = req.headers['authorization'];
        const getIot = await axios.get('http://localhost:3002/api/perangkat', {headers: {"Authorization" : token}})
        const results = await _find(req, false);
        const arr1 = getIot.data.result.data

        for(let i = 0; i<arr1.length; i++){
            merged.push({
                ...arr1[i],
                ...(results.data.find((itmInner) => itmInner.iot === arr1[i].id)._doc)
            })
        }
        console.log(merged)
        res.json({
            data: merged,
            message: 'Ok'
        });
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        let merged = [];
        let token = req.headers['authorization'];
        const result = await Model.findById(req.params.id)
        const getIot = await axios.get('http://localhost:3002/api/perangkat/'+result.iot, {headers: {"Authorization" : token}});
        merged.push({...(getIot.data.results[0]), ...result._doc})
        res.json({
            data: merged[0],
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.countDocuments(where).exec();
        res.json({length: results});
    } catch (error) {
        next(error);
    }
}

exports.insert = async (req, res, next) =>{
    const data = req.body
    try {
        const result = await Model.create(data);
        res.json({
            data: result,
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
        const results = await Model.updateMany(where, data, {new: true, upsert: false, multi: false}).exec();
        res.json({data: results, message: 'Ok'});
    } catch (error) {
        next(error);
    }
}

exports.remove = async(req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.deleteMany(where).exec();
        res.json({
            data: results,
            message: 'Ok'
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