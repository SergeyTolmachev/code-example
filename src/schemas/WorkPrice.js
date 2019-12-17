const Sequelize = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const User = require('./User');
const Unit = require('./Unit');

const WorkPrice = sequelize.define('workprice', {
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
  parentId: {
    type: Sequelize.INTEGER,
    validate: {
      isInt: {
        msg: 'Должно быть целым числом',
      },
    },
  },
  type: {
    type: Sequelize.STRING(20),
    comment: 'Уникальный ключ для каждой работы по прайсу',
  },
  unitId: {
    type: Sequelize.INTEGER,
    references: {
      model: Unit,
      key: 'id',
    },
  },
  price: {
    type: Sequelize.INTEGER,
    validate: {
      isFloat: {
        msg: 'price должен быть числом',
      },
    },
    comment: 'Стоимость при объеме работ до 100м3',
  },
  price100: {
    type: Sequelize.INTEGER,
    validate: {
      isFloat: {
        msg: 'price100 должен быть числом',
      },
    },
    comment: 'Стоимость при объеме работ до 1000м3',
  },
  price1000: {
    type: Sequelize.INTEGER,
    validate: {
      isFloat: {
        msg: 'price1000 должен быть числом',
      },
    },
    comment: 'Стоимость при объеме работ до 10000м3',
  },
  price10000: {
    type: Sequelize.INTEGER,
    validate: {
      isFloat: {
        msg: 'price10000 должен быть числом',
      },
    },
    comment: 'Стоимость при объеме работ свыше 10000м3',
  },
  userId: {
    type: Sequelize.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  sets: {
    type: Sequelize.JSONB,
    comment: 'Поле для задания связи с ГЭСН',
  },
  validatedSets: {
    type: Sequelize.JSONB,
    comment: 'Sets преобразованные для распределения types для ГЭСН',
  },
  order: {
    type: Sequelize.INTEGER,
    comment: 'порядок отображения элемента',
    validate: {
      isInt: {
        msg: 'Должно быть целым числом',
      },
    },
  },
  parentType: {
    type: Sequelize.STRING(20),
    comment: 'Привязка к родителям по workType',
  },
  hidden: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    comment: 'Тип скрыт для пользователя',
  }
}, {
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
});

module.exports = WorkPrice;
