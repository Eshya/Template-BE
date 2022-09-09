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
const reducer = (acc, value) => acc + value;
var urlIOT = process.env.DB_NAME === "chckin" ? `iot-production:3103` : `iot-staging:3104`
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
                const penjualan = await Penjualan.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode.periode[0])}},
                    {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
                ])
    
                const dataPakan = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode.periode[0])}},
                    {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                    {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
                ])
    
                const dataDeplesi = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode.periode[0])}},
                    {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
                ])
    
                const getKegiatan = await KegiatanHarian.find({periode: itemPeriode.periode[0]}).sort({'tanggal': -1}).limit(1).select('-periode')
                const latestWeight =  getKegiatan[0] ? await getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
                
    
                const allDeplesi = await dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
                const allKematian = await dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
                
                //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
                const allPakan = await dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
                const deplesi = (findKandang.populasi - (findKandang.populasi - (allDeplesi + allKematian))) * 100 / findKandang.populasi
                const presentaseAyamHidup = 100 - deplesi
                const populasiAkhir = findKandang.populasi - (allDeplesi + allKematian )
                const FCR = allPakan / (populasiAkhir * (latestWeight/1000)) 
                const atas = presentaseAyamHidup * (latestWeight/1000)
                const bawah = FCR*(dataPakan.length-1)
                const IP = (atas / bawah) * 100
               
                // console.log(IP)
                // get total penjualan
                let harian = []
                let flock = []
                let pembelianPakan = 0
                let pembelianOVK = 0
                const getSapronak = await Sapronak.find({periode: itemPeriode.periode[0]});
                for (let i = 0; i < getSapronak.length; i++) {
                    if (getSapronak[i].produk && (getSapronak[i].produk.jenis === 'PAKAN')) {
                        const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                        pembelianPakan += compliment
                    } else {
                        const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                        pembelianOVK += compliment
                    }
                }
                const pembelianDoc = findKandang.populasi * getSapronak[0]?.hargaSatuan
                const getPenjualan = await Penjualan.find({periode: itemPeriode.periode[0]})
                getPenjualan.forEach(x => {
                    harian.push(x.beratBadan * x.harga * x.qty)
                })
                const penjualanAyamBesar = await harian.reduce(reducer, 0);
                const pendapatanPeternak = penjualanAyamBesar - pembelianDoc - pembelianOVK - pembelianPakan
                // console.log(pendapatanPeternak)
                const peternak = await PeternakModel.findById(findKandang.createdBy._id).select('fullname')
                // fund flock iot
                flock = await fetch(`http://${urlIOT}/api/flock/datapool/kandang/` + itemKandang._id, {
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
                    isIoTInstalled:flock.data?.flock.length!=0 ? true : false,
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