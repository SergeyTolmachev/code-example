const BaseParser = require('./BaseParser');
const Etm = require('./Etm');
const Grundfos = require('./Grundfos');
const LeroymerlinRu = require('./LeroymerlinRu');
const Palpnord = require('./Palpnord');
const PulscenRu = require('./PulscenRu');
const Sibelkom = require('./Sibelkom');
const Teplovoz38 = require('./Teplovoz38');
const Tstn = require('./Tstn');
const Zaotemerso = require('./Zaotemerso');

module.exports = {
  'irk.pulscen.ru': new PulscenRu('irk.pulscen.ru', { regionId: 38, part: 3000, rand: 3000 }),
  'perm.pulscen.ru': new PulscenRu('perm.pulscen.ru', { regionId: 59, part: 3000, rand: 3000 }),
  'irkutsk.leroymerlin.ru': new LeroymerlinRu('irkutsk.leroymerlin.ru', { regionId: 38 }),
  // следующий леруа мерлен подключается так
  // 'perm.leroymerlin.ru': new LeroymerlinRu('perm.leroymerlin.ru', { regionId: 59 }),
  'www.tstn.ru': new Tstn('www.tstn.ru', { regionId: 38 }),
  'www.etm.ru': new Etm('www.etm.ru', { regionId: 38 }),
  'shop.grundfos.ru': new Grundfos('shop.grundfos.ru', { regionId: 38 }),
  'shop.palp-nord.ru': new Palpnord('shop.palp-nord.ru', { regionId: 38 }),
  'vimpel38.ru': new BaseParser('vimpel38.ru', { regionId: 38 }),
  'beton.irk.ru': new BaseParser('beton.irk.ru', { regionId: 38 }),
  'beton-irk.ru': new BaseParser('beton-irk.ru', { regionId: 38 }),
  'betonoff.ru': new BaseParser('betonoff.ru', { regionId: 38 }),
  'agrodorinvest.ru': new BaseParser('agrodorinvest.ru', { regionId: 38 }),
  'bs38.ru': new BaseParser('bs38.ru', { regionId: 38 }),
  'new-beton.ru': new BaseParser('new-beton.ru', { regionId: 38 }),
  'irkutsk-beton.ru': new BaseParser('irkutsk-beton.ru', { regionId: 38 }),
  'betonshik.com': new BaseParser('betonshik.com', { regionId: 38 }),
  'fabrika-betonov.ru': new BaseParser('fabrika-betonov.ru', { regionId: 38 }),
  'neptun38.ru': new BaseParser('neptun38.ru', { regionId: 38 }),
  'tanarbeton.ru': new BaseParser('tanarbeton.ru', { regionId: 38 }),
  'vsskbeton.ru': new BaseParser('vsskbeton.ru', { regionId: 38 }),
  'irk-beton.ru': new BaseParser('irk-beton.ru', { regionId: 38 }),
  'irkutskstalbeton.ru': new BaseParser('irkutskstalbeton.ru', { regionId: 38 }),
  'sibna38.ru': new BaseParser('sibna38.ru', { regionId: 38 }),
  'shelabz.ru': new BaseParser('shelabz.ru', { regionId: 38 }),
  'irkavtodor.ru': new BaseParser('irkavtodor.ru', { regionId: 38 }),
  'zaotemerso.ru': new Zaotemerso('zaotemerso.ru', { regionId: 38 }),
  'sibelkom.ru': new Sibelkom('sibelkom.ru', { regionId: 38 }),
  'teplovoz38.ru': new Teplovoz38('teplovoz38.ru', { regionId: 38 }),
};
