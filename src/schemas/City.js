const Sequelize = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const City = sequelize.define('city', {
  title: {
    type: Sequelize.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [4, 150],
        msg: 'Минимальная длина - 4 символа'
      },
    },
  },
  district: {
    type: Sequelize.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [4, 150],
        msg: 'Минимальная длина - 4 символа'
      },
    },
  },
  regionId: {
    type: Sequelize.INTEGER,
  },
}, {
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
});

module.exports = City;
