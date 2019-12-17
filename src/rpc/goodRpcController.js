const BaseRpcController = require('../controllers/baseController');
const { Op } = require('sequelize');
const FgisClassifier = require('../schemas/FgisClassifier');
const Good = require('../schemas/Good');

class GoodRpcController extends BaseRpcController {
  async getList(req, res, next) {
    req.query = req.body;
    delete req.body;

    const {onlyOwnChildren, search, withoutCost} = req.query;
    let {classifierId} = req.query;

    if (typeof classifierId === 'number') {
      classifierId = [classifierId];
    }
    req.query.averageCost = {[Op.not]: null};

    if (withoutCost) {
      delete req.query.withoutCost;
      delete req.query.averageCost;
    }

    if (onlyOwnChildren || search) {
      return super.getList(req, res, next);
    }

    let classifiers = await FgisClassifier.findAll({
      where: {parentId: classifierId},
      attributes: ['id']
    });

    classifiers = classifiers.map(item => (item.dataValues.id));
    classifiers = classifiers.concat(classifierId);
    req.query.classifierId = classifiers;
    return super.getList(req, res, next);
  }

}

module.exports.controller = new GoodRpcController(Good, {
  searchField: ['title'],
  individualHooks: true,
});
