const BaseSchema = require('./BaseSchema');

class Fer5 extends BaseSchema {
  recognize(excel) {
    if (!excel) {
      return false;
    }
    let header = false;
    let type = false;
    for (let i = 0; i < excel.length; i = i + 1) {
      if (excel[i][0] === '№ пп'
        && excel[i][1] === 'Обоснование'
        && excel[i][2] === 'Наименование работ и затрат'
        && excel[i][3] === 'Ед. изм.'
        && excel[i][4] === 'Кол.'
        && excel[i][5] === 'Стоимость единицы в базисных ценах, руб.'
        && excel[i][7] === 'Общая стоимость в базисных ценах, руб.'
        && excel[i + 1]
        && excel[i + 1][5] === 'Всего'
        && excel[i + 1][6] === 'Экспл. маш.'
        && excel[i + 1][7] === 'Всего'
        && excel[i + 1][9] === 'Экспл. маш.'
        && excel[i + 2]
        && excel[i + 2][5] === 'оплата труда'
        && excel[i + 2][6] === 'в т.ч. оплата труда'
        && excel[i + 2][9] === 'в т.ч. оплата труда'
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

module.exports = new Fer5({
  schema: {
    name: 'ФЕР',
    type: 'new',
    amount: [4, 0],
    price: [7, 0],
    unit: [3, 0],
  },
});
