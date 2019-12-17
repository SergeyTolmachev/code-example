const parseDomain = require('parse-domain');

const parsers = require('./parsers');
const Href = require('../../schemas/Href');
const HrefHistory = require('../../schemas/HrefHistory');
const Provider = require('../../schemas/Provider');
const { timeout } = require('../../utils/utils');

class ParserService {
  async parseHrefs() {
    const hrefs = await Href.findAll({ where: { manualControl: false }, order: ['id'] });
    let errors = 0;

    // билдим парсеры

    const parsersUrls = Object.keys(parsers);

    for (let i = 0; i < parsersUrls.length; i = i + 1) {
      console.log(parsersUrls[i]);
      if (parsersUrls[i]) {
        if (parsers[parsersUrls[i]].build) {
          await parsers[parsersUrls[i]].build();
        }
      }
    }

    for (let i = 0; i < hrefs.length; i = i + 1) {
      const href = hrefs[i].dataValues;
      console.log(i + 1, '/', hrefs.length, ' id=', href.id);
      const url = this.getUrl(href.href);
      const parser = parsers[url];

      if (parser) {
        const { part, rand } = parser.options;
        if (part) {
          await timeout(part, rand);
        }
        const { price } = await parser.getInfo(href.href);
        if (price) {
          await this.updateHref(href.id, price);
          await this.saveHistory(href);
          console.log('Успех');
        } else {
          console.log('Ошибка в парсере');
          errors = errors + 1;
        }
      } else {
        console.log('Парсер не распознан');
      }
    }
  }

  getUrl(href) {
    const parseResult = parseDomain(href.toLowerCase());
    if (!parseResult) {
      return null;
    }
    const { subdomain, domain, tld } = parseResult;
    const url = subdomain ? `${subdomain}.${domain}.${tld}` : `${domain}.${tld}`;
    return url;
  }

  async getProvider(href) {
    if (!href) {
      return null;
    }
    const url = this.getUrl(href);
    const provider = await Provider.findOne({ where: { domain: url }});
    if (!provider) {
      return null;
    }
    return provider.dataValues.id;
  }

  async parseHrefInfo(href) {
    if (!href) {
      return null;
    }
    const url = this.getUrl(href);
    const parser = parsers[url];

    if (!parser) {
      return null;
    }

    if (parser.build) {
      await parser.build();
    }

    return parser.getInfo(href);
  }

  async saveHistory(href) {
    const historyHref = { ...href, hrefId: href.id };
    delete historyHref.id;
    await HrefHistory.create({ ...historyHref });
  }

  async updateHref(id, price) {
    await Href.update({ price }, { where: { id } });
  }
}

module.exports = new ParserService();
