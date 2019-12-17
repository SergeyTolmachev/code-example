const BaseParser = require('./BaseParser');
const money = require('../../../utils/money');

class LeroymerlinRu extends BaseParser {
  async getPrice($) {
    let price = $('.card-order-price-int').eq(0).text();
    const penny = $('.card-order-price-fractional').eq(0).text();
    price = price.replace(/[^0-9]/gim, '');
    if (!price || !penny || !parseFloat(`${price}.${penny}`)) {
      return null;
    }
    return money.round(`${price}.${penny}`);
  }

  async getTitle($) {
    let title = $('h1').eq(0).text();
    title = title.split('\n').join(' ');
    if (!title) {
      return null;
    }
    return title;
  }
}

module.exports = LeroymerlinRu;
