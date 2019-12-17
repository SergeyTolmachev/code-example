const Sequelize = require('sequelize');
const { postgres } = require('../config');

const sequelize = new Sequelize(postgres.database,
  postgres.login,
  postgres.password,
  {
    host: postgres.host,
    dialect: 'postgres',
    port: postgres.port,
    logging: false,
    pool: {
      max: 5,
      min: 1,
      idle: 60000,
      acquire: 60000,
      evict: 60000,
      handleDisconnects: true
    },
  });


sequelize
  .authenticate()
  .then(() => {
    console.log('Соединение с базой данных успешно установлено');
  })
  .catch((err) => {
    console.log('Ошибка подключения к базе данных: ', err);
  });

sequelize.sync();

module.exports = sequelize;
