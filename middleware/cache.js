// const mcache = require('memory-cache');
const redisClient = require('../config/redisInit');


module.exports = (lifetime) => {
    return function cache (req, res, next){

        let key = "__logcat__" + req.url
        console.log(key)
        // let cachedResponse = mcache.get(key)
        redisClient.get(key, (err, cachedResponse) => {
            if (err) {
                console.log("error getting data from cache : ", err)
            }
            // let cachedResponse = data
            if(cachedResponse){
                console.log("Reading data from cache only")
                return res.json(JSON.parse(cachedResponse))
            } else {
                res.sendWithCache = res.json
                res.json = (data) => {
                    // mcache.put(key, data, lifetime * 1000)
                    redisClient.setex(key, lifetime * 1000, JSON.stringify(data))
                    console.log("Saved new data in cache")
                    res.sendWithCache(data)
                }
                next()
            }
        })
    }
}
