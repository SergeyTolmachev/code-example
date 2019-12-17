const Provider = require('../schemas/Provider');

class PositionService {
  async findInnerProviders(parentProviderId) {
    const providers = await Provider.findAll({ where: { parentProviderId } });
    if (!providers || providers.length === 0) {
      return null;
    }
    return providers.map(item => (item.dataValues.id));
  }
}

module.exports = new PositionService();
