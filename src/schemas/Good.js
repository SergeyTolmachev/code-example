const Sequelize = require('sequelize');
const { Op } = require('sequelize');
const { postgres: sequelize } = require('../config/db');

const FgisClassifier = require('./FgisClassifier');
const Href = require('./Href');
const Position = require('./Position');
const Unit = require('./Unit');

const Good = sequelize.define('good', {
  title: {
    type: Sequelize.STRING(1500),
    allowNull: false,
    validate: {
      len: {
        args: [2, 150],
        msg: 'Минимальная длина - 2 символа'
      }
    }
  },
  unitId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: Unit,
      key: 'id',
    },
  },
  amount: {
    type: Sequelize.FLOAT,
    validate: {
      isFloat: {
        msg: 'amount должен быть числом',
      },
    },
    allowNull: false
  },
  classifierId: {
    type: Sequelize.INTEGER,
    validate: {
      isInt: {
        msg: 'Должно быть числом'
      }
    },
    references: {
      model: FgisClassifier,
      key: 'id',
    },
  },
  maxCost: {
    type: Sequelize.FLOAT,
  },
  minCost: {
    type: Sequelize.FLOAT,
  },
  averageCost: {
    type: Sequelize.FLOAT,
  },
  fullUnit: {
    type: Sequelize.STRING(20),
  },
  gost: {
    type: Sequelize.STRING(100),
  },
  brutto: {
    type: Sequelize.FLOAT,
    allowNull: false,
    comment: 'Вес брутто в тоннах для расчета доставки',
  },
  cargoClass: {
    type: Sequelize.INTEGER,
    allowNull: false,
    comment: 'Класс груза для расчета доставки',
  },
}, {
  validate: {
    notOneAmount() {
      if (this.amount && +this.amount !== 1 && !this.fullUnit) {
        throw new Error('FullUnit не может быть пустым при amount не равном 1');
      }
    }
  },
  timestamps: true,
  freezeTableName: true,
  paranoid: true,
});

const setHasGoodsStatus = async (good, hasGoods) => {
  let classifierId;
  if (good && good.dataValues && good.dataValues.classifierId) {
    classifierId = good.dataValues.classifierId;
  }
  if (good && good.attributes && good.attributes.classifierId) {
    classifierId = good.attributes.classifierId;
  }
  if (!classifierId) {
    return;
  }

  const update = {
    hasGoods,
    id: classifierId,
  };

  const goodsCount = await Good.count({ where:
      {
        classifierId,
        averageCost: {
          [Op.ne]: 0,
          [Op.ne]: null,
        },
      },
  paranoid: true });
  if (goodsCount > 0) {
    update.hasGoods = true;
    update.goodsCount = goodsCount;
  } else {
    update.hasGoods = false;
  }

  await FgisClassifier.update(update,
    {
      where: {
        id: classifierId,
      },
    });
};


Good.afterCreate(async (good) => {
  await setHasGoodsStatus(good, true);
});

Good.afterBulkUpdate(async (good) => {
  await setHasGoodsStatus(good, true);
});

Good.afterBulkDestroy(async (good) => {
  const goodDB = await Good.findOne({ where: { id: good.where.id }, paranoid: false });
  await setHasGoodsStatus(goodDB, false);
});

Good.afterDestroy(async (good) => {
  await setHasGoodsStatus(good, false);
});

Good.belongsTo(Unit);

Good.belongsTo(FgisClassifier, { foreignKey: 'classifierId' });

Good.hasMany(Href);
Good.hasMany(Position);

module.exports = Good;
