const mongoose = require("mongoose");
const Promise = require("bluebird");
const redis = require("redis");
const util = require("util");
const Kandang = require('../routes/api/kandang/kandang.model')
const Periode = require('../routes/api/periode/periode.model')
const KegiatanHarian = require('../routes/api/kegiatan-harian/kegiatan-harian.model')
const fs = require('fs');
const files = fs.readdirSync(`${__dirname}/../routes/api`);
const PATH_REDIS_SPACE = 3 ;
let listNotIcludedModel = ['createdBy','jenisDOC','tipe','berat','ovkPakai','jenisOVK','image','pakanPakai','jenisPakan','idKandang','fotoKandang','fotoRecording']
listNotIcludedModel.forEach(model =>{files.push(model)})
console.log(files)

const redisPATH = process.env.REDIS_PATH

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    legacyMode: true,
    retry_strategy: () => 1000
})
client.select(redisPATH, function() { console.log(`select redis db ${redisPATH}`); })
const getAsync = util.promisify(client.hget).bind(client);

// client.on("error", function(error) {
//     console.error(error);
//   });
const exec = mongoose.Query.prototype.exec;
const find = mongoose.Query.prototype.find;
const findOne = mongoose.Query.prototype.findOne;
const countDocuments = mongoose.Query.prototype.countDocuments;
//use this command untuk membedakan find and findOne
// if findOne query => codeCRUD = 1
// if find query => codeCRUD = 0
mongoose.Query.prototype.find = function(){
    this.cmd = 0
    return find.apply(this,arguments);
}

mongoose.Query.prototype.findOne = function(){
    this.cmd = 1
    return findOne.apply(this,arguments);
}
mongoose.Query.prototype.countDocuments = function(){
    this.cmd = 2
    return countDocuments.apply(this,arguments);
}

mongoose.Query.prototype.cache = function(options = { time: process.env.REDIS_TIME }) {
    this.useCache = true;
    this.time = options.time;
    this.hashKey = JSON.stringify(options.key || this.mongooseCollection.name);
    return this;
};




mongoose.Query.prototype.exec = async function() {
    
    if (!this.useCache) {
    return await exec.apply(this, arguments);
    }
    
    if(this.cmd==0)client.select(redisPATH)
    else if(this.cmd==1)client.select(parseInt(redisPATH) + PATH_REDIS_SPACE)
    else if(this.cmd==2)client.select((parseInt(redisPATH) + (PATH_REDIS_SPACE*2)))
    else client.select(redisPATH)
    
    RegExp.prototype.toJSON = RegExp.prototype.toString;
    const key = JSON.stringify({
    ...this.getQuery(),...this.getOptions()
    });
    
    // const cacheValue = await client.HGETALL(this.hashKey, key);
    const cacheValue = await getAsync(this.hashKey,key)
    
    if (cacheValue !== null) {
        const doc = JSON.parse(cacheValue);
        // const cacheParse = keyExists(obj)
        
        // console.log(cacheParse)

        return Array.isArray(doc)
        ? arrayJson(doc)
        : keyExists(doc);
        // console.log(doc.length())
    }

    const result = await exec.apply(this, arguments);
    // console.log(result)
    await client.hset(this.hashKey,key, JSON.stringify(result))
    // client.hset(this.hashKey,key, result);
    await client.expire(this.hashKey, this.time);

    // console.log("Response from MongoDB");
    
    return result;
};

const keyExists = (obj) => {
    
    if (!obj || (typeof obj !== "object" && !Array.isArray(obj))) {
      return obj; // quit revursive
    }
    /// convertData
    if (obj.hasOwnProperty('_id')) {
      obj['_id']=mongoose.Types.ObjectId(obj['_id'])
    }
    if (obj.hasOwnProperty('createdBy')) {
        if(mongoose.Types.ObjectId.isValid(obj['createdBy'])){
            obj['createdBy'] = mongoose.Types.ObjectId(obj['createdBy'])
        }
    }


    if (obj.hasOwnProperty('createdAt')) {
        obj['createdAt']= obj['createdAt'] !== null ? new Date(obj['createdAt']) : null
    }
    if (obj.hasOwnProperty('updatedAt')) {
        obj['updatedAt']= obj['updatedAt'] !== null ? new Date(obj['updatedAt']) : null
    }
    if (obj.hasOwnProperty('tanggal')) {
        obj['tanggal']= obj['tanggal'] !== null ? new Date(obj['tanggal']) : null
    }
    if (obj.hasOwnProperty('tanggalMulai')) {
        obj['tanggalMulai']= obj['tanggalMulai'] !== null ? new Date(obj['tanggalMulai']) : null
    }
    if (obj.hasOwnProperty('tanggalAkhir')) {
        obj['tanggalAkhir']= obj['tanggalAkhir'] !== null ? new Date(obj['tanggalAkhir']) : null
    }
    
    /// recursive nested data 
    files.forEach((endpoint)=> {
        if (endpoint!='index.js') {
            
            if (obj.hasOwnProperty(endpoint)){
                if (Array.isArray(obj[endpoint])){
                    obj[endpoint]=arrayJson(keyExists(obj[endpoint]))
                    
                }
                else if(mongoose.Types.ObjectId.isValid(obj[endpoint])){
                    obj[endpoint]=mongoose.Types.ObjectId(obj[endpoint])
                }
                else{
                    obj[endpoint]=keyExists(obj[endpoint])
                }
                
            }
        }
    });
    return obj;
  };

function arrayJson(array){
    let json = [];
    for(let i=0; i< array.length;i++){
        json.push(keyExists(array[i]))
    }
    return json;
}
module.exports = {
    clearKey(hashKey) {
    client.del(JSON.stringify(hashKey));
    }
};
