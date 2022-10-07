const {parseQuery} = require('../../helpers');
const Kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Kemitraan = require('../kemitraan/kemitraan.model')
const User = require('../peternak/peternak.model')
const Promise = require("bluebird");
const mongoose = require('mongoose');
const ONE_DAY = 24 * 60 * 60 * 1000;
const fetch = require('node-fetch')
const {clearKey} = require("../../../configs/redis.conf")
// var urlAuth = `https://staging-auth.chickinindonesia.com`
var urlAuth = `${process.env.AUTH_URL}`;
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

function sum( obj ) {
    var sum = 0;
    for( var el in obj ) {
      if( obj.hasOwnProperty( el ) ) {
        sum += parseFloat( obj[el] );
      }
    }
    return sum;
}

function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

function removeDuplicatesData(array) {
    return [...new Set(array)];
}

exports.dashboardKemitraan =  async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const role = req.user.role ? req.user.role.name : '';
        const kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
        const { kemitraan } = req.query;
        const filter = {};
        const resultPeternak = [];
        const resultKandangActive = [];
        
        filter.deleted = false;
        const filterPPL = {};

        const getKandang = await Kandang.find(filter);
        if (getKandang.length) {
            const result = await handleResultKandang(token, getKandang, kemitraan, filterPPL, role, kemitraanId);
            resultPeternak.push(...result.peternak);
            resultKandangActive.push(...result.kandangActive);
        }

        // get total peternak
        const totalPeternak = removeDuplicatesData(resultPeternak)

        // get total PPL
        const totalKemitraan = await User.countDocuments(filterPPL);

        filterPPL.role = '61d5608d4a7ba5b05c9c7ae3';
        filterPPL.deleted = false;

        const totalPPl = await User.countDocuments(filterPPL);
        return res.json({
            totalKandangActive: resultKandangActive.length,
            totalPPL: totalPPl,
            totalPeternak: totalPeternak.length,
            totalKandang: getKandang.length,
            totalKemitraan: totalKemitraan
        })
    } catch (error) {
        next(error)
    }
}

exports.dashboardKemitraanPopulasi =  async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        let role = req.user.role ? req.user.role.name : '';
        let { city, kemitraan } = req.query;
        let filter = {}
        let resultPeriode = [];
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        const getKandang = await Kandang.find(filter);
        const users = await fetch(`${urlAuth}/api/users/`, {
            method: 'GET',
            headers: {'Authorization': token,
            "Content-Type": "application/json"}
        }).then(res => res.json()).then(data => data.data)

        await Promise.map(getKandang, async (dataItem, index) => {
            let filterPeriod = {};
            filterPeriod.kandang = dataItem.id;
            filterPeriod.isEnd = false;

            if (kemitraan) {
                filterPeriod.kemitraan = kemitraan
            }
            let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
            if (role === "adminkemitraan") {
                filterPeriod.kemitraan = kemitraanId
            }

            let periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
            if (periode && periode.kandang && periode.kemitraan && periode.kandang.createdBy) {
                // get usia
                let now = new Date(Date.now());
                let start = new Date(periode.tanggalMulai);
                let usia = Math.round(Math.abs((now - start) / ONE_DAY))

                //find detail peternak
                const findUser = users.find(user => user._id.toString() === periode.kandang.createdBy.toString())                
                let namaPemilik = findUser ? findUser.fullname : ""
                if (namaPemilik !== "") {
                    resultPeriode.push({
                        usia: usia,
                        populasi: periode.populasi,
                    });
                }
            }
        });

        res.json({
            totalPopulasi: resultPeriode.reduce((a, {populasi}) => a + populasi, 0),
            populasiUsia1: resultPeriode.filter(({usia}) => usia <= 14).reduce((sum, item) => sum + item.populasi, 0),
            populasiUsia2: resultPeriode.filter(({usia}) => usia > 14 && usia <= 30).reduce((sum, item) => sum + item.populasi, 0),
            populasiUsia3: resultPeriode.filter(({usia}) => usia > 30).reduce((sum, item) => sum + item.populasi, 0),
        })
    } catch (error) {
        next(error)
    }
}

/**
 * TODO:
 * Need more improvement for pagination and filter section
*/
exports.dashboardKemitraanKetersediaan =  async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        let role = req.user.role ? req.user.role.name : '';
        let sort = handleQuerySort(req.query.sort)
        let {limit, offset} = parseQuery(req.query);
        let { city, populasiFrom, populasiTo, kemitraan, peternak } = req.query;
        let usiaFrom = req.query.usiaFrom ? req.query.usiaFrom : '';
        let usiaTo = req.query.usiaTo ? req.query.usiaTo : '';
        let bobotFrom = req.query.bobotFrom ? req.query.bobotFrom : '';
        let bobotTo = req.query.bobotTo ? req.query.bobotTo : '';
        let filter = {}
        let resultPeriode = [];
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { createdAt: -1 }
        }

        const dataKandang = await Kandang.find(filter).sort(sort).select('_id');
        const resultPeriods = await handlePeriode(true, token, dataKandang, populasiFrom, populasiTo, kemitraan, req.user, role, usiaFrom, usiaTo, bobotFrom, bobotTo);
        resultPeriode.push(...resultPeriods.filter(result => result));

        let countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
        let countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
        let countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);
        if (peternak) {
            resultPeriode = resultPeriode.filter(item => {
                const owner = item.namaPemilik.toLowerCase().indexOf(peternak.toLowerCase()) > -1;
                const chickenSheds = item.namaKandang.toLowerCase().indexOf(peternak.toLowerCase()) > -1;
                if (owner) {
                    return owner;
                }

                if (chickenSheds) {
                    return chickenSheds
                }
            });

            countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
            countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
            countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);
        }

        let offsetPaging;
        if (offset == 0) {
            offsetPaging = 1
        } else {
            offsetPaging = (offset / 10 + 1)
        }

        const resultPeriodeSort = resultPeriode.sort(dynamicSort("namaPemilik"));
        const resultPagination = paginate(resultPeriodeSort, limit, offsetPaging)

        return res.json({
            count: resultPeriode.length,
            ketersediaan: resultPagination,
            summary: {
                totalPopulasi: Math.ceil(countPopulasi),
                averageUsia: Math.ceil(countUsia),
                averageBobot: Math.ceil(countBobot)
            }
        })
    } catch (error) {
        return res.json({ status: 500, message: error.message})
    }
}

/**
 * TODO:
 * Need more improvement for pagination and filter section
*/
exports.dashboardSalesKetersediaan =  async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        let role = req.user.role ? req.user.role.name : '';
        let sort = handleQuerySort(req.query.sort)
        let {limit, offset} = parseQuery(req.query);
        let { city, populasiFrom, populasiTo, kemitraan, peternak } = req.query;
        let usiaFrom = req.query.usiaFrom ? req.query.usiaFrom : '';
        let usiaTo = req.query.usiaTo ? req.query.usiaTo : '';
        let bobotFrom = req.query.bobotFrom ? req.query.bobotFrom : '';
        let bobotTo = req.query.bobotTo ? req.query.bobotTo : '';
        let filter = {}
        let resultPeriode = []
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { createdAt: -1 }
        }

        const dataKandang = await Kandang.find(filter).sort(sort).select('_id')
        console.log(dataKandang)
        const dataKemitraan = await Kemitraan.countDocuments(filter)

        const resultPeriods = await handlePeriode(true, token, dataKandang, populasiFrom, populasiTo, kemitraan, req.user, role, usiaFrom, usiaTo, bobotFrom, bobotTo);
        
        resultPeriode.push(...resultPeriods.filter(result => result))
        
        let countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
        let countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
        let countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);
        let countKemitraan = resultPeriode.filter((value, index, self) =>index === self.findIndex((t) => (t.IdKemitraan === value.IdKemitraan ))) // es6 magic
        let countKandang = resultPeriode.filter((value, index, self) =>index === self.findIndex((t) => (t.idKandang === value.idKandang ))) // es6 magic
        
        if (peternak) {
            resultPeriode = resultPeriode.filter(item => {
                const findPemilik = item.namaPemilik.toLowerCase().indexOf(peternak.toLowerCase()) > -1;
                const findKandang = item.namaKandang.toLowerCase().indexOf(peternak.toLowerCase()) > -1;
                if (findPemilik) {
                    return findPemilik;
                }

                if (findKandang) {
                    return findKandang
                }

            });

            countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
            countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
            countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);
        }

        let offsetPaging;
        if (offset == 0) {
            offsetPaging = 1
        } else {
            offsetPaging = (offset / 10 + 1)
        }

        const resultPeriodeSort = resultPeriode.sort(dynamicSort("namaPemilik"));
        const paginateResult = paginate(resultPeriodeSort, limit, offsetPaging);

        return res.json({
            count: resultPeriode.length,
            ketersediaan: paginateResult,
            summary: {
                totalPopulasi: Math.ceil(countPopulasi),
                averageUsia: Math.ceil(countUsia),
                averageBobot: Math.ceil(countBobot),
                totalKandang: countKandang.length ,
                totalKemitraan: countKemitraan.length 
            }
        })
        
    } catch (error) {
        return res.json({ status: 500, message: error.message})
    }
}

const handleResultKandang = async(token, getKandang, kemitraan, filterPPL, role, kemitraanId) => {
    const kandangActive = [];
    const peternak = [];
    const users = await fetch(`${urlAuth}/api/users/`, {
        method: 'GET',
        headers: {'Authorization': token,
        "Content-Type": "application/json"}
    }).then(res => res.json()).then(data => data.data);

    await Promise.map(getKandang, async (dataItem, index) => {
        const filterPeriod = {};
        filterPeriod.kandang = dataItem.id;

        if (kemitraan) {
            filterPeriod.kemitraan = kemitraan;
            filterPPL.kemitraanUser = kemitraan;
        }
        if (role === "adminkemitraan") {
            filterPeriod.kemitraan = kemitraanId;
            filterPPL.kemitraanUser = kemitraanId;
        }

        const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 });
        if (periode?.kandang && periode?.kemitraan && periode?.kandang?.createdBy) {
            //find detail peternak
            const findUser = users.find(user => user._id.toString() === periode?.kandang?.createdBy.toString());
            const namaPemilik = findUser ? findUser.fullname : "";
            const idPemilik = findUser ? findUser._id : "";

            if (namaPemilik) {
                if (periode?.kandang?.isActive) {
                    peternak.push(idPemilik);
                    kandangActive.push({
                        periodeId: periode.id,
                        kandangId: periode.kandang.id,
                        user: periode.kandang.createdBy
                    });
                }
            }
        }
    });
    
    return {kandangActive, peternak}
}

const handlePeriode = async(isKemitraan, token, dataKandang, populasiFrom, populasiTo, kemitraan, user, role, usiaFrom, usiaTo, bobotFrom, bobotTo) => {
    const users = await fetch(`${urlAuth}/api/users/`, {
        method: 'GET',
        headers: {'Authorization': token,
        "Content-Type": "application/json"}
    }).then(res => res.json()).then(data => data.data)

    return Promise.map(dataKandang, async (dataItem, index) => {
        const filterPeriod = {};
        const query = { $gte: 0 };
        filterPeriod.kandang = dataItem.id;
        filterPeriod.isEnd = false;
        const checkPopulasiFrom = Number.isInteger(populasiFrom) ? populasiFrom : !parseInt(populasiFrom) ? 0 : parseInt(populasiFrom);
        const checkPopulasiTo = Number.isInteger(populasiTo) ? populasiTo : !parseInt(populasiTo) ? 0 : parseInt(populasiTo);

        if (checkPopulasiFrom > checkPopulasiTo) {
            throw new Error('Populasi awal tidak boleh melebihi populasi akhir')
        }

        if (populasiFrom) {
            query.$gte = checkPopulasiFrom;
        }

        if (populasiTo) {
            query.$lte = checkPopulasiTo;
        }
 
        filterPeriod.populasi = {...query};
        if (kemitraan) {
            filterPeriod.kemitraan = kemitraan;
        }

        const kemitraanId = user.kemitraanUser ? user.kemitraanUser._id : '';
        if (role === "adminkemitraan") {
            filterPeriod.kemitraan = kemitraanId;
        }
        

        const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 }).cache()
        if (periode?.kandang && periode?.kemitraan && periode?.kandang?.createdBy) {
            // get usia
            const now = new Date(Date.now());
            const start = new Date(periode.tanggalMulai);
            const age = Math.round(Math.abs((now - start) / ONE_DAY));

            const query = {periode: periode.id}
            if (isKemitraan) {
                query.berat = { $exists: true, $ne: [] }
            }

            // get weight actual
            const getKegiatan = await KegiatanHarian.findOne(query).sort({'tanggal': -1}).select('-periode')
            /**
             * Sanja Remark
             * Old logic to calculate avg latest weight
             * 
             */
            // let avgLatestWeight = 0;
            // if (getKegiatan) {
            //     let totalBerat = [];
            //     for (let x = 0; x < getKegiatan.berat.length; x++) {
            //         let populasi = 0;
            //         if (getKegiatan.berat[x].populasi == 0) {
            //             populasi = 1;
            //         } else {
            //             populasi = getKegiatan.berat[x].populasi;
            //         }
            //         totalBerat.push(getKegiatan.berat[x].beratTimbang / populasi);
            //     }
            //     const totalberatSum = totalBerat.reduce(function (acc, val) { return acc + val; }, 0);
            //     const bobotResult = totalberatSum / getKegiatan.berat.length;
            //     const bobotFixed = Number.isInteger(bobotResult) ? bobotResult : bobotResult.toFixed(2);
            //     avgLatestWeight = isFinite(bobotFixed) && bobotFixed || 0;
            // }

            const latestWeight = getKegiatan ? getKegiatan.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
            const latestSampling = getKegiatan ? getKegiatan.berat.reduce((a, {populasi}) => a + populasi, 0) : 0
            const totalAvgLatestWeight = latestWeight/latestSampling
            const avgLatestWeight = totalAvgLatestWeight ? totalAvgLatestWeight : 0

            let pushData = false;
            if (usiaFrom && usiaTo && bobotFrom && bobotTo) {
                if (age >= usiaFrom && age <= usiaTo && avgLatestWeight >= bobotFrom && avgLatestWeight <= bobotTo) {
                    pushData = true;
                }
            }

            if (usiaFrom && !usiaTo && !bobotFrom && !bobotTo) {
                if (age >= usiaFrom) {
                    pushData = true;
                }
            }

            if (!usiaFrom && usiaTo && !bobotFrom && !bobotTo) {
                if (age <= usiaTo) {
                    pushData = true;
                }
            }

            if (usiaFrom && usiaTo && !bobotFrom && !bobotTo) {
                if (age >= usiaFrom && age <= usiaTo) {
                    pushData = true;
                }
            }

            if (!usiaFrom && !usiaTo && bobotFrom && !bobotTo) {
                if (avgLatestWeight >= bobotFrom) {
                    pushData = true;
                }
            }

            if (!usiaFrom && !usiaTo && !bobotFrom && bobotTo) {
                if (avgLatestWeight <= bobotTo) {
                    pushData = true;
                }
            }

            if (!usiaFrom && !usiaTo && bobotFrom && bobotTo) {
                if (avgLatestWeight >= bobotFrom && avgLatestWeight <= bobotTo) {
                    pushData = true;
                }
            }

            if (usiaFrom === "" && usiaTo === "" && bobotFrom === "" && bobotTo === "") {
                pushData = true;
            }
            let flock = [];
            flock = await fetch(`http://${urlIOT}/api/flock/datapool/kandang/` + periode.kandang.id, {
                method: 'get',
                headers: {
                    'Authorization': token,
                    "Content-Type": "application/json" }
            }).then(result => {
                if (result.ok) {
                    return result.json();
                }
            })
            // filter adminaftersales -> block if flock not detected
            if (role === "adminaftersales" && flock.data?.flock.length===0){
                pushData = false;
                
            }
            
            if (pushData) {
                

                //find detail peternak
                const findUser = users.find(user => user._id.toString() === periode?.kandang?.createdBy.toString());
                const namaPemilik = findUser ? findUser.fullname : "";
                const namaPemilikSTR = namaPemilik.toLowerCase().replace(/\b[a-z]/g, (letter) => {
                    return letter.toUpperCase();
                });

                if (!namaPemilik) {
                    return
                }

                return({
                    idKandang: periode.kandang.id,
                    namaKandang: periode.kandang.kode,
                    isIoTInstalled:flock?.data?.flock.length!=0 ? true : false,
                    kota: periode.kandang.kota,
                    DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                    bobot: avgLatestWeight,
                    usia: age,
                    populasi: periode.populasi,
                    IdKemitraan: periode.kemitraan ? periode.kemitraan.id : null,
                    namaKemitraan: periode.kemitraan ? periode.kemitraan.name : "",
                    idPemilik: periode.kandang.createdBy ? periode.kandang.createdBy._id : null,
                    namaPemilik: namaPemilikSTR,
                });
            }
        }
    });
}

