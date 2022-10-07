const mongoose = require("mongoose");
const Promise = require("bluebird");
const redis = require("redis");
const util = require("util");
const Kandang = require('../routes/api/kandang/kandang.model')
const client = redis.createClient({
    
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    legacyMode: true,
    retry_strategy: () => 1000
    
})

const getAsync = util.promisify(client.hget).bind(client);

client.on("error", function(error) {
    console.error(error);
  });
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = { time: 300 }) {
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
        
        return Array.isArray(doc)
        ? await Promise.map(doc, async (d) => {new this.model(d)})
        : new this.model(doc);
        // console.log(doc.length())
    }

    const result = await exec.apply(this, arguments);
    // console.log(result)
    client.hset(this.hashKey,key, JSON.stringify(result));
    client.expire(this.hashKey, this.time);

    // console.log("Response from MongoDB");
    
    return result;
};

module.exports = {
    clearKey(hashKey) {
    client.del(JSON.stringify(hashKey));
    }
};
