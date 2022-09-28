const Periode = require('../api/periode/periode.model')
const Penjualan = require('../api/penjualan/penjualan.model')
const KegiatanHarian = require('../api/kegiatan-harian/kegiatan-harian.model')
const ONE_DAY = 24 * 60 * 60 * 1000;
const mongoose = require('mongoose')

const getPenjualan = async (idPeriode) => {
    const penjualan = await Penjualan.aggregate([
        {$match: {periode: mongoose.Types.ObjectId(idPeriode)}},
        {$group: {_id: '$_id', tanggal: {$push: '$tanggal'}, totalEkor: {$sum: '$qty'}, tonase: {$sum: '$beratBadan'}}},
        {$project: {tanggal: '$tanggal', totalTonase: {$multiply: ['$totalEkor', '$tonase']}, totalEkor: '$totalEkor'}}
    ])
    return penjualan
}

const getKegiatanHarian = async (idPeriode) => {
    const dataPakan = await KegiatanHarian.aggregate([
        {$match: {periode: mongoose.Types.ObjectId(idPeriode)}},
        {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
        {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
    ])
    return dataPakan
}

const getWeightClosing = async (idPeriode) => {
    const getSales = await getPenjualan(idPeriode)
    const accumulateTotalHarvest = getSales.reduce((a, {totalEkor}) => a + totalEkor, 0)
    const accumulateTotalTonase = getSales.reduce((a, {totalTonase}) => a + totalTonase, 0)
    const avgWeightClosing = accumulateTotalTonase/accumulateTotalHarvest
    return avgWeightClosing
}

const getpersentaseAyamHidupClosing = async (idPeriode) => {
    const getSales = await getPenjualan(idPeriode)
    const accumulateTotalHarvest = getSales.reduce((a, {totalEkor}) => a + totalEkor, 0)
    const periode = await Periode.findById(idPeriode)
    const presentase = (accumulateTotalHarvest / periode.populasi) * 100
    return presentase
}

const getAvgAge = async (idPeriode) => {
    const findPeriode = await Periode.findById(idPeriode)
    const startDate = new Date(findPeriode.tanggalMulai)
    const getHarvest = await getPenjualan(idPeriode)
    const mapping = getHarvest.map((x) => {
        const harvestDate = new Date(x.tanggal[0])
        const age = Math.round(Math.abs((harvestDate - startDate) / ONE_DAY))
        const totalHarvest = x.totalEkor
        return age * totalHarvest
    })
    const accumulateMap = mapping.reduce((a, b) => a + b, 0)
    const accumulateTotalHarvest = getHarvest.reduce((a, {totalEkor}) => a + totalEkor, 0)
    const resultAvgAge = accumulateMap /accumulateTotalHarvest
    return resultAvgAge
}

const getFCRClosing = async (idPeriode) => {
    const getSales  = await getPenjualan(idPeriode)
    const getDaily = await getKegiatanHarian(idPeriode)
    const accumulateFeedIntake = getDaily.reduce((a, {totalPakan}) => a + totalPakan, 0)
    const accumulateTotalTonase = getSales.reduce((a, {totalTonase}) => a + totalTonase, 0)
    const FCR = accumulateFeedIntake / accumulateTotalTonase
    return FCR
}


exports.IPClosing = async (idPeriode) => {
    const persentaseAyamHidupClosing = await getpersentaseAyamHidupClosing(idPeriode)
    const weightClosing = await getWeightClosing(idPeriode)
    const FCRClosing = await getFCRClosing(idPeriode)
    const avgAge = await getAvgAge(idPeriode)
    const IP = ((persentaseAyamHidupClosing*weightClosing)/(FCRClosing*avgAge))*100
    return IP
}

exports.FCRClosing = getFCRClosing
exports.persentaseAyamHidupClosing = getpersentaseAyamHidupClosing
exports.weightClosing = getWeightClosing
exports.avgAge = getAvgAge