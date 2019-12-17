const axios = require('axios');
const cheerio = require('cheerio');

const Provider = require('../../../schemas/Provider');

class BaseParser {
  constructor(domain, options) {
    this.domain = domain;
    if (options) {
      this.options = options;
    }
  }

  async build() {
    const provider = await Provider.findOne({ where: { domain: this.domain } });

    if (provider) {
      this.providerId = provider.dataValues.id;
    } else {
      this.providerId = null;
    }
  }

  async getInfo(url) {
    const result = await axios.get(url, this.cookie ? {
      headers: {
        cookie: this.cookie,
      },
    } : undefined);

    if (!result) {
      return null;
    }

    const $ = cheerio.load(result.data);

    return {
      price: await this.getPrice($),
      providerId: await this.getProviderId($),
      title: await this.getTitle($),
      regionId: this.getRegionId()
    };
  }

  getRegionId() {
    return this.options ? this.options.regionId : null;
  }

  async getPrice(url) {
    return null;
    // Данный метод должен быть обязательно переписан в парсерах
  }

  async getTitle(url) {
    return null;
    // Данный метод должен быть обязательно переписан в парсерах
  }

  async getProviderId() {
    return this.providerId;
  }
}

module.exports = BaseParser;
