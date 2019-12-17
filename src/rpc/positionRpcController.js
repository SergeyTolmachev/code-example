const { DateTime } = require('luxon');
const { USER_GROUPS } = require('../config/constants');

const BaseRpcController = require('./baseRpcController');
const BaseRpcValidator = require('./baseRpcValidator');
const Position = require('../schemas/Position');
const Good = require('../schemas/Good');
const Href = require('../schemas/Href');
const Provider = require('../schemas/Provider');
const PositionHistory = require('../schemas/PositionHistory');

const positionService = require('../services/positionService');
const uploadService = require('../services/uploadService');

const { required, number, boolean } = require('../utils/validators');

class PositionRpcController extends BaseRpcController {
  async assignGood(req, res, next) {
    const { positionId, goodId, assigned } = req.body;
    const position = await Position.findOne({ where: { id: positionId } });

    if (!position) {
      return res.status(400).json({ _error: 'Отсутствует позиция с данным id' });
    }

    const good = await Good.findOne({ where: { id: goodId } });
    if (!good) {
      return res.status(400).json({ _error: 'Отсутствует материал с данным id' });
    }

    await Position.update({
      goodId: assigned ? goodId : null,
      assigned
    }, {
      where: {
        id: positionId,
      },
    });

    const count = await Position.count({
      where: {
        providerId: position.dataValues.providerId,
        goodId: null,
        assigned: false
      }
    });

    await Provider.update({
      hasUnassignedMaterials: !!count,
    }, {
      where: { id: position.dataValues.providerId }
    });

    const positionUpdated = await Position.findOne({ where: { id: positionId },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'version'],
      }
    });

    return res.status(200).json(positionUpdated.dataValues);
  }

  async getPositionsFromFile(req, res, next) {
    const { file } = req.files;
    const extension = uploadService.getExtension(file.originalFilename);
    if (extension !== 'xml') {
      return res.status(400).json({ file: 'Файл должен быть xml' });
    }
    const { providerId } = req.body;
    const provider = await Provider.findOne({ where: { id: providerId } });
    if (!provider) {
      return res.status(400).json({ _error: 'Отсутствует поставщик с данным id' });
    }
    if (provider.dataValues.parentProviderId !== req.user.companyId
      && req.user.group !== USER_GROUPS.SERVICE_SUPER_ADMIN) {
      return res.status(400).json({ _error: 'Недостаточно прав для получения списка' });
    }
    if (!provider.dataValues.isAllowUpload) {
      return res.status(400).json({
        _error: 'Производится обработка ранее загруженного файла, повторите попытку позже',
      });
    }
    await Provider.update({ isAllowUpload: false }, { where: { id: providerId } });

    const fileInfo = await uploadService.createFile(
      file.originalFilename, file.size, file.path, 'xml', {}
    );

    const result = await positionService.build(fileInfo, { providerId });

    if (!result.isXML) {
      await Provider.update({ isAllowUpload: true }, { where: { id: providerId } });
      return res.status(400).json({ _error: 'Неверная структура xml' });
    }

    res.status(200).json({
      error: false,
      message: 'Файл передан в обработку, результаты будут отображены по окончании его обработки',
    });

    const { hasUnassignedMaterials, created } = await positionService.update(result);

    const update = {
      isAllowUpload: true,
      hasUnassignedMaterials,
    };

    if (created) {
      update.lastUploadDate = DateTime.local().toString();
    }

    await Provider.update(update, {
      where: {
        id: providerId,
      },
    });
    console.log('Everything is done;');
  }

  async getDiffPosition(req, res, next) {
    const { providerId } = req.body;

    const provider = await Provider.findOne({ where: { id: providerId } });
    if (!provider) {
      return res.status(400).json({ _error: 'Отсутствует поставщик с данным id' });
    }
    if (provider.dataValues.parentProviderId !== req.user.companyId
      && req.user.group !== USER_GROUPS.SERVICE_SUPER_ADMIN) {
      return res.status(400).json({ _error: 'Недостаточно прав для получения списка' });
    }
    const positionsHistory = await PositionHistory.findAll({
      where: {
        providerId,
        version: provider.dataValues.version - 1,
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'version', 'goodId'],
      },
      order: [['positionId', 'ASC']],
      paranoid: false,
    });
    const ids = positionsHistory.map(history => (history.dataValues.positionId));
    const positions = await Position.findAll({
      where: {
        id: ids,
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'version', 'goodId'],
      },
      order: [['id', 'ASC']],
      paranoid: false,
    });
    return res.status(200).json({ positions, positionsHistory });
  }

  async getPositionOrHref(req, res, next) {
    const { priceId } = req.body;
    if (Array.isArray(priceId) && priceId.length > 0) {
      for (let i = 0; i < priceId.length; i = i + 1) {
        if (String(priceId[i]).indexOf('h_') > -1) {
          const id = String(priceId[i]).replace('h_', '');
          const instance = await Href.findOne({ where: { id } });
          priceId[i] = {
            ...instance.dataValues,
            priceId: priceId[i],
          };
        }
        if (String(priceId[i]).indexOf('p_') > -1) {
          const id = String(priceId[i]).replace('p_', '');
          const instance = await Position.findOne({ where: { id } });
          priceId[i] = {
            ...instance.dataValues,
            priceId: priceId[i],
          };
        }
      }
      return res.status(200).json(priceId);
    }
    if (String(priceId).indexOf('h_') > -1) {
      const id = String(priceId).replace('h_', '');
      const href = await Href.findOne({ where: { id } });
      return res.status(200).json(href);
    }
    if (String(priceId).indexOf('p_') > -1) {
      const id = String(priceId).replace('p_', '');
      const position = await Position.findOne({ where: { id } });
      return res.status(200).json(position);
    }
    return res.status(400).json({ _error: 'Неверный формат priceId' });
  }
}

module.exports.controller = new PositionRpcController(Position);

class PositionRpcValidator extends BaseRpcValidator {
  assignGood(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      goodId: [required, number],
      positionId: [required, number],
      assigned: [boolean]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  getPositionsFromFile(req, res, next) {
    if (!req.files) {
      req.files = {};
    }
    const files = this.validate(req.files, {
      file: [required],
    });
    req.files = files.validated;
    req.errors = files.errors;
    const body = this.validate(req.body, {
      providerId: [required, number],
    });
    req.body = body.validated;
    req.errors = req.errors ? Object.assign(req.errors, body.errors) : body.errors;
    next();
  }

  getDiffPosition(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      providerId: [required, number],
      assigned: [boolean],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  getPositionOrHref(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      priceId: [required],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }
}

module.exports.validator = new PositionRpcValidator();
