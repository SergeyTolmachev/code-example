const pather = require('path');

let path = '.devenv';
if (process.env.NODE_ENV === 'production') {
  path = pather.resolve(process.cwd(), '.prodenv');
} else {
  path = pather.resolve(process.cwd(), '.devenv');
}
require('dotenv').config({ path });

module.exports = {
  development: {
    username: process.env.POSTGRES_LOGIN,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
  },
  production: {
    username: process.env.POSTGRES_LOGIN,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
  },
};
