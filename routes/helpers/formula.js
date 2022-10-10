const Periode = require('../api/periode/periode.model')
const Penjualan = require('../api/penjualan/penjualan.model')
const KegiatanHarian = require('../api/kegiatan-harian/kegiatan-harian.model')
const ONE_DAY = 24 * 60 * 60 * 1000;
const dayjs = require('dayjs');
const mongoose = require('mongoose')

const getPenjualan = async (idPeriode) => {
    const penjualan = await Penjualan.aggregate([
        {$match: {periode: mongoose.Types.ObjectId(idPeriode)}},
        {$group: {_id: '$_id', tanggal: {$push: '$tanggal'}, totalEkor: {$sum: '$qty'}, tonase: {$sum: '$beratBadan'}}},
        {$project: {tanggal: '$tanggal', totalTonase: {$multiply: ['$totalEkor', '$tonase']}, totalEkor: '$totalEkor'}}
    ])
    return penjualan
}

const totalTonase = async(idPeriode) => {
    const getSales  = await getPenjualan(idPeriode)
    const accumulateTotalTonase = getSales.reduce((a, {totalTonase}) => a + totalTonase, 0)
    return accumulateTotalTonase;
}

const getKegiatanHarian = async (idPeriode) => {
    const dataPakan = await KegiatanHarian.aggregate([
        {$match: {periode: mongoose.Types.ObjectId(idPeriode)}},
        {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
        {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
    ])
    return dataPakan
}

const dailyChickenAge = async(idPeriode) => {
    const dailyActivities = await KegiatanHarian.find({ periode: idPeriode }).sort({tanggal: -1});
    const startDate = dayjs(new Date(dailyActivities[0]?.tanggal));
    const today = dayjs(new Date());
    const age = Math.round(Math.abs(today.diff(startDate, 'day')));
    return age;
}

const getSortedDailyActivities = async(idPeriode) => {
    return await KegiatanHarian.find({periode: idPeriode}).sort({ tanggal: 1 });
}

const getDataDeplesi = async(idPeriode) => {
    const dataDeplesi = await KegiatanHarian.aggregate([
        {$match: {periode: mongoose.Types.ObjectId(idPeriode)}},
        {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
    ])

    return dataDeplesi;
}

const accumulateDeplesi = async(idPeriode) => {
    const dataDeplesi = await getDataDeplesi(idPeriode);
    const totalDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
    const totalMortality = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
    const deplesiAccumulation = totalDeplesi + totalMortality
    return deplesiAccumulation
}

const actualRemainingChicken = async(idPeriode) => {
    const getSales = await getPenjualan(idPeriode);
    const accumulateTotalHarvest = getSales.reduce((a, {totalEkor}) => a + totalEkor, 0)
    const periode = await Periode.findById(idPeriode);
    const totalDeplesi = await accumulateDeplesi(idPeriode);
    const remainingChicken = periode.populasi - (totalDeplesi - accumulateTotalHarvest);
    return remainingChicken;
}

const liveChickenPrecentage = async(idPeriode) => {
    const remainingChicken = await actualRemainingChicken(idPeriode);
    const periode = await Periode.findById(idPeriode);
    const livePrecentage = (remainingChicken/periode.populasi)*100;
    return livePrecentage;
}

const AvgDailyWeight = async(idPeriode, day) => {
    const periode = await Periode.findById(idPeriode);
    const dailyActivities = await getSortedDailyActivities(idPeriode);

    if (periode && dailyActivities.length) {
        const startDate = dayjs(new Date(periode.tanggalMulai));
        const dailyActivity = dailyActivities.find(activity => {
            const date = dayjs(new Date(activity.tanggal))
            const age = Math.round(Math.abs(date.diff(startDate, 'day')))
            if (age === day) return activity
        });

        const dailyWeight = !dailyActivity ? 0 : dailyActivity.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0);
        const dailyWeightSample = !dailyActivity ? 0 : dailyActivity.berat.reduce((a, {populasi}) => a + populasi, 0);
        const avgDailyWeight = dailyWeight/dailyWeightSample
        return avgDailyWeight
    }
}

const RGR = async(idPeriode) => {
    const avgFirstDay = await AvgDailyWeight(idPeriode, 0);
    const avgLastDay = await AvgDailyWeight(idPeriode, 7);
    const RGR = ((avgLastDay-avgFirstDay)/avgFirstDay)*100;

    return RGR
}

/**
 * FCRHarian = akumulasiPakanPakaiHarian/((BWHarian/1000*sisaAktualAyam)+akumulasiTonasePanen)
 */

const dailyFCR = async(idPeriode) => {
    const dailyActivities = await getSortedDailyActivities(idPeriode)
    const sortedDailyActivities = dailyActivities.sort((a,b) => b.tanggal - a.tanggal)

    const getSales  = await getPenjualan(idPeriode)
    const accumulateTotalTonase = await totalTonase(idPeriode)
    
    const remainingChicken = await actualRemainingChicken(idPeriode);

    const dailyFeedIntake = await getKegiatanHarian(idPeriode);
    const accumulateFeedIntake = dailyFeedIntake.reduce((a, {totalPakan}) => a + totalPakan, 0)

    const avgLatestWeight = await AvgDailyWeight(idPeriode, sortedDailyActivities.length - 1)
    const FCR = accumulateFeedIntake/(((avgLatestWeight/1000)*remainingChicken)+accumulateTotalTonase);
    return FCR
}

const getWeightClosing = async (idPeriode) => {
    const getSales = await getPenjualan(idPeriode)
    const accumulateTotalHarvest = getSales.reduce((a, {totalEkor}) => a + totalEkor, 0)
    const accumulateTotalTonase = await totalTonase(idPeriode);
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
    const getDaily = await getKegiatanHarian(idPeriode)
    const accumulateFeedIntake = getDaily.reduce((a, {totalPakan}) => a + totalPakan, 0)
    const accumulateTotalTonase = await totalTonase(idPeriode);
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
exports.RGR = RGR
exports.dailyChickenAge = dailyChickenAge
exports.FCR = dailyFCR
exports.liveChickenPrecentage = liveChickenPrecentage
exports.actualRemainingChicken = actualRemainingChicken
