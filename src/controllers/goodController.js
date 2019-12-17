const { Op } = require('sequelize');
const BaseController = require('./baseController');
const FgisClassifier = require('../schemas/FgisClassifier');
const Good = require('../schemas/Good');

class GoodController extends BaseController {
  async getList(req, res, next) {
    const {
      onlyOwnChildren, search, withoutCost, hasBrutto
    } = req.query;
    let { classifierId } = req.query;

    if (typeof classifierId === 'number') {
      classifierId = [classifierId];
    }
    req.query.averageCost = { [Op.not]: null };

    if (withoutCost) {
      delete req.query.withoutCost;
      delete req.query.averageCost;
    }

    if (onlyOwnChildren || search) {
      return super.getList(req, res, next);
    }

    if (hasBrutto === 'false') {
      delete req.query.hasBrutto;
      req.query.brutto = null;
    }

    if (classifierId) {
      let classifiers = await FgisClassifier.findAll({
        where: { parentId: classifierId },
        attributes: ['id']
      });

      classifiers = classifiers.map(item => (item.dataValues.id));
      classifiers = classifiers.concat(classifierId);
      req.query.classifierId = classifiers;
    }

    return super.getList(req, res, next);
  }
}

module.exports.controller = new GoodController(Good, {
  searchField: ['title'],
  individualHooks: true,
  pagination: true
});
