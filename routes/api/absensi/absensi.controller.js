const {parseQuery, createError} = require('../../helpers');
const Model = require('./absensi.model');
const mongoose = require('mongoose');
const Periode = require('../periode/periode.model')
const Kandang = require('../kandang/kandang.model')
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
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
Date.prototype.today= function(d){
    this.setHours(0)
    this.setMinutes(1)
    return this;
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
exports.findToday = async (req, res, next) => {
    try {
        // console.log(req.user)
        const createdBy = req.user._id
        const results = await Model.find({createdBy,tanggal:{$gte:new Date().today(),$lt:new Date()}}).sort({ tanggal: -1 });
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
const _findPPL = async (req, isActive) => {
    const user = req.user._id
    const createdBy = req.user._id 
    const token = req.headers['authorization']
    isActive ? isEnd = false : isEnd = true
    const findPeriode = await Periode.aggregate([
        {$match: {ppl: mongoose.Types.ObjectId(user), isActivePPL: isActive}},
        {$sort: {'tanggalAkhir': -1}},
        {$group: {_id: '$_id', id: {$first: '$kandang'}}},
        {$group: {_id: '$id', periode: {$push: '$_id'},}}
    ])
    const map = await Promise.all(findPeriode.map(async (x) => {
        const findKandang = await Kandang.findOneWithDeleted({_id: x._id})
        const findIsVisited = await Model.findOne({createdBy}).sort({ tanggal: -1 });
        let now = new Date().addHours(7);
        const diffDay = dateDiffInDays(new Date(findIsVisited?.tanggal),now)
        return {_id :findKandang._id,kode : findKandang.kode, pplVisitedAlready : diffDay === 0 ? true : false }
    }))
    // const filter = map.filter(x => x.isDeleted === "false")
    return map
}
exports.findKandang = async (req, res, next) => {
    try {
        
        const findActive = await _findPPL(req, true)
        res.json({
            data: findActive,
            message: 'Woke'
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error)
    }
}