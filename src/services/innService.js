const axios = require('axios');
const cheerio = require('cheerio');

class InnService {
  async findCompanyData(inn) {
    try {
      const rawData = await axios.get(`https://sbis.ru/contragents/${inn}`);
      const data = cheerio.load(rawData.data);
      const pinkman = data('.pinkman').toArray();
      if (pinkman.length === 0) {
        const title = data('.cCard__MainReq-Name h1').toArray();
        return title[0].children[0].data.replace(',', '');
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new InnService();
