const _ = require('underscore');
const { Op } = require('sequelize');

const FgisClassifier = require('../schemas/FgisClassifier');
const Good = require('../schemas/Good');
const Href = require('../schemas/Href');
const Position = require('../schemas/Position');
const Provider = require('../schemas/Provider');
const Unit = require('../schemas/Unit');
const WorkPrice = require('../schemas/WorkPrice');


class StructureService {
  async build(positions, materials) {
    let workPriceTypes = [];
    let goodIds = [];
    let classifierIds = [];

    positions.forEach((pos) => {
      workPriceTypes.push(pos.workPriceType);
    });

    workPriceTypes = _.uniq(_.compact(workPriceTypes));

    materials.forEach((mat) => {
      goodIds.push(mat.goodId);
      classifierIds.push(mat.classifierId);
    });

    goodIds = _.uniq(_.compact(goodIds));
    classifierIds = _.uniq(_.compact(classifierIds));


    const result = {};

    result.classifiers = await this.getClassifiers(classifierIds);

    if (goodIds && goodIds.length > 0) {
      result.goods = await this.getGoods(goodIds);
    }
    if (workPriceTypes || workPriceTypes.length > 0) {
      result.workprices = await this.getWorkPrices(workPriceTypes);
    }

    return result;
  }

  async getClassifiers(classifierIds) {
    const classifiers = await FgisClassifier.findAll({
      where: {
        id: classifierIds,
        isLeaf: true,
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'hasGoods', 'isActive'] },
    });

    const classifierObj = {};

    classifiers.forEach((classifier) => {
      if (!classifierObj[classifier.dataValues.id]) {
        classifierObj[classifier.dataValues.id] = classifier.dataValues;
      }
    });

    return classifierObj;
  }

  async getGoods(goodIds) {
    const goodsObj = {};

    const goodsDB = await Good.findAll({
      where: {
        id: {
          [Op.or]: goodIds,
        }
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'maxCost', 'minCost', 'averageCost'] },
      include: [{ model: Unit }],
    });

    goodsDB.map((item) => {
      const result = item.dataValues;
      result.unit = result.unit.dataValues.name;
      goodsObj[result.id] = { ...result, hrefs: {}, positions: {} };
    });

    const positionsDB = await Position.findAll({
      where: {
        goodId: {
          [Op.or]: goodIds,
        },
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'vendorcode', 'barcode', 'version', 'assigned'] },
      include: [{ model: Provider }],
    });

    positionsDB.map((item) => {
      const result = item.dataValues;
      if (result.provider && result.provider.dataValues) {
        result.provider = result.provider.dataValues.title;
      }
      goodsObj[result.goodId].positions[result.id] = result;
    });

    const hrefsDB = await Href.findAll({
      where: {
        goodId: {
          [Op.or]: goodIds,
        },
      },
      include: [{ model: Provider }],
    });

    hrefsDB.map((item) => {
      const result = item.dataValues;
      if (result.provider && result.provider.dataValues) {
        result.provider = result.provider.dataValues.title;
      }
      if (!result.goodId || !goodsObj[result.goodId]) {
        console.log(result.goodId);
      }
      goodsObj[result.goodId].hrefs[result.id] = result;
    });

    return goodsObj;
  }

  async getWorkPrices(workPriceTypes) {
    const workPrices = await WorkPrice.findAll({ where: { type: workPriceTypes }, attributes: ['id', 'type', 'title'] });

    const workPricesObj = {};

    workPrices.forEach((wp) => {
      const result = wp.dataValues;
      workPricesObj[result.type] = result;
    });

    return workPricesObj;
  }
}

module.exports = new StructureService();
