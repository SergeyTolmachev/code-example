const { Op } = require('sequelize');
const constants = require('../config/constants');

class BaseController {
  constructor(schema, options = {}) {
    this.schema = schema;
    const defaults = {
      exclude: ['createdAt', 'deletedAt', 'updatedAt'],
      extraExclude: ['userId'],
      pagination: false,
      searchField: ['title'],
      individualHooks: false,
    };
    this.config = { ...defaults, ...options };
  }

  async getList(req, res, next) {
    const {
      deleted, search, sortBy, sortDir, page: pageFromQuery, pageSize: pageSizeFromQuery, ...rest
    } = req.query;
    const page = pageFromQuery;
    let pageSize = pageSizeFromQuery;
    const { exclude, searchField } = this.config;
    const searchBy = [];

    if (search && Array.isArray(searchField) && searchField.length > 0) {
      searchField.forEach((field) => {
        searchBy.push({ [field]: { [Op.iLike]: `%${search}%` } });
      });
    }
    let offset = 0;
    let limit;
    const order = [['id', 'DESC']];
    if (sortBy) {
      order.unshift([sortBy, sortDir ? String(sortDir).toUpperCase() : 'ASC']);
    }
    if (this.config.pagination === true) {
      if (+pageSize !== 0 && +page !== 0) {
        pageSize = pageSize || constants.PAGE_SIZE;
        limit = pageSize;
        if (page >= 1) {
          offset = Math.floor((page - 1) * limit);
        }
      }
    }

    rest.deletedAt = (deleted === 'true') ? { [Op.not]: null } : null;

    if (deleted === 'true' && exclude.indexOf('deletedAt') !== -1) {
      exclude.splice(exclude.indexOf('deletedAt'), 1);
    }

    let where;

    if (searchBy && searchBy.length) {
      where = {
        [Op.or]: searchBy,
        ...rest,
      };
    } else {
      where = { ...rest };
    }

    const instances = await this.schema.findAll({
      where,
      order,
      limit,
      offset,
      attributes: {
        exclude,
      },
      paranoid: false,
    });


    const count = await this.schema.count({ where, paranoid: false });

    if (!pageSize || +pageSize === 0) {
      pageSize = count;
    }

    const answer = {
      pagination: {
        page: page || 1,
        pageSize,
        count,
      },
      items: instances.map(item => (item.dataValues)),
    };

    return res.status(200).json(answer);
  }

  async getItem(req, res, next) {
    const instance = await this.schema.findOne({
      where: {
        ...req.query,
      },
      attributes: {
        exclude: this.config.exclude,
      },
    });

    if (!instance || !instance.dataValues) {
      return res.status(400).json({ _error: 'Отсутствует экземпляр с данным id' });
    }
    return res.status(200).json(instance.dataValues);
  }

  async create(req, res, next) {
    const created = await this.schema.create({
      ...req.body,
    });
    const instance = await this.schema.findOne({
      where: {
        id: created.id,
      },
      attributes: {
        exclude: this.config.exclude,
        individualHooks: this.config.exclude,
      },
    });
    return res.status(201).json(instance.dataValues);
  }

  async update(req, res, next) {
    await this.schema.update({ ...req.body }, {
      where: { id: req.body.id },
      paranoid: !!req.body.deletedAt
    });
    const instance = await this.schema.findOne({
      where: { id: req.body.id },
      attributes: {
        exclude: this.config.exclude,
      },
    });

    return res.status(200).json(instance.dataValues);
  }

  async remove(req, res, next) {
    await this.schema.destroy({
      where: {
        id: req.query.id,
      }
    });
    const instance = await this.schema.findOne({
      where: { id: req.query.id },
      attributes: {
        exclude: this.config.exclude,
      },
      paranoid: false,
    });
    return res.status(200).json(instance.dataValues);
  }

  validateFields(fields, extraFields) {
    const validated = { ...fields };
    const keys = Object.keys(fields);
    keys.forEach((key) => {
      if (this.config.exclude && this.config.exclude.includes(key)) {
        delete validated[key];
      }
      if (this.config.extraExclude && this.config.extraExclude.includes(key)) {
        delete validated[key];
      }
      if (extraFields && extraFields.includes(key)) {
        delete validated[key];
      }
    });
    return validated;
  }
}

module.exports = BaseController;
