const Redis = require('ioredis');

const config = require('../config');

const redis = new Redis({
  ...config.redis,
});

console.log('Redis подключен');

module.exports = redis;
