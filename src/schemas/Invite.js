const Sequelize = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const Invite = sequelize.define('invite', {
  hash: {
    type: Sequelize.STRING(20),
  },
  companyId: {
    type: Sequelize.INTEGER,
  },
  email: {
    type: Sequelize.STRING(60),
  },
  group: {
    type: Sequelize.INTEGER,
  },
}, {
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
});


module.exports = Invite;
