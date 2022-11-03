const {parseQuery, createError, arrSkip, arrLimit} = require('../../helpers');
const Model = require('./absensi.model');
const PPL = require('../peternak/peternak.model')
const mongoose = require('mongoose');
const Promise = require("bluebird");
const moment = require('moment')
const Periode = require('../periode/periode.model')
const Kandang = require('../kandang/kandang.model')
const {clearKey} = require('../../../configs/redis.conf')
const _MS_PER_DAY = 1000 * 60 * 60 * 24;
const GMT_TIME = 7;
const CACHE_ABSENSI_TIME = 1 * 24 * 60 * 60;
const fetch = require('node-fetch')

let dateDiffInDays = (a, b) => {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}
function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
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
function filterKunjugan(array,search){
    return array.filter(function(arr) {
        let regex = new RegExp(search, 'i')
        if(regex.test(JSON.stringify(arr.namaKandang)))return true;
        else if(regex.test(JSON.stringify(arr.createdBy.fullname)))return true;
        else if(regex.test(JSON.stringify(arr.createdBy.kemitraanUser)))return true;
        else if(regex.test(JSON.stringify(arr.createdBy.kemitraanUser)))return true;
        else return false;
    })
}
Date.prototype.addHours= function(gmt){
    this.setHours(this.getHours()+gmt);
    return this;
}
Date.prototype.today= function(d){
    this.setHours(0)
    this.setMinutes(1)
    return this;
}
Date.prototype.tonight= function(d){
    this.setHours(23)
    this.setMinutes(59)
    return this;
}
exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = Model.countDocuments(where);
        const data = Model.find(where).limit(limit).skip(offset).sort(sort);
        const results = await Promise.all([count, data]);
        res.json({
            message: 'Success',
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
            message: 'Success'
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
        const results = await Model.find({createdBy,tanggal:{$gte:new Date().today(),$lt:new Date().tonight()}}).sort({ tanggal: -1 });
        // console.log(new Date().today())
        // console.log(new Date().tonight())
        res.json({
            data: delCreatorArray(results),
            message: 'Success'
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
            message: 'Success'
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
        data.tanggal = new Date().addHours(GMT_TIME)
        let minutesFormat = data.tanggal.getMinutes() >=10 ? data.tanggal.getMinutes() : '0'+data.tanggal.getMinutes();
        data.jamKunjungan = `${data.tanggal.getHours()}:${minutesFormat} WIB`
        const results = await Model.create(data);
        clearKey(Model.collection.collectionName);
        res.json({
            data: delCreator(results),
            message: 'Success'
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
            message: 'Success'
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
        let findIsVisited;
        let diffDay
        let now = new Date();
        if(findKandang !== null){
             findIsVisited = await Model.findOne({createdBy, idKandang: findKandang._id}).sort({ tanggal: -1 });
             diffDay = dateDiffInDays(new Date(findIsVisited?.tanggal),now)
        }
        else{
            diffDay = 1
        }
        return {_id :findKandang._id,kode : findKandang.kode, pplVisitedAlready : diffDay === 0 ? true : false }
    }))
    // const filter = map.filter(x => x.isDeleted === "false")
    return map
}
exports.findKandang = async (req, res, next) => {
    try {
        
        const findActive = await _findPPL(req, true)
        findActive.push({'_id':null,'kode':'Lainnya','pplVisitedAlready':false})
        res.json({
            data: findActive,
            message: 'Success'
        })
    } catch (error) {
        res.send(createError(501, error.message));
        next(error)
    }
}
exports.findKunjunganHistory = async (req,res,next) =>{
    try {
        let {limit, offset,startDate,endDate,idPPL} = req.query;
        let queryMoongose = new Object()
        const token = req.headers['authorization']
        let newData = []
        if(isNaN(limit))limit=10;
        if(isNaN(offset))offset=0;
        if(idPPL !== undefined)queryMoongose.createdBy=mongoose.Types.ObjectId(idPPL);
        queryMoongose.tanggal = {
            $gte: new Date(startDate).addHours(GMT_TIME).today(),
            $lt: new Date(endDate).addHours(GMT_TIME).tonight()
        }
        let findAbsensi = await Model.find(queryMoongose).sort({ tanggal: -1 }).cache();
        let findAbsensiObject = JSON.parse(JSON.stringify(findAbsensi))
        var results = await Promise.all(findAbsensiObject.map(async(x) => {
            let getImage = await fetch(`${process.env.AUTH_URL}/api/user-image/${x.createdBy.image}`, {
                method: 'GET',
                headers: {'Authorization': token,  "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            x.createdBy.image = getImage;
            return x;
        }))
        let groupByDate = results.reduce((group,value)=>{
            let strTanggal = moment(value.tanggal).add(GMT_TIME,'hours').format('YYYY-MM-DD')
            group[strTanggal] = group[strTanggal] ?? []
            group[strTanggal].push(value)
            return group;
        },{})
        
        Object.keys(groupByDate).forEach(key => {
            let newGroupByDate = new Object()
            newGroupByDate.tanggal =  key;
            newGroupByDate.detail = groupByDate[key]
            newData.push(newGroupByDate)
        });
        
        let offsetPaging;
        if (offset == 0) {
            offsetPaging = 1
        } else {
            offsetPaging = (offset / 10 + 1)
        }
        newData = paginate(newData,parseInt(limit),parseInt(offsetPaging)) 
        res.status(200).json({
            data:newData,
            message:"success",
            status: 200
        })
    } catch (error) {
        res.send(createError(500, error.message));
        next(error)
    }
}

exports.findListPPL = async (req,res,next) =>{
    try {
        const {limit, offset,search} = parseQuery(req.query);
        const filter = {}
        if (search) {
            filter.fullname = new RegExp(search, 'i') 
        }
        if(isNaN(limit)) limit=10;
        if(isNaN(offset)) offset=0;
        filter.role = "61d5608d4a7ba5b05c9c7ae3";
        filter.deleted = false;
        filter.isPPLActive = true
        const listPPL = await PPL.find(filter).limit(limit).skip(offset).collation({locale: "en"}).sort({ fullname: 1 }).select('_id fullname')
        let newData = []
        listPPL.forEach(element=>{
            newData.push({_id:element._id,namaPPL:element.fullname})
        })
        res.status(200).json({
            data:newData,
            message:"success",
            status: 200
        })

    }
    catch (error) {
        res.send(createError(500, error.message));
        next(error)
    }
}

function filterByRef(array1, array2) {
    return array1.filter(object1 => {
      return !array2.some(object2 => {
        return object1._id === object2;
      });
    });
  }

function arrGroup (c) {
    return function group(array) {
        return array.reduce((acc, obj) => {
          const property = obj[c];
          acc[property] = acc[property] || [];
          acc[property].push(obj);
          return acc;
        }, {});
      };
}

exports.findPPLNotAttend = async (req, res, next) => {
    Array.prototype.limit = arrLimit
    Array.prototype.skip = arrSkip
    let {limit, offset} = req.query;
    const token = req.headers['authorization']
    try {
        let tmpPPL = []
        let tmpAttend = []
        let results = []
        const now  = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        let where = `where[isPPLActive]=true`
        if(req.user.role?.name == "adminkemitraan") {
            where = `where[isPPLActive]=true&where[kemitraanUser]=${req.user.kemitraanUser._id}`
        }
        const findPPL = await fetch(`${process.env.AUTH_URL}/api/users?${where}`, {
            method: 'GET',
            headers: {'Authorization': token,  "Content-Type": "application/json"}
        }).then(res => res.json()).then(data => data.data)
        findPPL.forEach(c => {tmpPPL.push(c._id)})
        const findAttendToday = await Model.find({createdBy: tmpPPL, tanggal: {$gte: today}}, {}, {autopopulate: false})
        findAttendToday.forEach(({createdBy}) => tmpAttend.push(createdBy.toString()))
        var unique = tmpAttend.reduce(function (acc, curr) {
            if (!acc.includes(curr))
                acc.push(curr);
            return acc;
        }, []);
        const filter = filterByRef(findPPL, unique)
        filter.forEach(c => {
            results.push({_id: c._id, fullname: c.fullname, image: c.image})
        })
        res.status(200).json({count: results.length, data: results, message: "success", status: res.statusCode})
    } catch (error) {
        res.status(500).json({error: res.statusCode, message: error.message})
        next(error)
    }
}
exports.findKunjungan = async (req, res, next) => {
    try{
        let {limit, offset,tanggal,search} = req.query;
        let queryMoongose = new Object()
        let newData = []
        if(isNaN(limit))limit=10;
        if(isNaN(offset))offset=0;
        if(search===undefined)search="";
        queryMoongose.tanggal = {
            $gte:new Date(tanggal).addHours(GMT_TIME).today(),
            $lt:new Date(tanggal).addHours(GMT_TIME).tonight()
        }
        let findAbsensi = await Model.find(queryMoongose).sort({ tanggal: -1 }).cache()
        let GroupByCreator = findAbsensi.reduce((group,value)=>{
            group[value.createdBy._id] = group[value.createdBy._id] ?? []
            group[value.createdBy._id].push(value)
            return group;
        },{})
        let GroupByCreator2 = JSON.parse(JSON.stringify(GroupByCreator))
        Object.keys(GroupByCreator2).forEach(key=>{
            GroupByCreator2[key].forEach((element,index)=>{
                element.kunjunganKe = index + 1;
                console.log(element)
                newData.push(element)
            })
        })
        let offsetPaging;
        if (offset == 0) {
            offsetPaging = 1
        } else {
            offsetPaging = (offset / 10 + 1)
        }
        
        newData = filterKunjugan(newData,req.user.kemitraanUser?._id); // filter kemitraan
        newData = filterKunjugan(newData,search); // filter query search
        let count = newData.length
        newData = paginate(newData,parseInt(limit),parseInt(offsetPaging)) 
        // findAbsensi.forEach(element =>{

        // })
        console.log(newData)
        return res.send({
                count: count,
                data: newData,
                message: "success",
                status: 200
            })
        // await Promise.map(findAbsensi, async (dataItem, index) => {
        // })
        
    }
    catch(error){
        res.send(createError(500, error.message));
    }
}

exports.kandangNotVisit = async (req, res, next) => {
    Array.prototype.limit = arrLimit
    Array.prototype.skip = arrSkip
    let {limit, offset} = req.query;
    const token = req.headers['authorization']
    try {
        if(isNaN(limit))limit=10;
        if(isNaN(offset))offset=0;
        const tmp = []
        const now  = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const findAttendToday = await Model.find({tanggal: {$gte: today}}).select('tanggal createdBy -fotoRecording -fotoKandang')
        findAttendToday.forEach(({idKandang}) => {
            idKandang?._id ? tmp.push(idKandang?._id) : true
        })
        let where = {isEnd: false, kandang: {$nin: tmp}, isActivePPL: true}
        if(req.user.role?.name == "adminkemitraan") {
            where['kemitraan'] = req.user.kemitraanUser._id
        }
        const findPeriode = await Periode.find(where, {jenisDOC: 0, ppl: 1}).select('kandang')
        const groupPeriode = arrGroup('ppl')
        var results = await Promise.all(Object.keys(groupPeriode(findPeriode)).map(async(x) => {
            const getPPL = await fetch(`${process.env.AUTH_URL}/api/users/${x}`, {
                method: 'GET',
                headers: {'Authorization': token,  "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            const findPPL = mongoose.Types.ObjectId.isValid(x) ? await getPPL : null
            let dataKandang = groupPeriode(findPeriode)[x]
            let jumlahKandang = dataKandang.length
            return {_idPPL: x, namaPPL: findPPL?.fullname, image: findPPL?.image, kandang: dataKandang, jumlahKandang};
        }))
        if (offset == 0) {
            offset = 1
        } else {
            offset = (offset / 10 + 1)
        }
        let totalKandang = results.reduce((a, {jumlahKandang}) => a + jumlahKandang, 0)
        results = paginate(results, parseInt(limit), parseInt(offset))
        res.status(200).json({count: totalKandang, data: results, message: "success", status: res.statusCode})
    } catch (error) {
        res.status(500).json({error: res.statusCode, message: error.message})
        next(error)
    }
}
