const {parseQuery} = require('../../../helpers')
const Image = require('./chickenShed-image.model')
const {IncomingForm} = require('formidable');
const UPLOAD_DIR = './uploads/images/chicken-shed'
const fs = require('fs')

exports.findAll = (req, res, next) => {
  const {where, limit, offset, sort} = parseQuery(req.query)
  const count = Image.countDocuments(where)
  const data = Image.find(where).limit(limit).skip(offset).sort(sort).select('-__v')
  Promise.all([count, data])
  .then(results=> {
    res.json({
      length: results[0],
      data: results[1]
    })
  }, err=> next(err))
}

exports.findById = (req, res, next)=>{
  Image.findById(req.params.id)
  .then(results =>{
    res.json({
      data : results,
      message: 'OK'
    })
  })
  .catch(err => next(err))
}
exports.insert = (req, res, next)=>{
  Image.create(req.body, (err, results)=>{
    if(err) return next(err)
    res.json({
      data : results,
      message: 'OK'
    })
  })
}
exports.updateById = (req, res, next)=>{
  Image.findByIdAndUpdate(req.params.id, req.body, {new: true, upsert:false, multi: false}).exec((err, results)=>{
    if(err) return next(err)
    res.json({
      data : results,
      message: 'OK'
    })
  })
}
exports.updateWhere = (req, res, next)=>{
  const {where} = parseQuery(req.query);
  Image.findOneAndUpdate(where, req.body, {new: true, upsert:false, multi: false}).exec((err, results)=>{
    if(err) return next(err)
    res.json({
      data : results,
      message: 'OK'
    })
  })
}
exports.remove = (req, res, next)=>{
  const {where} = parseQuery(req.query);
  Image.deleteMany(where).exec((err, results)=>{
    if(err) return next(err)
    res.json({
      data : results,
      message: 'OK'
    })
  })
}

const removeFile = (url)=>{
  return new Promise((resolve)=>{
    fs.unlink(url, err=>{
      if(err) resolve();
      resolve()
    })
  })
}

exports.removeById = (req, res, next)=>{
  const docID = req.params.id
  Image.findById(docID)
  .then(doc=>{
    if(doc){
      const url =  doc.path
      const rmFile = removeFile(url)
      const rmData = Image.findByIdAndRemove(docID)
      return Promise.all([rmFile, rmData])
    }
  })
  .then(removed=>{
    res.json(removed)
  })
  .catch(err=>next(err))
}

exports.upload = (req, res, next) => {
  const form = new IncomingForm()
  form.uploadDir = UPLOAD_DIR
  form.keepExtensions = true
  form.maxFileSize = 5 * 1024 * 1024
  form.parse(req)
  let uploaded = {}
  form.on('file', (x, file) => {
    uploaded = file
  })
  form.on('end', ()=> {
    const {name, type, size, path} = uploaded
    Image.create({name, type, size, path}).then((results)=>{
      res.json({
        data : results,
        message: 'OK'
      })
    }).catch(err => {
      return next(err)
    })
  })
}