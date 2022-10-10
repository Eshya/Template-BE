const mongoose = require("mongoose");
const Promise = require("bluebird");
const redis = require("redis");
const util = require("util");
const Kandang = require('../routes/api/kandang/kandang.model')
const Periode = require('../routes/api/periode/periode.model')
const KegiatanHarian = require('../routes/api/kegiatan-harian/kegiatan-harian.model')
const fs = require('fs');
const files = fs.readdirSync(`${__dirname}/../routes/api`);
let listNotIcludedModel = ['jenisDOC','tipe','berat','ovkPakai','jenisOVK','image','pakanPakai','jenisPakan']
listNotIcludedModel.forEach(model =>{files.push(model)})
console.log(files)
const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    legacyMode: true,
    retry_strategy: () => 1000
})

const getAsync = util.promisify(client.hget).bind(client);

// client.on("error", function(error) {
//     console.error(error);
//   });
const exec = mongoose.Query.prototype.exec;

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

    const key = JSON.stringify({
    ...this.getQuery()
    });
    // console.log(key)
    
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
        obj['createdBy'] = mongoose.Types.ObjectId(obj['createdBy'])
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
    // if (obj.hasOwnProperty('kandang')){
    //   obj['kandang']=keyExists(obj['kandang'])
    // }
    // if (obj.hasOwnProperty('periode')){
    //     obj['periode']= keyExists(obj['kandang'])
    // }
    // if (obj.hasOwnProperty('produk')){
    //     obj['produk']=keyExists(obj['produk'])
    // }
    // if (obj.hasOwnProperty('jenisDOC')){
    //     obj['jenisDOC']=keyExists(obj['jenisDOC'])
    // }
    // if (obj.hasOwnProperty('kemitraan')){
    //     obj['kemitraan']=keyExists(obj['kemitraan'])
    // }
    // if (obj.hasOwnProperty('tipe')){
    //     obj['tipe']=keyExists(obj['tipe'])
    // }
    // if (obj.hasOwnProperty('berat')){
    //     obj['tipe']=keyExists(obj['tipe'])
    // }
    // if (obj.hasOwnProperty('province')){
    //     obj['province']=keyExists(obj['province'])
    // }
    // if (obj.hasOwnProperty('regency')){
    //     obj['regency']=keyExists(obj['regency'])
    // }
    // if (obj.hasOwnProperty('ovkPakai')){
    //     obj['ovkPakai']=arrayJson(keyExists(obj['ovkPakai']))
    // }
    // if (obj.hasOwnProperty('jenisOVK')){
    //     obj['jenisOVK']=keyExists(obj['jenisOVK'])
        
    // }
    // console.log(obj)
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
