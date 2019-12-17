const jwt = require('jsonwebtoken');

const { EVENT_TYPES, HASH_TYPES, TARIFF_PLANS, USER_AUTH_STATUSES } = require('../config/constants');
const BaseRpcController = require('./baseRpcController');
const BaseRpcValidator = require('./baseRpcValidator');
const Builder = require('../schemas/Builder');
const Lead = require('../schemas/Lead');
const Event = require('../schemas/Event');
const User = require('../schemas/User');
const { getHash, decrypt, encrypt } = require('../utils/utils');
const { jwtSecret } = require('../config/config');

const emailService = require('../services/emailService');

const { required, length, isEmail } = require('../utils/validators');

class UserRpcController extends BaseRpcController {
  async auth(req, res, next) {
    let { email } = req.body;
    email = email.toLowerCase();
    let user = await User.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(400).json({ _error: 'Введен неверный email или пароль' });
    }

    if (!user.dataValues.isEmailConfirmed) {
      return res.status(400).json({ _error: 'Данный email является не подтвержденным' });
    }
    const isRightPassword = await decrypt(req.body.password, user.password);
    if (!isRightPassword) {
      return res.status(400).json({ _error: 'Введен неверный email или пароль' });
    }
    const token = await jwt.sign({
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 8),
      email,
    }, jwtSecret);

    await User.update({
      ipAddress: req.ip,
      token,
      browser: req.headers['user-agent'],
    }, {
      where: { id: user.dataValues.id },
    });

    user = await User.findOne({
      where: {
        email,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });

    const info = await this.tariffInfoByCompanyId(user.dataValues.companyId);

    user.dataValues = { ...user.dataValues, ...info };

    req.brute.reset();

    return res.status(200).json({ token, user });
  }

  async me(req, res, next) {
    if (!req.user) {
      return res.status(401).json(USER_AUTH_STATUSES.NO_TOKEN);
    }
    const user = await User.findOne({
      where: {
        id: req.user.id
      },
      attributes: {
        exclude: this.config.exclude
      }
    });

    const info = await this.tariffInfoByCompanyId(user.dataValues.companyId);

    user.dataValues = { ...user.dataValues, ...info };

    return res.status(200).json(user.dataValues);
  }

  async recoveryPassword(req, res, next) {
    const hash = await getHash(User);
    let { email } = req.body;
    email = email.toLowerCase();
    await User.update({ hash, hashType: HASH_TYPES.CHANGE_PASSWORD }, {
      where: {
        email,
      },
    });
    const user = await User.findOne({
      where: {
        email,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    await emailService.sendPasswordRecoveryEmail(email, hash);
    return res.status(200).json(user.dataValues);
  }

  async approveRecoveryPassword(req, res, next) {
    const { hash, password } = req.body;
    const instance = await User.findOne({
      where: {
        hash,
        hashType: HASH_TYPES.CHANGE_PASSWORD,
      },
    });
    if (!instance) {
      return res.status(400).json({ _error: 'Отсутствует введенный hash' });
    }

    const passwordToSave = await encrypt(password);
    await User.update({
      hash: null,
      hashType: null,
      password: passwordToSave,
    }, {
      where: {
        hash,
      },
    });
    const user = await User.findOne({
      where: {
        id: instance.dataValues.id,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    return res.status(200).json(user.dataValues);
  }

  async changeEmail(req, res, next) {
    let { email } = req.body;
    email = email.toLowerCase();
    const hash = await getHash(User);
    const count = await User.count({ where: { email } });
    if (count > 0) {
      return res.status(400).json({ _error: 'Данный email уже зарегистрирован в системе' });
    }
    await User.update({ hash, hashType: HASH_TYPES.CHANGE_EMAIL, hashItem: email }, {
      where: {
        id: req.user.id,
      },
    });
    const user = await User.findOne({
      where: {
        id: req.user.id,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    await emailService.sendChangeEmailConfirm(user.dataValues.email, hash, email);
    return res.status(200).json(user.dataValues);
  }

  async approveChangeEmail(req, res, next) {
    const { hash } = req.body;
    const instance = await User.findOne({
      where: {
        hash,
        hashType: HASH_TYPES.CHANGE_EMAIL,
      },
    });
    if (!instance) {
      return res.status(400).json({ _error: 'Отсутствует введенный hash' });
    }
    await User.update({
      hash: null,
      hashType: null,
      hashItem: null,
      email: instance.dataValues.hashItem,
    }, {
      where: {
        hash,
      },
    });
    const user = await User.findOne({
      where: {
        id: instance.dataValues.id,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    return res.status(200).json(user.dataValues);
  }

  async changePassword(req, res, next) {
    const hash = await getHash(User);
    const { password } = req.body;

    const hashItem = await encrypt(password);
    await User.update({ hash, hashType: HASH_TYPES.CHANGE_PASSWORD, hashItem }, {
      where: {
        id: req.user.id,
      },
    });
    const user = await User.findOne({
      where: {
        id: req.user.id,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    await emailService.sendChangePasswordConfirm(req.user.email, hash);
    return res.status(200).json(user.dataValues);
  }

  async approveChangePassword(req, res, next) {
    const { hash } = req.body;
    const instance = await User.findOne({ where: { hash, hashType: HASH_TYPES.CHANGE_PASSWORD } });
    if (!instance) {
      return res.status(400).json({ _error: 'Данный hash отсутствует в системе' });
    }
    await User.update({
      password: instance.dataValues.hashItem,
      hash: null,
      hashItem: null,
      hashType: null,
    }, {
      where: {
        hash,
      },
    });
    const user = await User.findOne({
      where: {
        id: instance.dataValues.id,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    return res.status(200).json(user.dataValues);
  }

  async tariffInfoByCompanyId(companyId) {
    let result = { tariff: TARIFF_PLANS.free.code };

    const company = await Builder.findOne({ where: { id: companyId } });

    if (company) {
      const { tariff, nextTariff, paymentType, nextPaymentDate } = company.dataValues;
      result = { tariff, nextTariff, paymentType, nextPaymentDate };
    }

    return result;
  }

  async openWebSite(req, res, next) {
    const { hash } = req.params;
    const event = await Event.findOne({ where: { hash } });

    if (!event) {
      return res.status(400).json({ _error: 'There is no events with the same hash' });
    }
    const { leadId, id } = event.dataValues;
    const count = await Event.count({ where: { leadId, type: EVENT_TYPES.OPENED_WEBSITE.code } });
    if (count > 0) {
      return res.status(200);
    }
    await Lead.decrement('priority', { where: { id: leadId } });
    await Event.create({
      comment: `Событие отправки Welcome Email с id ${id}`,
      leadId,
      type: EVENT_TYPES.OPENED_WEBSITE.code,
    });
    return res.status(200);
  }

  async pressedLandingButton(req, res, next) {
    const { hash } = req.body;
    await Event.create({
      hash,
      type: EVENT_TYPES.PRESSED_LANDING_BUTTON.code,
    });
    return res.status(200).send('OK');
  }
}

module.exports.controller = new UserRpcController(User, {
  exclude: ['createdAt', 'password', 'updatedAt', 'ipAddress', 'token', 'browser', 'deletedAt', 'hash', 'hashType', 'hashItem'],
});

class UserRpcValidator extends BaseRpcValidator {
  auth(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      email: [required],
      password: [required, length(7, 20)],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  changePassword(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      password: [required, length(7, 20)],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  me(req, res, next) {
    next();
  }

  recoveryPassword(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      email: [required, isEmail],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  approvePassword(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      hash: [required, length(1, 30)],
      password: [required, length(7, 30)]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  approveEmail(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      hash: [required, length(7, 39)]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  getLinkToChangeEmail(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      email: [required, isEmail]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }
}

module.exports.validator = new UserRpcValidator();
