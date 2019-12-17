const BaseController = require('./baseController');
const BaseValidator = require('./baseValidator');
const { required, number, fromEnum } = require('../utils/validators');
const Ticket = require('../schemas/Ticket');
const { USER_GROUPS, TICKET_STATUS } = require('../config/constants');

class TicketController extends BaseController {
  async getList(req, res, next) {
    if (req.user.group === USER_GROUPS.SERVICE_SALES) {
      req.query.managerId = req.user.id;
    }
    return super.getList(req, res, next);
  }

  async create(req, res, next) {
    if (!req.body.managerId) {
      req.body.managerId = req.user.id;
    }

    if (!req.body.status) {
      req.body.status = TICKET_STATUS.ACTIVE;
    }

    return super.create(req, res, next);
  }

  async update(req, res, next) {
    const item = await this.schema.findOne({
      where: {
        id: req.body.id
      }
    });

    if (!item) {
      return res.status(400).json({ _error: 'запрашиваемый id не найден' });
    }

    // если тикет активен - проверяем, не последний ли он
    if (item.dataValues.status === TICKET_STATUS.ACTIVE && req.body.status === TICKET_STATUS.FINISHED) {
      const ticketsLeft = await Ticket.count({
        where: {
          leadId: item.dataValues.leadId,
          status: TICKET_STATUS.ACTIVE
        }
      });

      if (ticketsLeft === 1) {
        return res.status(400).json({ _error: 'Нельзя удалять или завершать последний для лида тикет' });
      }
    }


    return super.update(req, res, next);
  }

  async remove(req, res, next) {
    const item = await this.schema.findOne({
      where: {
        id: req.query.id
      }
    });

    if (!item) {
      return res.status(400).json({ _error: 'запрашиваемый id не найден' });
    }

    // если тикет активен - проверяем, не последний ли он
    if (item.dataValues.status === TICKET_STATUS.ACTIVE) {
      const ticketsLeft = await Ticket.count({
        where: {
          leadId: item.dataValues.leadId,
          status: TICKET_STATUS.ACTIVE
        }
      });

      if (ticketsLeft === 1) {
        return res.status(400).json({ _error: 'Нельзя удалять или завершать последний для лида тикет' });
      }
    }


    return super.remove(req, res, next);
  }
}

module.exports.controller = new TicketController(Ticket);

class TicketValidator extends BaseValidator {
  getList(req, res, next) {
    const { validated, errors } = this.validate(req.query, {
      leadId: [number],
      status: [number],
      managerId: [number],
      regionId: [number],
      sortBy: [fromEnum(['createdAt', 'updatedAt', 'completeToDate'])],
      sortDir: [fromEnum(['asc', 'desc'])],
    });
    req.query = validated;
    req.errors = errors;
    next();
  }


  create(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      type: [required, number],
      leadId: [required, number],
      status: [number],
      managerId: [number],
      completeToDate: [required],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  remove(req, res, next) {
    const { validated, errors } = this.validate(req.query, {
      id: [required, number]
    });
    req.query = validated;
    req.errors = errors;
    next();
  }

  update(req, res, next) {
    const { validated, errors } = this.validate(req.body, {
      id: [required, number],
      type: [number],
      leadId: [number],
      status: [number],
      managerId: [number],
      completeToDate: [],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }
}

module.exports.validator = new TicketValidator();
