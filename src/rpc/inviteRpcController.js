const { USER_GROUPS, USER_INCLUSIONS } = require('../config/constants');
const BaseRpcController = require('./baseRpcController');
const BaseRpcValidator = require('./baseRpcValidator');
const Invite = require('../schemas/Invite');
const { getHash } = require('../utils/utils');

const emailService = require('../services/emailService');

const { required, number, isEmail } = require('../utils/validators');

class InviteRpcController extends BaseRpcController {
  async create(req, res, next) {
    const { companyId } = req.user;
    const { group } = req.body;
    let { email } = req.body;
    email = email.toLowerCase();
    if (!companyId
        && req.user.group !== USER_GROUPS.SERVICE_ADMIN
        && req.user.group !== USER_GROUPS.SERVICE_SUPER_ADMIN) {
      return res.status(400).json({ error: true, message: 'Ошибка при создании инвайта' });
    }
    if (USER_INCLUSIONS[req.user.group].indexOf(+group) === -1) {
      return res.status(400).json({ error: true, message: 'Недостаточно прав для создания подобной роли' });
    }
    const hash = await getHash(Invite);
    req.body = {
      companyId,
      email,
      hash,
      group,
    };
    const created = await this.schema.create({
      ...req.body,
    });
    const instance = await this.schema.findOne({
      where: {
        id: created.id,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });
    await emailService.sendRegistrationInviteEmail(email, hash);
    return res.status(201).json(instance.dataValues);
  }
}

module.exports.controller = new InviteRpcController(Invite, {
  exclude: ['createdAt', 'updatedAt', 'deletedAt'],
});

class InviteRpcValidator extends BaseRpcValidator {
  create(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      email: [required, isEmail],
      group: [required, number],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }
}

module.exports.validator = new InviteRpcValidator();
