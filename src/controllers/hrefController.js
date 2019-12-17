const BaseController = require('./baseController');
const BaseValidator = require('./baseValidator');
const {
  boolean, float, length, required, number, isUrl
} = require('../utils/validators');

const Href = require('../schemas/Href');
const HrefHistory = require('../schemas/HrefHistory');
const Good = require('../schemas/Good');

const money = require('../utils/money');

const HrefParseService = require('../parse/href/HrefParseService');

class HrefController extends BaseController {
  async create(req, res, next) {
    let { parseCoeff } = req.body;
    const { price, manualControl } = req.body;
    parseCoeff = parseCoeff || 1;
    const isParentExist = await Good.count({
      where: {
        id: req.body.goodId,
      },
    });

    if (isParentExist <= 0) {
      return res.status(400).json({ _error: 'Good с таким Id не существует' });
    }

    if (manualControl) {
      const providerId = await HrefParseService.getProvider(req.body.href);

      if (!providerId) {
        return res.status(400).json({ _error: 'Отсутствует provider' });
      }
      if (!providerId) {
        return res.status(400).json({ _error: 'При ручном вводе цены обязательно указать price'})
      }

      req.body.providerId = providerId;

    } else {
      const result = await HrefParseService.parseHrefInfo(req.body.href);

      if (result) {
        const { providerId, price: parsedPrice } = result;
        req.body.providerId = providerId;
        if (!parsedPrice) {
          return res.status(400).json({ _error: 'Цена не распознана' });
        }
        req.body.price = money.round(parsedPrice * parseCoeff);
      }

      if (!result) {
        return res.status(400).json({ _error: 'Ссылка не распознана' });
      }
    }

    return super.create(req, res, next);
  }

  async update(req, res, next) {
    const instance = await this.schema.findOne({
      where: { id: req.body.id },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    instance.dataValues.hrefId = instance.dataValues.id;
    delete instance.dataValues.id;

    const { price, parseCoeff } = req.body;
    await HrefHistory.create({ ...instance.dataValues });

    if (!price && parseCoeff) {
      req.body.price = money.round(instance.dataValues.price * parseCoeff);
    }
    if (price && !parseCoeff) {
      req.body.price = money.round(price * instance.dataValues.parseCoeff);
    }
    if (price && parseCoeff) {
      req.body.price = money.round(price * parseCoeff);
    }
    return super.update(req, res, next);
  }
}

module.exports.controller = new HrefController(Href);

class HrefValidator extends BaseValidator {
  getList(req, res, next) {
    const { validated, errors } = this.validate(req.query, {
      goodId: [required],
      regionId: [number],
      providerId: [number],
      page: [number],
      pageSize: [number],
    });
    req.query = validated;
    req.errors = errors;
    next();
  }

  create(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      regionId: [required, number],
      goodId: [required, number],
      href: [required, isUrl],
      parseCoeff: [number],
      price: [number],
      manualControl: [boolean],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  update(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      id: [required, number],
      regionId: [number],
      goodId: [number],
      price: [float],
      title: [length(5, 200)],
      providerId: [number],
      href: [isUrl],
      parseCoeff: [number],
      manualControl: [boolean],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }
}

module.exports.validator = new HrefValidator();
