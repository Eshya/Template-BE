const { parseQuery } = require('../../helpers');
const Model = require('../peternak/peternak.model')

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
        const { name, address, phoneNumber, asalKemitraan, active } = req.query;
        let sort = handleQuerySort(req.query.sort)
        let role = req.user.role ? req.user.role.name : '';
        let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
        const filter = {}
        if (name) {
            filter.fullname = new RegExp(name, 'i') 
        }
        if (address) {
            filter.address = new RegExp(address, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }
        filter.role = "61d5608d4a7ba5b05c9c7ae3";
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { fullname: 1 }
        }

        if (role === "adminkemitraan") {
            filter.kemitraanUser = kemitraanId
        }

        if (active === 'true') {
            filter.isPPLActive = true
        } else if (active === 'false') {
            filter.isPPLActive = false
        }

        const count = await Model.countDocuments(filter)
        const data = await Model.find(filter).limit(limit).skip(offset).sort(sort).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser isPPLActive')

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
        const ppl = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber asalKemitraan kemitraanUser isPPLActive')

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

exports.removePPLById = async (req, res, next) => {
    let id = req.params.id;
    try {
        console.log("masuk sini")
        const result = await Model.findByIdAndUpdate(id, {deleted: true, isPPLActive: false}, {new: true}).exec();
        if (!result) {
            res.json({error: 404, message: 'PPL not found.'})
        }
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch(err){
        next(err)
    }
}