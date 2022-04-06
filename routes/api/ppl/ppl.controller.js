const { parseQuery } = require('../../helpers');
const Model = require('../peternak/peternak.model')
const Promise = require("bluebird");
const mongoose = require('mongoose');
const reducer = (acc, value) => acc + value;

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
        const { name, address, phoneNumber, asalKemitraan } = req.query;
        const sort = handleQuerySort(req.query.sort)
        const filter = {}
        if (name) {
            filter.fullname = new RegExp(name, 'i') 
        }
        if (address) {
            filter.address = new RegExp(address, 'i') 
        }
        if (asalKemitraan) {
            filter.asalKemitraan = new RegExp(asalKemitraan, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }
        filter.role = "61d5608d4a7ba5b05c9c7ae3";
        filter.deleted = false;

        const count = await Model.countDocuments(filter)
        const data = await Model.find(filter).limit(limit).skip(offset).sort(sort).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser')

        res.json({
            message: 'Ok',
            length: count,
            data: data
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const ppl = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser')

        res.json({
            detailPPL: ppl,
            totalKandang: 0,
            detailKandang: [],
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}