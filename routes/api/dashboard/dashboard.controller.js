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

exports.dashboardKemitraan =  async (req, res, next) => {
    try {
        let activeKandang = await Kandang.countDocuments({'isActive': true}).exec();
        let rehatKandang = await Kandang.countDocuments({'isActive': false}).exec();

        let totalPPl = await User.countDocuments({'role': '61d5608d4a7ba5b05c9c7ae3'}).exec();
        let totalPeternak = await User.countDocuments({'role': '61d5608d4a7ba5b05c9c7ae4'}).exec();

        res.json({
            totalKandangActive: activeKandang,
            totalKandangRehat: rehatKandang,
            totalPPL: totalPPl,
            totalPeternak: totalPeternak,
        })
    } catch (error) {
        next(error)
    }
}

exports.dashboardKemitraanPopulasi =  async (req, res, next) => {
    try {
        let { city } = req.query;
        let filter = {}
        let resultPeriode = [];
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        let getKandang = await Kandang.find(filter).exec();
        await Promise.map(getKandang, async (dataItem, index) => {
            let periode = await Periode.findOne({kandang: dataItem._id, isEnd: false}).sort({ createdAt: -1 })
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
        let sort = handleQuerySort(req.query.sort)
        let {limit, offset} = parseQuery(req.query);
        let { city, populasi, kemitraan } = req.query;
        let usia = req.query.usia ? req.query.usia : '';
        let bobot = req.query.bobot ? req.query.bobot : '';
        let filter = {}
        let resultPeriode = [];
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { createdAt: -1 }
        }

        let countKandang = await Kandang.countDocuments(filter)
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
                const avgLatestWeight = latestWeight/latestSampling

                if (usia && bobot) {
                    if (usia === '14' && age <= 14 && bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '14' && age <= 14 && bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '14' && age <= 14 && bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '14' && age <= 14 && bobot === '2001' && avgLatestWeight > 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '2001' && avgLatestWeight > 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '2001' && avgLatestWeight > 2000) {
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
                    return false;
                }

                if (usia) {
                    if (usia === '14' && age <= 14) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 ) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30) {
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

                if (bobot) {
                    if (bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (bobot === '2001' && avgLatestWeight > 2000) {
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

                if (usia === "" && bobot === "") {
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

        res.json({
            //count: resultPeriode.length,
            ketersediaan: resultPeriode
        })
    } catch (error) {
        next(error)
    }
}

exports.dashboardSalesKetersediaan =  async (req, res, next) => {
    try {
        let sort = handleQuerySort(req.query.sort)
        let {limit, offset} = parseQuery(req.query);
        let { city, populasi, kemitraan } = req.query;
        let usia = req.query.usia ? req.query.usia : '';
        let bobot = req.query.bobot ? req.query.bobot : '';
        let filter = {}
        let resultPeriode = [];
        if (city) {
            filter.kota = new RegExp(city, 'i')
        }
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { createdAt: -1 }
        }

        let countKandang = await Kandang.countDocuments(filter)
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
                const avgLatestWeight = latestWeight/latestSampling

                if (usia && bobot) {
                    if (usia === '14' && age <= 14 && bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '14' && age <= 14 && bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '14' && age <= 14 && bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '14' && age <= 14 && bobot === '2001' && avgLatestWeight > 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 && bobot === '2001' && avgLatestWeight > 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30 && bobot === '2001' && avgLatestWeight > 2000) {
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
                    return false;
                }

                if (usia) {
                    if (usia === '14' && age <= 14) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '30' && age > 14 && age <= 30 ) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (usia === '31' && age > 30) {
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

                if (bobot) {
                    if (bobot === '1000' && avgLatestWeight <= 1000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (bobot === '1500' && avgLatestWeight > 1000 && avgLatestWeight <= 1500) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (bobot === '2000' && avgLatestWeight > 1500 && avgLatestWeight <= 2000) {
                        resultPeriode.push({
                            namaKandang: periode.kandang.kode,
                            kota: periode.kandang.kota,
                            DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                            bobot: avgLatestWeight,
                            usia: age,
                            populasi: periode.populasi,
                            kemitraan: periode.kemitraan ? periode.kemitraan.name : ""
                        });
                    } else if (bobot === '2001' && avgLatestWeight > 2000) {
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

                if (usia === "" && bobot === "") {
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

        res.json({
            //count: resultPeriode.length,
            ketersediaan: resultPeriode
        })
    } catch (error) {
        next(error)
    }
}