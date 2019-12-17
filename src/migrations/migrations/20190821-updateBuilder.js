module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(t => Promise.all([
    queryInterface.addColumn('builder', 'subscribePhone', {
      type: Sequelize.STRING(100)
    }, { transaction: t }),
    queryInterface.addColumn('builder', 'subscribeEmail', {
      type: Sequelize.STRING(100),
    }, { transaction: t }),
    queryInterface.addColumn('builder', 'currentCardId', {
      type: Sequelize.INTEGER,
    }, { transaction: t }),
    queryInterface.addColumn('builder', 'subscribed', {
      type: Sequelize.BOOLEAN,
    }, { transaction: t }),
  ])),

  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(t => Promise.all([
    queryInterface.removeColumn('builder', 'subscribePhone', { transaction: t }),
    queryInterface.removeColumn('builder', 'subscribeEmail', { transaction: t }),
    queryInterface.removeColumn('builder', 'currentCardId', { transaction: t }),
    queryInterface.removeColumn('builder', 'subscribed', { transaction: t }),
  ]))
};
