const KandangModel = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const fetch = require('node-fetch')
const Promise = require("bluebird");

exports.getKelola = async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const id = req.user._id
        const kandang = await KandangModel.find({createdBy: id}).select('kode alamat kota populasi isActive isMandiri')

        let dataKelola = [];
        await Promise.map(kandang, async (item) => {

            // get periode
            let dataPeriode = [];
            let periode = await Periode.find({kandang: item._id}).sort('updatedAt')
            await Promise.map(periode, async (itemPeriode) => {
                let oneDay = 24 * 60 * 60 * 1000;
                let now = new Date(Date.now());
                let start = new Date(itemPeriode.tanggalMulai);
                let umurAyam = Math.round(Math.abs((now - start) / oneDay))

                dataPeriode.push({
                    idPeriode: itemPeriode._id,
                    umurAyam: umurAyam,
                    tanggalMulai: itemPeriode.tanggalMulai,
                    tanggalAkhir: itemPeriode.tanggalAkhir,
                    isEnd: itemPeriode.isEnd,
                    hargaSatuan: itemPeriode.hargaSatuan,
                    jenisDOC: itemPeriode.jenisDOC,
                    populasi: itemPeriode.populasi
                });
            });

            //get flock
            let flock = [];
            flock = await fetch('https://iot.chickinindonesia.com/api/flock/kandang/' + item._id, {
                method: 'get',
                headers: {
                    'Authorization': token,
                    "Content-Type": "application/json" }
            }).then(res => res.json()).then(result => {
                return result
            });

            dataKelola.push({
                idPemilik: item.createdBy._id,
                namaPemilik: item.createdBy.fullname,
                idKandang: item._id,
                kodeKandang: item.kode,
                alamatKandang: item.alamat,
                kotaKandang: item.kota,
                dataPeriode: dataPeriode,
                dataFlock: flock.data
            });
        });

        res.json({
            data: dataKelola,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}