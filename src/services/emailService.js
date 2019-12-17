const axios = require('axios');
const { DateTime } = require('luxon');
const { Op } = require('sequelize');
const {
  rootPath, unisenderApiKey, unisenderUrl, unisenderUser
} = require('../config/config');

const { CATEGORIES_FIELDS, EMAIL_TEMPLATES, TICKET_PERIOD, LEAD_ACTIONS, TICKET_STATUS, EVENT_TYPES, COMPANIES_TYPES } = require('../config/constants');
const { encrypt, getHash, readFile } = require('../utils/utils');

const Event = require('../schemas/Event');
const Lead = require('../schemas/Lead');
const LeadComment = require('../schemas/LeadComment');
const Tender = require('../schemas/Tender');
const Ticket = require('../schemas/Ticket');
const SubscribeSettings = require('../schemas/SubscribeSettings');
const User = require('../schemas/User');

class EmailService {
  async sendRegistrationEmail(email, hash) {
    return this.sendEmail(EMAIL_TEMPLATES.REGISTRATION_EMAIL_CONFIRM, email, { hash });
  }

  async sendRegistrationInviteEmail(email, hash) {
    return this.sendEmail(EMAIL_TEMPLATES.REGISTRATION_INVITE, email, { hash });
  }

  async sendPasswordRecoveryEmail(email, hash) {
    return this.sendEmail(EMAIL_TEMPLATES.PASSWORD_RECOVERY, email, { hash });
  }

  async sendChangeEmailConfirm(email, hash, newEmail) {
    return this.sendEmail(EMAIL_TEMPLATES.CHANGE_EMAIL_CONFIRM, email, { hash, email: newEmail });
  }

  async sendChangePasswordConfirm(email, hash) {
    return this.sendEmail(EMAIL_TEMPLATES.CHANGE_PASSWORD_CONFIRM, email, { hash });
  }

  async sendTendersInformation(email, tenders, count) {
    let tenderString = '';
    tenders.forEach((tender) => {
      tenderString = `${tenderString}<hr/><a style="font-size: 13px; line-height: normal;" href='https://localhost.ru/tender/${tender.id}'> ${tender.number} ${tender.title}</a><br/>`;
      if (tender.price) {
        const price = (tender.price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ');
        tenderString = `${tenderString} <br/><span style="font-size: 13px; font-color: black"> Сумма контракта: ${price}₽</span>`;
      }
      if (tender.requestDeposit) {
        const requestDeposit = (tender.requestDeposit).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ');
        tenderString = `${tenderString} <br/><span style="font-size: 13px; font-color: black"> Размер обеспечения заявки: ${requestDeposit}₽</span>`;
      }
      if (tender.requestFinishDate) {
        const date = DateTime.fromJSDate(tender.requestFinishDate).toFormat('dd.LL.yyyy').toString();
        tenderString = `${tenderString} <br/><span style="font-size: 13px; font-color: black"> Подача заявок до: ${date}</span>`;
      }
    });
    tenderString = `${tenderString} <hr/>`;

    let countString = '<br/><span style="font-size: 13px; font-color: black">Еще больше тендеров на сайте<a href="http://localhost.ru/tenders" style="font-size: 13px; line-height: normal;">localhost.ру</a></span>';

    if (count > 3) {
      countString = `<br/><span style="font-size: 13px; font-color: black">Еще больше тендеров, по вашим настройкам поиска ${count - 3} шт на сайте <a href="http://localhost.ru/tenders" style="font-size: 13px; line-height: normal;">localhost.ру</a></span>`;
    }

    return this.sendEmail(EMAIL_TEMPLATES.NEW_TENDERS_SUBSCRIPTION, email, { tenders: tenderString, count: countString });
  }

  async checkSubscriptions() {
    const subscriptions = await SubscribeSettings.findAll({ where: { isActive: true }, include: [{ model: User, attributes: ['email'] }] });
    for (let i = 0; i < subscriptions.length; i = i + 1) {
      subscriptions[i] = subscriptions[i].dataValues;

      let { email } = subscriptions[i];

      if (!email) {
        email = subscriptions[i].user.dataValues.email;
      }

      const { cities } = subscriptions[i];

      const categoriesArray = [];
      CATEGORIES_FIELDS.forEach((key) => {
        if (subscriptions[i][key] === 'true') {
          categoriesArray.push({
            [Op.and]: [
              { [key]: { [Op.not]: null } },
              { [key]: { [Op.ne]: 0 } }
            ]

          });
        }
        if (subscriptions[i][key]) {
          delete subscriptions[i][key];
        }
      });

      const categoriesFilter = categoriesArray.length ? {
        [Op.or]: categoriesArray
      } : {};

      let priceFilter;

      const { priceFrom, priceTo } = subscriptions[i];

      if (priceFrom) {
        priceFilter = { price: { [Op.gt]: priceFrom } };
      }
      if (priceTo) {
        priceFilter = priceFilter
          ? { price: { [Op.and]: [{ [Op.gt]: priceFrom }, { [Op.lt]: priceTo }] } }
          : { price: { [Op.lt]: priceTo } };
      }

      const now = DateTime.local().minus({ days: 1 });

      const where = {
        ...categoriesFilter,
        ...priceFilter,
        updatedAt: {
          [Op.gt]: now.toString(),
        },
        isActive: true,
      };

      if (cities && cities.length > 0) {
        where.cityId = cities;
      }

      const count = await Tender.count({ where });

      let tenders = await Tender.findAll({
        where,
        order: [['updatedAt', 'DESC']],
        limit: 3,
      });

      tenders = tenders.map(item => item.dataValues);

      if (!tenders || tenders.length <= 0) {
        continue;
      }

      await this.sendTendersInformation(email, tenders, count);
    }
  }

  async confirmEmailOnUnisender(email) {
    const answer = await axios.request({
      method: 'post',
      url: `${unisenderUrl}/ru/transactional/api/v1/sender/validate.json`,
      data: {
        api_key: unisenderApiKey,
        username: unisenderUser,
        email,
      },
    });
    return answer.data;
  }

  async sendEmail(template_id, email, substitutions) {
    const data = {
      api_key: unisenderApiKey,
      username: unisenderUser,
      message:
        {
          template_id,
          track_links: 1,
          track_read: 1,
          recipients: [
            {
              email,
              substitutions,
            },
          ],
        }
    };

    const answer = await axios.request({
      method: 'POST',
      url: `${unisenderUrl}/ru/transactional/api/v1/email/send.json`,
      data,
    });

    return answer.data;
  }

  async getTemplateFromFile(name) {
    const template = await readFile(`${rootPath}/src/config/templates/${name}.html`);
    return template.toString();
  }

  async createTemplate(name, subject, template) {
    const data = {
      username: unisenderUser,
      api_key: unisenderApiKey,
      template: {
        name,
        subject,
        template_engine: 'simple',
        from_email: 'localhost@gmail.com',
        from_name: 'localhost no-reply',
        body: {
          html: template,
        },
      }
    };

    const answer = await axios.request({
      method: 'POST',
      url: `${unisenderUrl}/ru/transactional/api/v1/template/set.json`,
      data,
    });

    return answer.data;
  }

  async updateTemplate(id, name, subject, html) {
    const data = {
      username: unisenderUser,
      api_key: unisenderApiKey,
      template: {
        id,
        name,
        subject,
        template_engine: 'simple',
        from_email: 'localhost@gmail.com',
        from_name: 'localhost no-reply',
        body:
          {
            html,
          },
      }
    };

    const answer = await axios.request({
      method: 'POST',
      url: `${unisenderUrl}/ru/transactional/api/v1/template/set.json`,
      data,
    });

    return answer.data;
  }

  async deleteTemplate(id) {
    const data = {
      username: unisenderUser,
      api_key: unisenderApiKey,
      id,
    };
    const answer = await axios.request({
      method: 'POST',
      url: `${unisenderUrl}/ru/transactional/api/v1/template/delete.json`,
      data,
    });

    return answer.data;
  }

  async getTemplatesList() {
    const data = {
      username: unisenderUser,
      api_key: unisenderApiKey,
      limit: '10', // ограничивает количество шаблонов, возвращаемых за один запрос. По умолчанию: 50
      offset: '0'// обозначает позицию, с которой начинать возвращать записи. По умолчанию: 0
    };

    const answer = await axios.request({
      method: 'POST',
      url: `${unisenderUrl}/ru/transactional/api/v1/template/list.json`,
      data,
    });

    return answer.data;
  }

  async sendWelcomeEmail(leadId, managerId) {
    let now = DateTime.local();
    now = now.plus({ days: TICKET_PERIOD });
    const company = await Lead.findOne({
      where: {
        id: leadId,
      },
    });
    if (!company || !company.dataValues.email) {
      return false;
    }

    // TODO убрать комментарий перед запуском рассылки welcome emails


    const password = await getHash(User, 'password');
    const { inn, regionId, email, title } = company.dataValues;

    const userService = require('./userService');

    const result = await userService.registration({
      password,
      firstname: 'Пользователь',
      lastname: 'Компании',
      phonenumber: '',
      inn,
      regionId,
      email,
      companyType: COMPANIES_TYPES.BUILDER,
    });

    if (!result || !result.user || !result.company) {
      return false;
    }

    const hash = await getHash(Event, 'hash');

    const substitutions = { title, hash, password, email };
    try {
      await this.sendEmail(EMAIL_TEMPLATES.WELCOME_EMAIL, company.dataValues.email, substitutions);
    } catch (error) {
      if (error.response && error.response.data) {
        console.log(error.response.data);
      }
      await Lead.update({ blacklisted: true }, { where: { id: leadId } });
      console.log('Возникла ошибка при отправке email');

      return false;
    }

    await Event.create({
      leadId,
      type: EVENT_TYPES.WELCOME_EMAIL.code,
      hash,
      files: ['logo.jpg'],
    });
    await LeadComment.create({
      leadId,
      text: '[робот Всеволод]: отправлено Welcome Email',
    });
    await Ticket.create({
      type: LEAD_ACTIONS.CALL,
      leadId,
      status: TICKET_STATUS.ACTIVE,
      completeToDate: now.toString(),
      managerId,
    });
    return true;
  }
}

module.exports = new EmailService();
