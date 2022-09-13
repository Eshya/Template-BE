const {parseQuery} = require('../../helpers');
const Kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const User = require('../peternak/peternak.model')
const Promise = require("bluebird");
const ONE_DAY = 24 * 60 * 60 * 1000;
const fetch = require('node-fetch')
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
        let { city, populasi, kemitraan, peternak } = req.query;
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

        let dataKandang = await Kandang.find(filter).sort(sort);
        await Promise.map(dataKandang, async (dataItem, index) => {
            let filterPeriod = {};
            filterPeriod.kandang = dataItem.id;
            filterPeriod.isEnd = false;

            if (populasi === '10000') {
                filterPeriod.populasi = {$gte: 0, $lte: 10000}
            } else if (populasi === '20000') {
                filterPeriod.populasi = {$gte: 10001, $lte: 20000}
            } else if (populasi === '30000') {
                filterPeriod.populasi = {$gte: 20001, $lte: 30000}
            } else if (populasi === '40000') {
                filterPeriod.populasi = {$gte: 30001, $lte: 40000}
            } else if (populasi === '50000') {
                filterPeriod.populasi = {$gte: 40001, $lte: 50000}
            } else if (populasi === '50001') {
                filterPeriod.populasi = {$gte: 50001}
            }

            if (kemitraan) {
                filterPeriod.kemitraan = kemitraan
            }
            let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
            if (role === "adminkemitraan") {
                filterPeriod.kemitraan = kemitraanId
            }

            const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
            if (periode && periode.kandang && periode.kemitraan && periode.kandang.createdBy) {
                // get usia
                let now = new Date(Date.now());
                let start = new Date(periode.tanggalMulai);
                let age = Math.round(Math.abs((now - start) / ONE_DAY))

                // get weight actual
                let getKegiatan = await KegiatanHarian.findOne({periode: periode.id, berat: { $exists: true, $ne: [] }}).select('-periode').sort({'tanggal': -1})
                let avgLatestWeight = 0;
                if (getKegiatan)  {
                    let totalBerat = [];
                    for (let x = 0; x < getKegiatan.berat.length; x++) {
                        let populasi = 0;
                        if (getKegiatan.berat[x].populasi == 0) {
                            populasi = 1
                        } else {
                            populasi = getKegiatan.berat[x].populasi
                        }
                        totalBerat.push(getKegiatan.berat[x].beratTimbang / populasi)
                    }
                    let totalberatSum = totalBerat.reduce(function(acc, val) { return acc + val; }, 0)
                    let bobotResult = totalberatSum/getKegiatan.berat.length
                    let bobotFixed = Number.isInteger(bobotResult) ? bobotResult : bobotResult.toFixed(2);
                    avgLatestWeight = isFinite(bobotFixed) && bobotFixed || 0;
                }

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

                if (pushData) {
                    //find detail peternak
                    const findUser = await fetch(`https://${urlAuth}/api/users/${periode.kandang.createdBy}`, {
                        method: 'GET',
                        headers: {'Authorization': token,
                        "Content-Type": "application/json"}
                    }).then(res => res.json()).then(data => data.data)

                    let namaPemilik = findUser ? findUser.fullname : ""
                    let namaPemilikSTR = namaPemilik.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                        return letter.toUpperCase();
                    });
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
                    });
                    // console.log(flock.data?.flock.length!=0 ? true : false)
                    if (namaPemilik !== "") {
                        resultPeriode.push({
                            idKandang: periode.kandang.id,
                            namaKandang: periode.kandang.kode,
                            isIoTInstalled:flock.data?.flock.length!=0 ? true : false,
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
            }
        });

        let countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
        let countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
        let countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);
        if (peternak) {
            resultPeriode = resultPeriode.filter(item => item.namaPemilik.toLowerCase().indexOf(peternak) > -1);
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
        next(error)
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
        let { city, populasi, kemitraan, peternak } = req.query;
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

        let dataKandang = await Kandang.find(filter).sort(sort);
        await Promise.map(dataKandang, async (dataItem, index) => {
            let filterPeriod = {};
            filterPeriod.kandang = dataItem.id;
            filterPeriod.isEnd = false;

            if (populasi === '10000') {
                filterPeriod.populasi = {$gte: 0, $lte: 10000}
            } else if (populasi === '20000') {
                filterPeriod.populasi = {$gte: 10001, $lte: 20000}
            } else if (populasi === '30000') {
                filterPeriod.populasi = {$gte: 20001, $lte: 30000}
            } else if (populasi === '40000') {
                filterPeriod.populasi = {$gte: 30001, $lte: 40000}
            } else if (populasi === '50000') {
                filterPeriod.populasi = {$gte: 40001, $lte: 50000}
            } else if (populasi === '50001') {
                filterPeriod.populasi = {$gte: 50001}
            }

            if (kemitraan) {
                filterPeriod.kemitraan = kemitraan
            }
            let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
            if (role === "adminkemitraan") {
                filterPeriod.kemitraan = kemitraanId
            }

            const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
            if (periode && periode.kandang && periode.kemitraan && periode.kandang.createdBy) {
                // get usia
                let now = new Date(Date.now());
                let start = new Date(periode.tanggalMulai);
                let age = Math.round(Math.abs((now - start) / ONE_DAY))

                // get weight actual
                const getKegiatan = await KegiatanHarian.find({periode: periode.id}).sort({'tanggal': -1}).limit(1).select('-periode')
                const latestWeight = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
                const latestSampling = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0
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

                if (pushData) {
                    //find detail peternak
                    const findUser = await fetch(`https://${urlAuth}/api/users/${periode.kandang.createdBy}`, {
                        method: 'GET',
                        headers: {'Authorization': token,
                        "Content-Type": "application/json"}
                    }).then(res => res.json()).then(data => data.data)

                    let namaPemilik = findUser ? findUser.fullname : ""
                    let namaPemilikSTR = namaPemilik.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                        return letter.toUpperCase();
                    });
                    // find flock iot
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
                    });
                    // console.log(flock.data?.flock.length!=0 ? true : false)
                    if (namaPemilik !== "") {
                        resultPeriode.push({
                            idKandang: periode.kandang.id,
                            namaKandang: periode.kandang.kode,
                            isIoTInstalled:flock.data?.flock.length!=0 ? true : false,
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
            }
        });

        let countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
        let countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
        let countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);
        if (peternak) {
            resultPeriode = resultPeriode.filter(item => item.namaPemilik.toLowerCase().indexOf(peternak) > -1);
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

        let resultPeriodeSort = resultPeriode.sort(dynamicSort("namaPemilik"));

        res.json({
            count: resultPeriode.length,
            ketersediaan: paginate(resultPeriodeSort, limit, offsetPaging),
            summary: {
                totalPopulasi: Math.ceil(countPopulasi),
                averageUsia: Math.ceil(countUsia),
                averageBobot: Math.ceil(countBobot)
            }
        })
    } catch (error) {
        next(error)
    }
}