const {parseQuery} = require('../../helpers');
const Kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model');
const Promise = require("bluebird");
const moment = require('moment');
const fs = require('fs')
const util = require("util");
const multer = require("multer");
const maxSize = 5 * 1024 * 1024;

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

function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

exports.findAll =  async (req, res, next) => {
    try {
        const {limit, offset} = parseQuery(req.query);
        const { rhpp, peternak } = req.query;
        let sort = handleQuerySort(req.query.sort);
        let role = req.user.role ? req.user.role.name : '';
        let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
        const filter = {}
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { createdAt: -1 }
        }

        let result = [];
        const data = await Kandang.find(filter).sort(sort).collation({ locale: "en", caseLevel: true })
        for (let i = 0; i < data.length; i++) {
            let filterPeriod = {};
            filterPeriod.kandang = data[i].id;
            if (role === "adminkemitraan") {
                filterPeriod.kemitraan = kemitraanId
            }
            if (rhpp) {
                filterPeriod.rhpp_path = { "$nin": [ null, "" ] }
            }
            filterPeriod.isEnd = true
            const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
            if (periode && periode.kandang) {
                // get periode ke
                const kandang = await Periode.find(filterPeriod).sort('tanggalMulai')
                let dataPeriode = [];
                await Promise.map(kandang, async (itemKandang, index) => {
                    if (itemKandang._id.toString() === periode._id.toString()) {
                        dataPeriode.push(index + 1);
                    }
                });

                let namaPemilik = data[i].createdBy ? data[i].createdBy.fullname : ""
                let namaPemilikSTR = namaPemilik.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                    return letter.toUpperCase();
                });
                result.push({
                    idPeriode: periode.id,
                    tanggalClosing: periode.tanggalAkhir,
                    idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                    namaPemilik: namaPemilikSTR,
                    idKandang: data[i]._id,
                    namaKandang: data[i].kode,
                    periodeKe: dataPeriode[0],
                    idKemitraan: periode.kemitraan ? periode.kemitraan._id : null,
                    kemitraan: periode.kemitraan ? periode.kemitraan.name : "",
                    rhpp_path: periode.rhpp_path ? periode.rhpp_path : ""
                });
            }
        }
        if (peternak) {
            result = result.filter(item => item.namaPemilik.toLowerCase().indexOf(peternak) > -1);
        }
        let count = result.length
        let offsetPaging;
        if (offset == 0) {
            offsetPaging = 1
        } else {
            offsetPaging = (offset / 10 + 1)
        }
        let resultSort = result.sort(dynamicSort("-tanggalClosing"));

        res.json({
            message: 'Ok',
            length: count,
            data: paginate(resultSort, limit, offsetPaging)
        })
    } catch (error) {
        next(error)
    }
}

exports.uploadRHPP =  async (req, res, next) => {
    try {
        let idPeriode = req.params.id
        let filename = Date.now()+".pdf"
        let path = "uploads/rhpp"

        // upload RHPP
        let storage = multer.diskStorage({
            destination: (req, file, cb) => {
              cb(null, path);
            },
            filename: (req, file, cb) => {
              cb(null, filename);
            },
        });
        let uploadFile = multer({
            storage: storage,
            limits: { fileSize: maxSize },
        }).single("file");
        let uploadFileMiddleware = util.promisify(uploadFile);
        await uploadFileMiddleware(req, res);

        // update RHPP periode
        let rhpp_path = path + "/" + filename
        await Periode.findByIdAndUpdate(idPeriode, {rhpp_path: rhpp_path});

        if (req.file == undefined) {
            return res.status(400).send({ message: "Please upload a file!" });
        }
        res.status(200).send({
            message: "RHPP successfully uploaded.",
        });
    } catch (error) {
        next(error);
    }
}

exports.downloadRHPP =  async (req, res, next) => {
    try {
        let dateNow = new Date(Date.now());
        dateNow = moment(dateNow).format("DD-MM-YYYY")

        // get detail kandang & periode
        let periode = await Periode.findOne({_id: req.params.id}).sort({ createdAt: -1 })
        let allPeriode = await Periode.find({kandang: periode.kandang._id}).sort('tanggalMulai')
        let dataPeriode = [];
        await Promise.map(allPeriode, async (item, index) => {
            if (item._id.toString() === periode._id.toString()) {
                dataPeriode.push({
                    periodeKe: index + 1,
                    namaKandang: item.kandang.kode,
                    idKandang: item.kandang.id
                });
            }
        });

        let path = periode.rhpp_path;
        let filename = "[RHPP]_[" + dataPeriode[0].namaKandang + "]_[Periode_" + dataPeriode[0].periodeKe + "]_" + dateNow + ".pdf"
        res.download(path, filename, (err) => {
            if (err) {
                return res.status(400).send({message: "Could not download the file. " + err});
            }
        });
    } catch (error) {
        next(error);
    }
}

exports.deleteRHPP =  async (req, res, next) => {
    try {
        let periode = await Periode.findOne({_id: req.params.id}).sort({ createdAt: -1 })
        await Periode.findByIdAndUpdate(periode.id, {rhpp_path: ""});

        fs.unlink(periode.rhpp_path, function (err) {
            if (err) {
                return res.status(400).send({message: "Delete RHPP error. " + err});
            }
            res.status(200).send({
                message: "RHPP successfully deleted.",
            });
        });
    } catch (error) {
        next(error);
    }
}