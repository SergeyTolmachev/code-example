const {
  boolean, fromEnum, length, required, number, validate
} = require('../utils/validators');

class BaseValidator {
  getList(req, res, next) {
    const { validated, errors } = this.validate(req.query, {
      deleted: [boolean],
      page: [number],
      pageSize: [number],
      sortBy: [fromEnum(['createdAt', 'updatedAt'])],
      sortDir: [fromEnum(['ASC', 'DESC'])],
      search: [length(3, 40)],
    });
    req.query = validated;
    req.errors = errors;
    next();
  }

  getItem(req, res, next) {
    const { validated, errors } = this.validate(req.query, {
      id: [required, number],
    });
    req.query = validated;
    req.errors = errors;
    next();
  }

  create(req, res, next) {
    next();
  }

  update(req, res, next) {
    next();
  }

  remove(req, res, next) {
    const { validated, errors } = this.validate(req.query, {
      id: [required, number],
    });
    req.body = validated;
    req.errors = errors;
    next();
  }

  validate(query, schema) {
    return validate(query, schema);
  }
}

module.exports = BaseValidator;
