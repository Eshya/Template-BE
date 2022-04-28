const {parseQuery} = require('../../helpers');
const Kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const User = require('../peternak/peternak.model')
const Promise = require("bluebird");
const ONE_DAY = 24 * 60 * 60 * 1000;

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

exports.dashboardKemitraan =  async (req, res, next) => {
    try {
        let role = req.user.role ? req.user.role.name : '';
        let { kemitraan } = req.query;
        let filter = {}
        let resultKandangActive = [];
        let resultPeternak = [];
        filter.deleted = false;

        let getKandang = await Kandang.find(filter).exec();
        await Promise.map(getKandang, async (dataItem, index) => {
            let filterPeriod = {};
            filterPeriod.kandang = dataItem.id;

            if (kemitraan) {
                filterPeriod.kemitraan = kemitraan
            }
            let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
            if (role === "adminkemitraan") {
                filterPeriod.kemitraan = kemitraanId
            }

            let periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
            if (periode && periode.kandang) {
                if (periode.kandang.createdBy) {
                    resultPeternak.push(periode.kandang.createdBy._id);
                }

                if (periode.kandang.isActive === true) {
                    resultKandangActive.push({
                        periodeId: periode.id,
                        kandangId: periode.kandang.id,
                        user: periode.kandang.createdBy
                    });
                }
            }
        });

        // get total peternak
        let countPeternak = {};
        resultPeternak.forEach(element => {
            countPeternak[element] = (countPeternak[element] || 0) + 1;
        });
        var totalPeternak = sum( countPeternak );

        // get total PPL
        let totalPPl = await User.countDocuments({'role': '61d5608d4a7ba5b05c9c7ae3'}).exec();
        res.json({
            totalKandangActive: resultKandangActive.length,
            totalPPL: role === "superadmin" && !kemitraan ? totalPPl : 0,
            totalPeternak: totalPeternak,
        })
    } catch (error) {
        next(error)
    }
}

exports.dashboardKemitraanPopulasi =  async (req, res, next) => {
    try {
        let role = req.user.role ? req.user.role.name : '';
        let { city, kemitraan } = req.query;
        let filter = {}
        let resultPeriode = [];
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        let getKandang = await Kandang.find(filter).exec();
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
            if (periode && periode.kandang) {
                // get usia
                let now = new Date(Date.now());
                let start = new Date(periode.tanggalMulai);
                let usia = Math.round(Math.abs((now - start) / ONE_DAY))

                resultPeriode.push({
                    usia: usia,
                    populasi: periode.populasi,
                });
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

exports.dashboardKemitraanKetersediaan =  async (req, res, next) => {
    try {
        let role = req.user.role ? req.user.role.name : '';
        let sort = handleQuerySort(req.query.sort)
        let {limit, offset} = parseQuery(req.query);
        let { city, populasi, kemitraan } = req.query;
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

        //let countKandang = await Kandang.countDocuments(filter)
        let dataKandang = await Kandang.find(filter).limit(limit).skip(offset).sort(sort);
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
            if (periode && periode.kandang) {
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
                    resultPeriode.push({
                        namaKandang: periode.kandang.kode,
                        kota: periode.kandang.kota,
                        DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                        bobot: avgLatestWeight,
                        usia: age,
                        populasi: periode.populasi,
                        kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                    });
                }
            }
        });

        let countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
        let countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
        let countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);

        res.json({
            // count: resultPeriode.length,
            ketersediaan: resultPeriode,
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

exports.dashboardSalesKetersediaan =  async (req, res, next) => {
    try {
        let role = req.user.role ? req.user.role.name : '';
        let sort = handleQuerySort(req.query.sort)
        let {limit, offset} = parseQuery(req.query);
        let { city, populasi, kemitraan } = req.query;
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

        //let countKandang = await Kandang.countDocuments(filter)
        let dataKandang = await Kandang.find(filter).limit(limit).skip(offset).sort(sort);
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
            if (periode && periode.kandang) {
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
                    resultPeriode.push({
                        namaKandang: periode.kandang.kode,
                        kota: periode.kandang.kota,
                        DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                        bobot: avgLatestWeight,
                        usia: age,
                        populasi: periode.populasi,
                        kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                    });
                }
            }
        });

        let countPopulasi = resultPeriode.reduce((a, {populasi}) => a + populasi, 0);
        let countUsia = (resultPeriode.reduce((a, {usia}) => a + usia, 0) / resultPeriode.length);
        let countBobot = (resultPeriode.reduce((a, {bobot}) => a + bobot, 0) / resultPeriode.length);

        res.json({
            // count: resultPeriode.length,
            ketersediaan: resultPeriode,
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