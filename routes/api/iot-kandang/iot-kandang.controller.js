const Model = require('./iot-kandang.model');
const Kandang = require('../kandang/kandang.model');
const db = require('../../../configs/db.conf');
const helper = require('../../helpers');

const getLast = async () => {
    const rows = await db.query('SELECT id FROM device ORDER BY id DESC LIMIT 1')
    const data = helper.emptyOrRows(rows);

    return data;
}

const getPerangkat = async (params) => {
    const rows = await db.query(`SELECT p.*, d.nama_device FROM perangkat as p INNER JOIN device as d ON p.id_device = d.id WHERE p.id_device = ?`, [params])
    const data = helper.emptyOrRows(rows);

    return data;
}

exports.findByKandang = async (req, res, next) => {
    try {
        const findKandang = await Kandang.findOne({createdBy: req.user._id, isActive: true}, {_id: true})
        const find = await Model.find({kandang: findKandang})
        console.log(find);
        var asyncMap = await Promise.all(find.map(async(x) => {
            return getPerangkat(x.iot)
            // return x.iot
        })) 
        // find.map(x => {
        //     console.log(x)
        // })
        res.json({
            data: asyncMap,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    // console.log(req.user._id);
    try {
        const findId = await getLast()
        // console.log(idDevice[0].id);
        const findKandang = await Kandang.findOne({createdBy: req.user._id, isActive: true}, {_id: true})
        const result = await Model.create({iot: findId[0].id + 1, kandang: findKandang._id})
        res.json({
            data: result,
            message: 'Ok'
        })
        
    } catch (error) {
        next(error)
    }
}