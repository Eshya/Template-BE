const {parseQuery, createError} = require('../../helpers');
const Model = require('./absensi.model');
const mongoose = require('mongoose');

const _MS_PER_DAY = 1000 * 60 * 60 * 24;
let dateDiffInDays = (a, b) => {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}
function delCreator(obj){
    obj.createdBy = undefined
    obj.idKandang = undefined
    return obj
}
function delCreatorArray(array){
    array.forEach(element => {
        element.createdBy = undefined
        element.idKandang = undefined
    });
    return array
}
exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = Model.countDocuments(where);
        const data = Model.find(where).limit(limit).skip(offset).sort(sort);
        const results = await Promise.all([count, data]);
        res.json({
            message: 'Woke',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error)
    }
}
exports.findById = async (req, res, next) => {
    try {
        // console.log(req.user)
        const createdBy = req.user._id
        const results = await Model.find({createdBy}).sort({ tanggal: -1 });
        res.json({
            data: delCreatorArray(results),
            message: 'Woke'
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error)
    }
}
exports.findIsAbsent = async (req, res, next) => {
    try {
        
        const createdBy = req.user._id
        const results = await Model.findOne({createdBy}).sort({ tanggal: -1 });
        let now = new Date();
        const diffDay = dateDiffInDays(new Date(results?.tanggal),now)
        res.json({
            data: {
                isAbsentAlready: diffDay === 0 ? true : false
            },
            message: 'Woke'
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error)
    }
}
exports.insert = async (req, res, next) => {
    const data = req.body;
    try {
        const createdBy = req.user._id
        data.createdBy=createdBy
        const results = await Model.create(data);
        res.json({
            data: delCreator(results),
            message: 'Woke'
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error)
    }
}
exports.removeById = async (req, res, next) => {
    try {
        const results = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            data: results,
            message: 'Woke'
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error);
    }
}