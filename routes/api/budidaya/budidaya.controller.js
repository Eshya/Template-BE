
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const DataSTD = require('../data/data.model');
const PeternakModel = require('../peternak/peternak.model');
const Promise = require("bluebird");
const reducer = (acc, value) => acc + value;
const mongoose = require('mongoose');
const {parseQuery} = require('../../helpers');
const ONE_DAY = 24 * 60 * 60 * 1000;
const logic_sort = (a, b , code) => {
    return b.periodeKe-a.periodeKe;
}
const sortBy = (array,code) =>{
    switch(code){
        case 5: return array.sort((a,b)=> {return b.periodeKe - a.periodeKe});break;
        case 6: return array.sort((a,b)=> {return b.IP - a.IP});break;
        case 7: return array.sort((a,b)=> {return b.fcrACT - a.fcrACT});break;
        case 8: return array.sort((a,b)=> {return b.totalPenghasilanKandang - a.totalPenghasilanKandang});break;
        case 1: return array.sort((a,b)=> {return a.periodeKe - b.periodeKe});break;
        case 2: return array.sort((a,b)=> {return a.IP - b.IP});break;
        case 3: return array.sort((a,b)=> {return a.fcrACT - b.fcrACT});break;
        case 4: return array.sort((a,b)=> {return a.totalPenghasilanKandang - b.totalPenghasilanKandang});break;
        default:break;
    }
}
function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}
function searchByPeriode(array,search){
    return array.filter(function(arr) {
        let slice =  search.slice(1,search.length-1)
        let filter = JSON.stringify(arr.periodeString).includes(slice.toUpperCase());
        delete arr.periodeString;
        return filter;
    })
}
exports.riwayatBudidaya =  async (req, res, next) => {
    try {
        let {limit, offset,sortcode,search} = req.query;
        
        let periode = await Periode.find({kandang: req.params.id}).sort('tanggalMulai')
        let result = [];
        if(isNaN(limit))limit=5;
        if(isNaN(offset))offset=0;
        if(isNaN(sortcode))sortcode=1;
        if(search===undefined)search="";
        
        
        // console.log(periode)
        if (periode.length!=0) {
            await Promise.map(periode, async (periodeChild, index) => {
                const sapronak = await Sapronak.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periodeChild._id)}},
                    {$lookup:  {
                        "from": "produk",
                        "localField": "produk",
                        "foreignField": "_id",
                        "as": "produk_info"
                    }},
                    {$unwind: '$produk_info'},
                    {$group: {_id: '$produk_info.jenis', pakan_masuk: {$sum: '$kuantitas'}}}
                ])
    
                const penjualan = await Penjualan.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periodeChild._id)}},
                    {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
                ])
    
                const dataPakan = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periodeChild._id)}},
                    {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                    {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
                ])
    
                const dataDeplesi = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periodeChild._id)}},
                    {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
                ])
    
                const getKegiatanHarian = await KegiatanHarian.find({periode: periodeChild._id}).sort({'tanggal': -1}).limit(1).select('-periode')
                const getKegiatan = await KegiatanHarian.find({periode: periodeChild._id}).sort({'tanggal': -1})
                    const findBerat = getKegiatan.filter((x) => {
                        var berat = x.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0)
                        return berat !== 0
                    })
                const latestWeight = findBerat[0] ? findBerat[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
                const latestSampling = findBerat[0] ? findBerat[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0
                  
                const latestFeed = getKegiatanHarian[0] ? getKegiatanHarian[0].pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0
    
                const avgLatestWeight = latestWeight/latestSampling
    
                const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
                const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
                //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
                const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
                const filter_sapronak = sapronak.filter(x => x._id == "PAKAN")
                const pakanMasuk = filter_sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);
    
                const deplesi = (periodeChild.populasi - (periodeChild.populasi - (allDeplesi + allKematian))) * 100 / periodeChild.populasi
                const totalDeplesi = (allDeplesi + allKematian)
                const batasDeplesi = ((2 / 100) * periodeChild.populasi)
                const presentaseAyamHidup = 100 - deplesi
                const populasiAkhir = periodeChild.populasi - (allDeplesi + allKematian)
                const FCR = allPakan / (populasiAkhir * (avgLatestWeight/1000)) 
                const atas = presentaseAyamHidup * (avgLatestWeight/1000)
                const bawah = FCR*(dataPakan.length-1)
                const IP = (atas / bawah) * 100
                const IPFixed = IP.toFixed(2)
                const IPResult = isFinite(IPFixed) && IPFixed || 0
    
                // get total penjualan
                let harian = []
                let pembelianPakan = 0
                let pembelianOVK = 0
                const getSapronak = await Sapronak.find({periode: periodeChild._id});
                for (let i = 0; i < getSapronak.length; i++) {
                    if (getSapronak[i].produk && (getSapronak[i].produk.jenis === 'PAKAN')) {
                        const compliment = getSapronak[i].zak * getSapronak[i].hargaSatuan
                        pembelianPakan += compliment
                    } else {
                        const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                        pembelianOVK += compliment
                    }
                }
                const pembelianDoc = periodeChild.populasi * periodeChild.hargaSatuan
                const getPenjualan = await Penjualan.find({periode: periodeChild._id})
                getPenjualan.forEach(x => {
                    harian.push(x.beratBadan * x.harga * x.qty)
                })
                const penjualanAyamBesar = harian.reduce(reducer, 0);
                const pendapatanPeternak = penjualanAyamBesar - pembelianDoc - pembelianOVK - pembelianPakan
                const now = new Date(Date.now());

                let feedIntakeACT = populasiAkhir === 0 ? 0 : latestFeed * 1000 / populasiAkhir
            
                const start = new Date(periodeChild.tanggalMulai);
                const usia = periodeChild.isEnd ? Math.round(Math.abs((periodeChild.tanggalAkhir - start) / ONE_DAY)) :  Math.round(Math.abs((now - start) / ONE_DAY))
                const STD = await DataSTD.findOne({day: usia})
                const findPPL = await PeternakModel.findById(periodeChild?.ppl);
            
               
                result.push({
                    periodeKe:index+1,
                    periodeString: `PERIODE ${index+1}`,
                    idPeriode: periodeChild._id,
                    start:periodeChild.tanggalMulai,
                    closing:periodeChild?.tanggalAkhir === null ? "Periode Berjalan" : periodeChild.tanggalAkhir,
                    idPPL: findPPL?._id,
                    namaPPL: periodeChild?.isActivePPL ? findPPL.fullname : "PPL Not Active",
                    phonePPL: periodeChild?.isActivePPL ? findPPL.phoneNumber : null,
                    IP: IPResult,
                    IPSTD: STD ? STD.ip: 0 ,
                    totalPenghasilanKandang: pendapatanPeternak,
                    DOC: periodeChild.jenisDOC ? periodeChild.jenisDOC.name : "",
                    populasiAwal: periodeChild.populasi,
                    populasiAkhir: populasiAkhir,
                    pakanAwal: pakanMasuk,
                    pakanPakai: allPakan,
                    pakanSisa: (pakanMasuk - allPakan),
                    usiaAyam: usia - 1,
                    totalDeplesi: totalDeplesi,
                    batasDeplesi: batasDeplesi,
                    bobotACT: avgLatestWeight,
                    bobotSTD: STD ? STD.bodyWeight: 0,
                    feedIntakeACT: feedIntakeACT.toFixed(2),
                    feedIntakeSTD: STD ? STD.dailyIntake: 0,
                    fcrACT: isNaN(FCR) ? 0 : FCR.toFixed(2),
                    fcrSTD: STD ? STD.fcr: 0,
                    rhpp_path: periodeChild.rhpp_path ? periodeChild.rhpp_path : ""
                })
            });
            
            
        }
        let offsetPaging;
        if (offset == 0) {
            offsetPaging = 1
        } else {
            offsetPaging = (offset / 5 + 1)
        }
        let resultSort = sortBy(result,parseInt(sortcode))
        
        result = paginate(resultSort,parseInt(limit),parseInt(offsetPaging)) 
        result = searchByPeriode(result,search)
        // console.log(searchByPeriode(result,search))
        res.json({
            count: result.length,
            dataRiwayat: result,
            message: 'Woke'
        })
    } catch (error) {
        next(error)
    }
}