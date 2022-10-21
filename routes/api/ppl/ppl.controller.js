const mongoose = require('mongoose');
const { parseQuery } = require('../../helpers');
const Model = require('../peternak/peternak.model')
const kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const PeternakModel = require('../peternak/peternak.model');
const fetch = require('node-fetch')
const Promise = require("bluebird");
const formula = require('../../helpers/formula');
const reducer = (acc, value) => acc + value;
var urlIOT = process.env.IOT_URL
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

exports.findById = async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const ppl = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser isPPLActive')
        const findPeriode = await Periode.aggregate([
            {$match: {ppl: mongoose.Types.ObjectId(req.params.id)}},
            {$sort: {'tanggalAkhir': -1}},
            {$group: {_id: '$_id', id: {$first: '$kandang'}}},
            {$group: {_id: '$id', periode: {$push: '$_id'},}}
        ])
        let dataKandangPeriode = [];
        await Promise.map(findPeriode, async(itemPeriode)=>{
            // const findPeriode = await Periode.findById(x.periode[0])
            const findKandang = await kandang.findOneWithDeleted({_id: itemPeriode._id})
            const countPeriode = await Periode.countDocuments({kandang: itemPeriode._id})
            
            
            if (itemPeriode.periode) {
                // get IP
                var IP = await formula.dailyIP(itemPeriode.periode[0])
                const pendapatanPeternak = await formula.estimateRevenue(itemPeriode.periode[0])
                // console.log(pendapatanPeternak)
                const peternak = await PeternakModel.findById(findKandang.createdBy._id).select('fullname')
                // fund flock iot
                flock = await fetch(`http://${urlIOT}/api/flock/datapool/kandang/` + findKandang._id, {
                    method: 'get',
                    headers: {
                        'Authorization': token,
                        "Content-Type": "application/json" }
                }).then(result => {
                    if (result.ok) {
                        return result.json();
                    }
                });
                dataKandangPeriode.push({
                    idPemilik: findKandang.createdBy ? findKandang.createdBy._id : null,
                    namaPemilik: findKandang.createdBy ? (peternak?.fullname ? peternak.fullname : "Not Registered") : null,
                    idKandang: findKandang._id,
                    namaKandang: findKandang.kode,
                    isIoTInstalled:flock?.data?.flock.length!=0 ? true : false,
                    alamat: findKandang.alamat,
                    kota: findKandang.kota,
                    isActive: findKandang.isActive,
                    jenisKandang: findKandang.tipe ? findKandang.tipe.tipe : null,
                    populasi: findKandang.populasi,
                    periodeEnd: itemPeriode.isEnd,
                    IP: IP,
                    idPeriode: itemPeriode._id,
                    periodeKe: countPeriode,
                    totalPenghasilanKandang: pendapatanPeternak
                });
                
            }
    
            
        })
        res.json({
            detailPPL: ppl,
            totalKandang: dataKandangPeriode.length,
            detailKandang:dataKandangPeriode,
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