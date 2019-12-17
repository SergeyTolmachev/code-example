const { validate } = require('../utils/validators');

class baseRpcValidator {
  validate(query, schema) {
    return validate(query, schema);
  }
}

module.exports = baseRpcValidator;
