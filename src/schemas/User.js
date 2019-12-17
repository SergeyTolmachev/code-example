const Sequelize = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const User = sequelize.define('user', {
  password: {
    type: Sequelize.STRING(100),
    allowNull: false,
  },
  firstname: {
    type: Sequelize.STRING(100),
  },
  lastname: {
    type: Sequelize.STRING(100),
  },
  companyId: {
    type: Sequelize.INTEGER,
  },
  email: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
  },
  phonenumber: {
    type: Sequelize.STRING(15),
  },
  ipAddress: {
    type: Sequelize.STRING(100),
  },
  token: {
    type: Sequelize.STRING(300),
  },
  browser: {
    type: Sequelize.STRING(300),
  },
  group: {
    type: Sequelize.INTEGER
  },
  isActive: {
    type: Sequelize.BOOLEAN,
  },
  isEmailConfirmed: {
    type: Sequelize.BOOLEAN,
  },
  hash: {
    type: Sequelize.STRING(50),
  },
  hashType: {
    type: Sequelize.INTEGER,
  },
  hashItem: {
    type: Sequelize.STRING(100),
  },
  companyType: {
    type: Sequelize.INTEGER,
  },
  nextPaymentDate: {
    type: Sequelize.DATE,
  },
  paymentType: {
    type: Sequelize.INTEGER,
  },
}, {
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
  indexes: [
    {
      name: 'user_email_key',
      unique: true,
      fields: ['email', 'deletedAt'],
    }
  ]
});


module.exports = User;
