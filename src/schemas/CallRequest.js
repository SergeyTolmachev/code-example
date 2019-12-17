const Sequelize = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const CallRequest = sequelize.define('callrequest', {
  name: {
    type: Sequelize.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [4, 150],
        msg: 'Минимальная длина - 4 символа'
      },
    },
  },
  phonenumber: {
    type: Sequelize.STRING(20),
    allowNull: false,
    validate: {
      len: {
        args: [10, 20],
        msg: 'Длина телефона от 10 до 20 символов'
      },
    },
  },
  comment: {
    type: Sequelize.TEXT,
  },
}, {
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
});

module.exports = CallRequest;
