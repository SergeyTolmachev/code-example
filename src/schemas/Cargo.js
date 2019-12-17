const Sequelize = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const Cargo = sequelize.define('cargo', {
  title: {
    type: Sequelize.STRING(150),
    allowNull: false,
    validate: {
      len: {
        args: [5, 150],
        msg: 'Минимальная длина - 5 символов',
      }
    },
  },
  price: {
    type: Sequelize.FLOAT,
    allowNull: false,
    validate: {
      isFloat: {
        msg: 'price должен быть числом',
      },
    },
  },
  userId: {
    type: Sequelize.INTEGER,
  },
  distance: {
    type: Sequelize.INTEGER,
    allowNull: false,
    comment: 'Расстояние по умолчанию для расчета доставки',
    validate: {
      isInt: {
        msg: 'distance должна быть целым числом',
      },
    },
  },
  cargoClass: {
    type: Sequelize.INTEGER,
    allowNull: false,
    comment: 'Класс груза для расчета доставки',
    validate: {
      isInt: {
        msg: 'cargoClass должна быть целым числом',
      },
    },
  },
}, {
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
});


module.exports = Cargo;
