const BaseSchema = require('./BaseSchema');

class Fer10 extends BaseSchema {
  recognize(excel) {
    if (!excel) {
      return false;
    }
    let header = false;
    let type = false;
    for (let i = 0; i < excel.length; i = i + 1) {
      if (excel[i][0] === '№ пп'
        && excel[i][1] === 'Обосно-\r\nвание'
        && excel[i][2] === 'Наименование'
        && excel[i][3] === 'Ед. изм.'
        && excel[i][4] === 'Кол.'
        && excel[i][5] === 'Стоимость единицы, руб.'
        && excel[i][9] === 'Общая стоимость, руб.'
        && excel[i + 1]
        && excel[i + 1][5] === 'Всего'
        && excel[i + 1][6] === 'В том числе'
        && excel[i + 1][9] === 'Всего'
        && excel[i + 1][10] === 'В том числе'
        && excel[i + 2]
        && excel[i + 2][6] === 'Осн.\r\nЗ/п'
        && excel[i + 2][7] === 'Эк.\r\nМаш'
        && excel[i + 2][8] === 'З/п\r\nМех'
        && excel[i + 2][10] === 'Осн.\r\nЗ/п'
        && excel[i + 2][11] === 'Эк.\r\nМаш'
        && excel[i + 2][12] === 'З/п\r\nМех'
      ) {
        header = true;
      }
      if (String(excel[i][1]).indexOf('ФЕР') > -1) {
        type = true;
      }
      if (header && type) {
        return true;
      }
    }
    return false;
  }
}

module.exports = new Fer10({
  schema: {
    name: 'ФЕР',
    type: 'new',
    amount: [4, 0],
    price: [9, 0],
    unit: [3, 0],
  },
});
