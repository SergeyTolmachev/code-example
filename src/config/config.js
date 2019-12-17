require('dotenv').config();

const path = require('path');

const getRootPath = () => {
  let rootPath = path.resolve(__dirname);
  rootPath = rootPath.split('/');

  rootPath.pop();
  rootPath.pop();

  rootPath = rootPath.join('/');
  rootPath = path.normalize(rootPath);

  return rootPath;
};

module.exports = {
  port: process.env.APPLICATION_PORT,
  postgres: {
    login: process.env.POSTGRES_LOGIN,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
  },
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'redis',
    family: process.env.REDIS_FAMILY || 4,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0,
  },
  jwtSecret: process.env.JWT_SECRET,
  rootPath: getRootPath(),
  unisenderApiKey: process.env.UNISENDER_KEY,
  unisenderUser: process.env.UNISENDER_USER,
  unisenderUrl: 'https://api.unisender.com',
  unisenderMail: 'localhost@gmail.com',
  enviroment: process.env.NODE_ENV,
};
