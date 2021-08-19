const {parseQuery, createError, isDevMode} = require('../../helpers');
const Role = require('../roles/roles.model');
const Model = require('./users.model');
const selectPublic = '-createdAt -updatedAt -password';
const passwordHash = require('password-hash');
const Kandang = require('../kandang/kandang.model');
// const md5 = require('md5');
const bcrypt = require('bcrypt');
const db = require('../../../configs/db.conf')

const _find = async (req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort(sort);
    if(isPublic){
        data.select(selectPublic);
    }
    const results = await Promise.all([count, data]);
    return {length: results[0], data: results[1]};
}

const _beforeSave = (data) => {
    if(data.password){
        data.password = passwordHash.generate(data.password, {saltLength: 10});
    }
    if (!data.noKTP || !data.asalKemitraan){
        delete data.noKTP
        delete data.asalKemitraan
    }
    return data;
}

exports.findAll = async (req, res, next) => {
    try {
        const result = await _find(req, false);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

exports.findPublic = async (req, res, next) => {
    try {
        const result = await _find(req, true);
        res.json(result)
    } catch (error) {
        next(error);
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const result = await Model.countDocuments(where).exec();
        res.json({length: result});
    } catch (error) {
        next(error);
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.findKandang = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Kandang.find({createdBy: id})
        res.json({
            data: results,
            message: 'Ok'
        })   
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = _beforeSave(req.body);
    try {
        const result = await Model.create(data);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = _beforeSave(req.body)
    try {
        const result = await Model.findByIdAndUpdate(id, data, {new: true}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    const data = _beforeSave(req.body);
    try {
        const result = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const result = await Model.deleteMany(where).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);   
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const result = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        
    }
}

//auth

exports.login = (username, password) => {
    return new Promise((resolve, reject) => {
        Model.findOne({username})
        .select('_id password username roles')
        .then((foundUser) => {
            if(!foundUser) return reject(createError(400, 'Username not found!'));
            const hashedPassword = foundUser.password;
            const isValidPassword = passwordHash.verify(password, hashedPassword);
            if(isValidPassword){
                resolve(foundUser);
            } else {
                reject(createError(400, 'Wrong Password'));
            }
        })
    })
}

exports.register = async (req, res, next) => {
    let {fullname, username, email, phoneNumber, password, noKTP, asalKemitraan, idFirebase} = _beforeSave(req.body);
    let result = []
    let mysql = []
    try {
        if(req.body.noKTP == null  && req.body.asalKemitraan == null){
            let role = await Role.findOne({name: 'peternak'}, {_id: true})
            const resultUser = await createUser({fullname, username, email, phoneNumber, password, role, idFirebase})
            const resultMysql = await createNew(req.body)
            result.push(resultUser)
            mysql.push(resultMysql)
        } else {
            let role = await Role.findOne({name: 'ppl'}, {_id: true})
            const resultUser = await createUser({fullname, username, email, phoneNumber, password, noKTP, asalKemitraan, role, idFirebase})
            const resultMysql = await createNew(req.body)
            result.push(resultUser)
            mysql.push(resultMysql)
        }
        
        res.json({
            data: result,
            dataMysql: mysql,
            message: 'Ok'
        })
    } catch(err){
        next(err)
    }
}

const createUser = (data) => {
    return new Promise((resolve, reject) => {
        const findUname = Model.findOne({username: data.username})
        const findEmail = Model.findOne({email: data.email})
        let actions = [findUname, findEmail]
        Promise.all(actions).then(cb => {
            if(cb[0]) throw createError(400, 'username already registered')
            if(cb[1]) throw createError(400, 'email already registered')
            return Model.create(data)
        })
        .then(results => resolve(results))
        .catch(err=>reject(err))
    })
}

const createNew = async (data) => {
    // var salt = bcrypt.genSalt(12);
    var pass = await bcrypt.hash(data.password, 12);
    const query = await db.query(`INSERT INTO users (name, email, password) VALUES (?,?,?)`, [
        // data.username, data.email, md5(data.password)
        data.username, data.email, pass
    ])
    let message = 'Error in creating data';
    if(!query.affectedRows) return message;
    return query;
}

exports.kelolaPeriode = async (req, res, next) => {
    const id = req.user._id
    const data = req.body.periode
    try {
        const result = await Model.findByIdAndUpdate(id, {$push: {kelola: data}}, {new: true}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
        // console.log(id);
    } catch (error) {
        next(error)
    }
}

exports.findPeriode = async (req, res, next) => {
    const id = req.params.id
    try {
        
    } catch (error) {
        next(error)
    }
}