const { parseQuery } = require('../../helpers');
const Model = require('./kemitraan.model')

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

exports.findAll =  async (req, res, next) => {
    try {
        const {limit, offset} = parseQuery(req.query);
        const { name, alamat, email, phoneNumber, contactPerson } = req.query;
        const sort = handleQuerySort(req.query.sort)
        const filter = {}
        if (name) {
            filter.name = new RegExp(name, 'i') 
        }
        if (alamat) {
            filter.alamat = new RegExp(alamat, 'i') 
        }
        if (email) {
            filter.email = new RegExp(email, 'i') 
        }
        if (contactPerson) {
            filter.contactPerson = new RegExp(contactPerson, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }

        const count = Model.countDocuments(filter)
        const data = Model.find(filter).limit(limit).skip(offset).sort(sort)
        const results = await Promise.all([count, data])
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        const result = await Model.create(data)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id
    const data = req.body
    try {
        const result = await Model.findByIdAndUpdate(id, data, {new: true}).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const result = await Model.findByIdAndRemove(req.params.id).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}