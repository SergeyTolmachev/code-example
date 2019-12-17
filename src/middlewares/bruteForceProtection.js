const ExpressBrute = require('express-brute');
const RedisStore = require('express-brute-redis');

const config = require('../config/config');

const store = new RedisStore({
  ...config.redis,
});

const failCallback = (req, res, next, nextValidRequestDate) => {
  next({ message: 'Слишком много запросов, повторите попытку позже' });
};

const bruteforceAuth = new ExpressBrute(store, {
  freeRetries: 5,
  minWait: 30 * 1000,
  maxWait: 60 * 60 * 1000,
  failCallback,
});

const bruteforceChange = new ExpressBrute(store, {
  freeRetries: 1,
  minWait: 5 * 1000,
  maxWait: 60 * 60 * 1000,
  failCallback,
});

module.exports.bruteforceAuth = bruteforceAuth;
module.exports.bruteforceChange = bruteforceChange;
