const _ = require('underscore');
const config = require('../config/config');
const { ERRORS_FGIS } = require('../config/constants');
const { getListOfFiles } = require('../utils/utils');
const money = require('../utils/money');
const BaseRpcController = require('./baseRpcController');
const BaseRpcValidator = require('./baseRpcValidator');
const { required, number, float, length } = require('../utils/validators');
const FgisClassifier = require('../schemas/FgisClassifier');
const Estimate = require('../schemas/Estimate');
const Tender = require('../schemas/Tender');
const statisticService = require('../services/statisticService');
const uploadService = require('../services/uploadService');
const estimateService = require('../services/estimateService/index');


class EstimateRpcController extends BaseRpcController {
  async getEstimatesFromTender(req, res, next) {
    const { tenderId } = req.body;
    const tender = await Tender.findOne({
      where: {
        id: tenderId,
      },
    });
    if (!tender) {
      return res.status(404).json({
        _error: 'Тендер с данным tenderId не найден',
      });
    }
    if (!tender.files) {
      return res.status(400).json({
        _error: 'У тендера не найдены связанные файлы, выполните предварительно их парсинг',
      });
    }
    const files = getListOfFiles(tender.files.files);

    res.status(200).json({ message: 'Парсинг расчетов начат, зайдите на страницу позже' });

    for (let i = 0; i < files.length; i = i + 1) {
      if (uploadService.checkXlsExtension(files[i])) {
        const result = await estimateService.build(`${config.rootPath}/${files[i].path}`);
        const count = await Estimate.count({ where: { tenderId } });

        await Estimate.create({
          ...result,
          fileId: files[i].id,
          tenderId,
          createdById: req.user.id,
          isApproved: false,
          order: count + 1,
        });
        await statisticService.updateFgisStatistic(result);
      }
    }
  }

  async getStatisticFromEstimates(req, res, next) {
    const { tenderId } = req.body;

    const estimates = await Estimate.findAll({ where: { tenderId } });

    for (let i = 0; i < estimates.length; i = i + 1) {
      const estimate = estimates[i].dataValues;
      await statisticService.updateFgisStatistic(estimate);
    }

    return res.status(200).json({ message: 'Статистика обновлена' });
  }

  async setNoSelect(req, res, next) {
    const { coeff, estimateId } = req.body;

    const estimate = await Estimate.findOne({ where: { id: estimateId } });

    if (!estimate) {
      return res.status(404).json({ _error: 'Отсутствует estimate с данным id' });
    }

    let { materials } = estimate.dataValues;

    materials = materials.map((item) => {
      if (item.conflict && item.conflict === ERRORS_FGIS.no_price_value_no_select.code) {
        return item;
      }
    });

    materials = _.compact(materials);

    const classifiersObj = {};

    for (let i = 0; i < materials.length; i = i + 1) {
      const { classifierId, amount, price } = materials[i];
      classifiersObj[classifierId] = money.round(price / amount);

      if (coeff) {
        classifiersObj[classifierId] = money.round(classifiersObj[classifierId] * coeff);
      }
    }

    const classifiers = Object.keys(classifiersObj);

    for (let i = 0; i < classifiers.length; i = i + 1) {
      const classifier = await FgisClassifier.findOne({ where: { id: classifiers[i] } });

      const { unitFactor } = classifier.dataValues;

      const fixedPrice = money.round(classifiersObj[classifiers[i]] / unitFactor);

      if (classifier && classifier.dataValues && !classifier.dataValues.fixedPrice) {
        await FgisClassifier.update({ fixedPrice }, { where: { id: classifiers[i] } });
      }
    }

    return res.status(200).json(classifiersObj);
  }

  async findRecommendedClassifiers(req, res, next) {
    const { title } = req.body;

    const result = await estimateService.findRecommendedClassifiers(title);

    return res.status(200).json(result);
  }
}

module.exports.controller = new EstimateRpcController(Estimate);

class EstimateRpcValidator extends BaseRpcValidator {
  getEstimatesFromTender(req, res, next) {
    const body = this.validate(req.body, {
      tenderId: [required, number],
    });
    req.body = body.validated;
    req.errors = body.errors;
    next();
  }

  getStatisticFromEstimates(req, res, next) {
    const body = this.validate(req.body, {
      tenderId: [required, number],
    });
    req.body = body.validated;
    req.errors = body.errors;
    next();
  }

  setNoSelect(req, res, next) {
    const body = this.validate(req.body, {
      estimateId: [required, number],
      coeff: [float],
    });
    req.body = body.validated;
    req.errors = body.errors;
    next();
  }

  findRecommendedClassifiers(req, res, next) {
    const body = this.validate(req.body, {
      title: [required, length(3, 50)],
    });
    req.body = body.validated;
    req.errors = body.errors;
    next();
  }
}

module.exports.validator = new EstimateRpcValidator();
