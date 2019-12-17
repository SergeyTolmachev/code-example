const { Op } = require('sequelize');

const { DateTime } = require('luxon');

const {
  required, length, number, isEmail
} = require('../utils/validators');
const { COMPANIES_TYPES, HASH_TYPES, LEAD_TYPES, EVENT_TYPES, EMAIL_TEMPLATES, USER_GROUPS } = require('../config/constants');
const { rootPath } = require('../config/config');
const { encrypt, getHash } = require('../utils/utils');

const BaseRpcController = require('./baseRpcController');
const BaseRpcValidator = require('./baseRpcValidator');

const Email = require('../schemas/Email');
const Event = require('../schemas/Event');
const Lead = require('../schemas/Lead');
const User = require('../schemas/User');

const emailService = require('../services/emailService');

class EmailRpcController extends BaseRpcController {
  async confirmEmail(req, res, next) {
    const { hash } = req.body;
    const instance = await User.findOne({
      where: {
        hash,
        hashType: HASH_TYPES.CONFIRM_EMAIL,
      }
    });

    if (!instance) {
      return res.status(400).json({ _error: 'Данный hash отсутствует в базе' });
    }

    await User.update({
      hash: null,
      hashType: null,
      isEmailConfirmed: true,
    }, {
      where:
        {
          hash,
        }
    });

    const user = await User.findOne({
      where: {
        id: instance.dataValues.id,
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'password', 'browser', 'token', 'ipAddress', 'hash', 'hashType'],
      },
    });

    return res.status(200).json(user.dataValues);
  }

  async sendEmail(req, res, next) {
    const { email, substitutions, templateId } = req.body;

    try {
      const answer = await emailService.sendEmail(templateId, email, substitutions);
      return res.status(200).json(answer);
    } catch (e) {
      return res.status(e.response.status).json({ message: e.response.data.message });
    }
  }

  async createTemplate(req, res, next) {
    const { name, subject, template } = req.body;
    try {
      const answer = await emailService.createTemplate(name, subject, template);
      return res.status(201).json(answer);
    } catch (e) {
      console.log(JSON.stringify(e));
      return res.status(e.response.status).json({ message: e.response.data.message });
    }
  }

  async updateTemplate(req, res, next) {
    const { id, name, subject, template } = req.body;
    try {
      const answer = await emailService.updateTemplate(id, name, subject, template);
      return res.status(200).json(answer);
    } catch (e) {
      return res.status(e.response.status).json({ message: e.response.data.message });
    }
  }

  async deleteTemplate(req, res, next) {
    const { id } = req.body;
    const answer = await emailService.deleteTemplate(id);
    return res.status(200).json(answer);
  }

  async getTemplatesList(req, res, next) {
    const answer = await emailService.getTemplatesList();
    return res.status(200).json(answer);
  }

  async sendWelcomeEmails(req, res, next) {
    const managerId = req.user.id;
    const leads = await Lead.findAll({ where: { type: LEAD_TYPES.CLIENT, welcomeEmailDate: null, email: { [Op.ne]: null } }, attributes: ['id'], limit: 50 });
    let success = 0;
    let fails = 0;
    for (let i = 0; i < leads.length; i = i + 1) {
      const leadId = leads[i].dataValues.id;
      const result = await emailService.sendWelcomeEmail(leadId, managerId);
      await Lead.update({ welcomeEmailDate: DateTime.local().toString() }, { where: { id: leadId } });

      if (result) {
        console.log('Письмо лиду с id ', leadId, ' отправлено');
        success = success + 1;
      } else {
        console.log('Письмо лиду с id ', leadId, ' НЕ отправлено');
        fails = fails + 1;
      }
    }
    console.log('success: ', success, ' failes: ', fails);
    return res.status(200).json(`Письма ${leads.length} лидам отправлены. Продолжите использование метода завтра`);
  }

  async retrySendWelcomeEmail(req, res, next) {
    const { leadId } = req.body;
    const lead = await Lead.findOne({ where: { id: leadId } });

    const { email, title } = lead.dataValues;
    const user = await User.findOne({ where: { email } });
    let firstname = 'Пользователь';
    let lastname = 'Компании';
    let phonenumber = '';

    if (user) {
      firstname = user.dataValues.firstname;
      lastname = user.dataValues.lastname;
      phonenumber = user.dataValues.phonenumber;
    }

    const { companyId } = user.dataValues;

    const hash = await getHash(Event, 'hash');

    const password = await getHash(User, 'password');
    const passwordToSave = await encrypt(password);

    const userData = {
      password: passwordToSave,
      firstname,
      lastname,
      email,
      phonenumber,
      companyTYpe: COMPANIES_TYPES.BUILDER,
      group: USER_GROUPS.CLIENT_ADMIN,
      isActive: true,
      isEmailConfirmed: true,
      companyId,
    };

    await User.destroy({ where: { email } });
    await User.create(userData);

    await Event.create({
      leadId,
      type: EVENT_TYPES.WELCOME_EMAIL.code,
      hash,
      files: ['logo.jpg'],
      comment: '[Робот Всеволод]: welcome email отправлено повторно',
    });

    await emailService.sendEmail(EMAIL_TEMPLATES.WELCOME_EMAIL, email, { email, hash, password, title });

    return res.status(200).json(`Welcome email повторно отправлену лиду с id ${leadId}.`);
  }

  async getImageFromEmail(req, res, next) {
    const { hash } = req.params;
    if (!hash) {
      return res.status(400).json({ _error: 'There is no hash for image' });
    }
    const event = await Event.findOne({ where: { hash } });

    if (!event) {
      return res.status(400).json({ _error: 'There is no image for this hash' });
    }
    const { files, leadId, id } = event.dataValues;
    const count = await Event.count({ where: { leadId, type: EVENT_TYPES.OPENED_WELCOME_EMAIL.code } });
    if (count > 0) {
      return res.sendFile(files[0], { root: `${rootPath}/public/` });
    }
    await Lead.decrement('priority', { where: { id: leadId } });
    await Event.create({
      comment: `[Робот Всеволод]: Событие открытия Welcome Email с id ${id}`,
      leadId,
      type: EVENT_TYPES.OPENED_WELCOME_EMAIL.code,
    });
    return res.sendFile(files[0], { root: `${rootPath}/public/` });
  }
}

module.exports.controller = new EmailRpcController(Email);

class EmailRpcValidator extends BaseRpcValidator {
  confirmEmail(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      hash: [required, length(1, 20)],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  sendEmail(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      email: [required, isEmail],
      substitutions: [required],
      templateId: [required]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  createTemplate(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      name: [required, length(3, 30)],
      subject: [required, length(1, 100)],
      template: [required]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  updateTemplate(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      id: [required, length(3, 45)],
      name: [required, length(3, 30)],
      subject: [required, length(1, 100)],
      template: [required]
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  deleteTemplate(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      id: [required, length(3, 45)],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  sendWelcomeEmail(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      leadId: [required, number],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }
}

module.exports.validator = new EmailRpcValidator();
