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
        // const findKandang = await Kandang.findOne({_id: req.params.id, createdBy: req.user._id}, {_id: true})
        const find = await Model.find({kandang: req.params.id})
        var asyncMap = await Promise.all(find.map(async(x) => {
            return getPerangkat(x.iot)
            // return x.iot
        })) 
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
        const idPeriode = req.body.kandang
        // const findKandang = await Kandang.findOne({createdBy: req.user._id, isActive: true}, {_id: true})
        const result = await Model.create({iot: findId[0].id + 1, kandang: idPeriode})
        res.json({
            data: result,
            message: 'Ok'
        })
        
    } catch (error) {
        next(error)
    }
}

exports.removeById = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Model.findOneAndRemove({iot: id}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}