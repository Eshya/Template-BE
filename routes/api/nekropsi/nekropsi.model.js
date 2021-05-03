const { Schema, model } = require("mongoose");

const kepalaSchema = new Schema({
    bengkakDibawahMata: {default: null, type: Boolean},
    bengkakDiatasMata: {default: null, type: Boolean},
    TAPKepala: {default: null, type: Boolean}
})

const hidungSchema = new Schema ({
    bersih:     {default: false, type: Boolean},
    ingusEncer: {default: false, type: Boolean},
    ingusKental:{default: false, type: Boolean}
})

const kotoranSchema = new Schema({
    encer: {default: false, type: Boolean},
    padat: {default: false, type: Boolean},
    berupaPakan: {default: false, type: Boolean},
    normal: {default: false, type: Boolean},
    kuning: {default: false, type: Boolean},
    putih: {default: false, type: Boolean},
    merah: {default: false, type: Boolean},
    coklat: {default: false, type: Boolean}
})

const mataSchema = new Schema({
    TAPMata: {default: false, type: Boolean},
    pendarahan: {default: false, type: Boolean}
})

const telapakKakiSchema = new Schema({
    kapalan: {default: false, type: Boolean},
    TAPKaki: {default: false, type: Boolean}
})

const kulitSchema = new Schema({
    normal: {default: false, type: Boolean},
    perlukaan: {default: false, type: Boolean}
})

const ototSchema = new Schema({
    TAPOtot: {default: false, type: Boolean},
    pendarahanGaris: {default: false, type: Boolean},
    pendarahanBintik: {default: false, type: Boolean},
})

const mulutSchema = new Schema({
    TAPMulut: {default: false, type: Boolean},
    perkejuanMulut: {default: false, type: Boolean},
    peradanganMulut: {default: false, type: Boolean},
})

const tenggorokanSchema = new Schema({
  TAPTenggorokan: {default: false, type: Boolean},
  peradanganTenggorokan: {default: false, type: Boolean},
  perkejuanTenggorokan: {default: false, type: Boolean},
  mukus: {default: false, type: Boolean},
})

const bronkusSchema = new Schema({
    TAPBronchus: {default: false, type: Boolean},
    peradanganBronchus: {default: false, type: Boolean},
    perkejuanbronchus: {default: false, type: Boolean},
})

const paruSchema = new Schema ({
    menghitam: {default: false, type: Boolean},
    bintikPutihParu: {default: false, type: Boolean},
    TAPParu: {default: false, type: Boolean},
})

const kantungHawaSchema = new Schema({
    TAPKantung: {default: false, type: Boolean},
    bintikKantungPutih: {default: false, type: Boolean},
    perkejuanKantung: {default: false, type: Boolean},
    keruh: {default: false, type: Boolean},
})

const tembolokSchema = new Schema ({
        TAPTembolok: {default: false, type: Boolean},
        jamur: {default: false, type: Boolean},
})

const proventikulusSchema = new Schema({
    peradanganDiAntaraTonjolan: {default: false, type: Boolean},
    peradanganDiBatasProventikulusDanVentri: {default: false, type: Boolean},
    peradanganDiTonjolan: {default: false, type: Boolean},
    membesar: {default: false, type: Boolean},
    TAPProventikulus: {default: false, type: Boolean},
})

const ventrikulusSchema = new Schema({
    TAPVentrikulus: {default: false, type: Boolean},
    perubahanWarna: {default: false, type: Boolean},
    keropeng: {default: false, type: Boolean},
})

const ususSchema = new Schema({
    TAPUsus: {default: false, type: Boolean},
    lapisanEpitelLuruh: {default: false, type: Boolean},
    peradanganUsus: {default: false, type: Boolean},
    memperbesarUsus: {default: false, type: Boolean},
    mengecilUsus: {default: false, type: Boolean},
    menipis: {default: false, type: Boolean},
    payerPatch: {default: false, type: Boolean},
    TAPUsusBuntu: {default: false, type: Boolean},
    pendarahanUsusBuntu: {default: false, type: Boolean}, 
})

const ginjalSchema = new Schema({
    asamUrat: {default: false, type: Boolean},
    bengkak: {default: false, type: Boolean},
    TAPGinjal: {default: false, type: Boolean},
})

const jantungSchema = new Schema({
    TAPJantung: {default: false, type: Boolean},
    perkejuanDiSelaput: {default: false, type: Boolean},
    asites: {default: false, type: Boolean},
})

const hatiSchema = new Schema({
    TAPHati: {default: false, type: Boolean},
    rapuh:{default: false, type: Boolean},
    bintikPutihHati: {default: false, type: Boolean},
    perkejuanHati: {default: false, type: Boolean},
})

const thymusSchema = new Schema({
    TAPThymus: {default: false, type: Boolean},
    peradanganThymus: {default: false, type: Boolean},
})

const pancreasSchema = new Schema({
    TAPPankreas: {default: false, type: Boolean},
    bintikPankreas: {default: false, type: Boolean},
})

const kuningTelurSchema = new Schema({
    mengeras: {default: false, type: Boolean},
    masihAda: {default: false, type: Boolean},
    terserap: {default: false, type: Boolean},
})

const caecaTonsilSchema = new Schema({
    TAPCaeca: {default: false, type: Boolean},
    peradanganCaeca: {default: false, type: Boolean},
})

const bursaFabriciusSchema = new Schema({
    TAPBursa: {default: false, type: Boolean},
    perkejuanBursa: {default: false, type: Boolean},
    peradanganBursa: {default: false, type: Boolean},
    bengkakBursa: {default: false, type: Boolean},
    kecilBursa: {default: false, type: Boolean}
})

const statusAyamSchema = new Schema({
    sakit: {default: false, type: Boolean},
    sehat: {default: false, type: Boolean},
})

const jenisPenyakitSchema = new Schema({
    CRD: {default: false, type: Boolean},
    COLLIBACILOSIS: {default: false, type: Boolean},
    snot: {default: false, type: Boolean},
    colliPanopthalmitis: {default: false, type: Boolean},
    gumboro: {default: false, type: Boolean},
    ND: {default: false, type: Boolean},
    AI: {default: false, type: Boolean},
    koksidiosis: {default: false, type: Boolean},
    aspergilosis: {default: false, type: Boolean},
    candidiasis: {default: false, type: Boolean},
    mikotoksikosis: {default: false, type: Boolean},
    malariaLike: {default: false, type: Boolean},
})

const scheme = new Schema({
    tanggal: {
        type: Date,
        required: true
    },
    images: [{
        type: Schema.Types.ObjectId,
        ref: 'NekropsiImage',
        select: true,
        autopopulate: {maxDepth: 1}
    }],
    kepala: [kepalaSchema],
    hidung: [hidungSchema],
    kotoran: [kotoranSchema],
    mata: [mataSchema],
    telapakKaki: [telapakKakiSchema],
    kulit: [kulitSchema],
    otot: [ototSchema],
    mulut: [mulutSchema],
    tenggorokan: [tenggorokanSchema],
    bronkus: [bronkusSchema],
    paru: [paruSchema],
    kantungHawa: [kantungHawaSchema],
    tembolok: [tembolokSchema],
    proventikulus: [proventikulusSchema],
    ventrikulus: [ventrikulusSchema],
    usus: [ususSchema],
    ginjal: [ginjalSchema],
    jantung: [jantungSchema],
    hati: [hatiSchema],
    thymus: [thymusSchema],
    pancreas: [pancreasSchema],
    kuningTelur: [kuningTelurSchema],
    caecaTonsil: [caecaTonsilSchema],
    bursaFabricius: [bursaFabriciusSchema],
    statusAyam: [statusAyamSchema],
    jenisPenyakit: [jenisPenyakitSchema]
}, {timestamps: true, versionKey: false})
scheme.plugin(require('mongoose-autopopulate'));
module.exports = model('Nekropsi', scheme, 'nekropsi');
