class baseRpcController {
  constructor(schema, options = {}) {
    this.schema = schema;
    const defaults = {
      exclude: ['createdAt', 'deletedAt', 'updatedAt'],
    };
    this.config = { ...defaults, ...options };
  }
}

module.exports = baseRpcController;
