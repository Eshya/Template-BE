const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const client = redis.createClient({
    
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    legacyMode: true,
    retry_strategy: () => 1000
    
})
client.on("connect", () => {
    console.log("Connected to our redis instance!");
    client.on('error', (err) => console.log('Redis Client Error', err));
});
// client.on('connect', () => {
//     console.log('Redis Connected!');
// });

// // Log any error that may occur to the console
// client.on("error", (err) => {
//     console.log(`Redis Error:${err}`);
// });
client.hget = util.promisify(client.get);
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
    
    
    const cacheValue = await client.get(this.hashKey, key);
    
    if (cacheValue) {
    const doc = JSON.parse(cacheValue);

    console.log("Response from Redis");
    return Array.isArray(doc)
        ? doc.map(d => new this.model(d))
        : new this.model(doc);
    }

    const result = await exec.apply(this, arguments);
    
    client.set(this.hashKey, key, JSON.stringify(result));
    client.expire(this.hashKey, this.time);

    console.log("Response from MongoDB");
    
    return result;
};

module.exports = {
    clearKey(hashKey) {
    client.del(JSON.stringify(hashKey));
    }
};
