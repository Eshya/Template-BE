const mongoose = require('mongoose');
const { parseQuery } = require('../../helpers');
const Model = require('../peternak/peternak.model')
const kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const handleQuerySort = (query) => {
    try{
      const toJSONString = ("{" + query + "}").replace(/(\w+:)|(\w+ :)/g, (matched => {
          return '"' + matched.substring(0, matched.length - 1) + '":';
      }));
      return JSON.parse(toJSONString);
    }catch(err){
      return JSON.parse("{}");
    }
}

exports.findAll =  async (req, res, next) => {
    try {
        const {limit, offset} = parseQuery(req.query);
        const { name, address, phoneNumber, asalKemitraan, active } = req.query;
        let sort = handleQuerySort(req.query.sort)
        let role = req.user.role ? req.user.role.name : '';
        let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
        const filter = {}
        if (name) {
            filter.fullname = new RegExp(name, 'i') 
        }
        if (address) {
            filter.address = new RegExp(address, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }
        filter.role = "61d5608d4a7ba5b05c9c7ae3";
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { fullname: 1 }
        }

        if (role === "adminkemitraan") {
            filter.kemitraanUser = kemitraanId
        }

        if (active === 'true') {
            filter.isPPLActive = true
        } else if (active === 'false') {
            filter.isPPLActive = false
        }

        const count = await Model.countDocuments(filter)
        const data = await Model.find(filter).limit(limit).skip(offset).sort(sort).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser isPPLActive')

        res.json({
            message: 'Ok',
            length: count,
            data: data
        })
    } catch (error) {
        next(error)
    }
}
const _findPPL = async (req, isActive) => {
    const findPeriode = await Periode.aggregate([
        {$match: {ppl: mongoose.Types.ObjectId(req.params.id), isActivePPL: isActive}},
        {$sort: {'tanggalAkhir': -1}},
        {$group: {_id: '$_id', id: {$first: '$kandang'}}},
        {$group: {_id: '$id', periode: {$push: '$_id'},}}
    ])

    const map = await Promise.all(findPeriode.map(async(x)=>{
        const findPeriode = await Periode.findById(x.periode[0])
        const findKandang = await kandang.findOneWithDeleted({_id: x._id})
        const countPeriode = await Periode.countDocuments({kandang: x._id})
        return {...findKandang.toObject(),periode: findPeriode, urutanKe: countPeriode}
    }))

    return map;

}
exports.findById = async (req, res, next) => {
    try {
        const ppl = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser isPPLActive')
        
        const findActive = await _findPPL(req, true)
        const findUnactive = await _findPPL(req, false)
        console.log(findActive)
        console.log(findUnactive)
        res.json({
            detailPPL: ppl,
            totalKandang: findActive.length + findUnactive.length,
            detailKandang: {
                kelolaAktif:findActive,
                kelolaRehat:findUnactive
            },
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removePPLById = async (req, res, next) => {
    let id = req.params.id;
    try {
        console.log("masuk sini")
        const result = await Model.findByIdAndUpdate(id, {deleted: true, isPPLActive: false}, {new: true}).exec();
        if (!result) {
            res.json({error: 404, message: 'PPL not found.'})
        }
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch(err){
        next(err)
    }
}