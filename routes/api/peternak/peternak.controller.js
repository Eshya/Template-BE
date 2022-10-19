const { parseQuery } = require('../../helpers');
const Model = require('./peternak.model')
const Kandang = require("../kandang/kandang.model");
const Periode = require('../periode/periode.model')
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const Promise = require("bluebird");
const mongoose = require('mongoose');
const fetch = require('node-fetch')
const formula = require('../../helpers/formula');
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

function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

exports.findAll =  async (req, res, next) => {
    try {
        const {limit, offset} = parseQuery(req.query);
        const { name, address, phoneNumber } = req.query;
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
        filter.role = "61d5608d4a7ba5b05c9c7ae4";
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { fullname: 1 }
        }

        let count;
        let result = [];
        if (role === "adminkemitraan") {
            const data = await Model.find(filter).sort(sort)
            await Promise.map(data, async (dataItem) => {
                const kandang = await Kandang.find({createdBy: dataItem._id, deleted: false})
                await Promise.map(kandang, async (kandangItem, index) => {
                    // check status peternak
                    let status = false;
                    if (kandangItem.isActive == true) {
                        status = true;
                    }
                    let filterPeriod = {};
                    filterPeriod.kandang = kandangItem.id;
                    filterPeriod.kemitraan = kemitraanId
                    const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
                    if (periode && periode.kandang) {
                        result.push({
                            id: dataItem._id,
                            name: dataItem.fullname,
                            username: dataItem.username,
                            email: dataItem.email,
                            address: dataItem.address,
                            phoneNumber: dataItem.phoneNumber,
                            totalKapasitasKandang: kandang.reduce((a, {populasi}) => a + populasi, 0),
                            status: status ? "Aktif" : "Non Aktif"
                        });
                    }
                });
            });
            const seen = new Set();
            const filteredResult = result.filter(el => {
                const duplicate = seen.has(el.id);
                seen.add(el.id);
                return !duplicate;
            });
            count = filteredResult.length
            result = paginate(filteredResult, limit, (offset + 1))
        } else {
            count = await Model.countDocuments(filter)
            const data = await Model.find(filter).limit(limit).skip(offset).sort(sort)
            await Promise.map(data, async (dataItem) => {
                const kandang = await Kandang.find({createdBy: dataItem._id, deleted: false})
                // check status peternak
                let status = false;
                if (kandang.some(e => e.isActive === true)) {
                    status = true
                }
                result.push({
                    id: dataItem._id,
                    name: dataItem.fullname,
                    username: dataItem.username,
                    email: dataItem.email,
                    address: dataItem.address,
                    phoneNumber: dataItem.phoneNumber,
                    totalKapasitasKandang: kandang.reduce((a, {populasi}) => a + populasi, 0),
                    status: status ? "Aktif" : "Non Aktif"
                });
            });
        }

        res.json({
            message: 'Ok',
            length: count,
            data: result
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const peternak = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber')
        const kandang = await Kandang.find({createdBy: req.params.id, deleted: false})
        let dataKandang = [];
        await Promise.map(kandang, async (itemKandang) => {
            const periode = await Periode.findOne({kandang: itemKandang._id}).sort({ createdAt: -1 })
            let dataKandangPeriode = [];
            let dataPeriode = [];
            let IP;
            let pendapatanPeternak;
            let flock = [];
            if (periode && periode.kandang) {
                IP = await formula.dailyIP(periode._id)
                // get total penjualan
                pendapatanPeternak = await formula.estimateRevenue(periode._id)
                // get periode ke
                const kandang = await Periode.find({kandang: periode.kandang._id}).sort('tanggalMulai')
                await Promise.map(kandang, async (itemKandang, index) => {
                    if (itemKandang._id.toString() === periode._id.toString()) {
                        dataPeriode.push(index + 1);
                    }
                });
                
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
                
            }
            dataKandangPeriode.push({
                idPemilik: itemKandang.createdBy ? itemKandang.createdBy._id : null,
                namaPemilik: itemKandang.createdBy ? itemKandang.createdBy.fullname : null,
                idKandang: itemKandang._id,
                namaKandang: itemKandang.kode,
                isIoTInstalled:flock.data?.flock.length!=0 ? true : false,
                alamat: itemKandang.alamat,
                kota: itemKandang.kota,
                isActive: itemKandang.isActive,
                jenisKandang: itemKandang.tipe ? itemKandang.tipe.tipe : null,
                kapasitas: itemKandang.populasi,
                periodeEnd: periode ? periode.isEnd : false,
                IP: periode ? IP : 0,
                idPeriode: periode ? periode._id : "",
                periodeKe: periode ? dataPeriode[0] : 0,
                totalPenghasilanKandang: periode ? pendapatanPeternak : 0,
            });
            dataKandang.push(dataKandangPeriode[0]);
        });

        res.json({
            detailPeternak: peternak,
            totalKandang: dataKandang.length,
            detailKandang: dataKandang,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}