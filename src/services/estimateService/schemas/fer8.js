const BaseSchema = require('./BaseSchema');

class Fer8 extends BaseSchema {
  recognize(excel) {
    if (!excel) {
      return false;
    }
    let header = false;
    let type = false;
    for (let i = 0; i < excel.length; i = i + 1) {
      if (excel[i][0] === '№ пп'
        && excel[i][1] === 'Шифр и номер позиции норматива'
        && excel[i][2] === 'Наименование работ и затрат, единица измерения'
        && excel[i][3] === 'Количество'
        && excel[i][4] === 'Стоимость единицы, руб.'
        && excel[i][6] === 'Общая стоимость, руб.'
        && excel[i + 1]
        && excel[i + 1][4] === 'всего'
        && excel[i + 1][5] === 'эксплуата-\r\nции машин'
        && excel[i + 1][6] === 'Всего'
        && excel[i + 1][7] === 'оплаты труда'
        && excel[i + 1][8] === 'эксплуата-\r\nция машин'
        && excel[i + 2]
        && excel[i + 2][4] === 'оплаты труда'
        && excel[i + 2][5] === 'в т.ч. оплаты труда'
        && excel[i + 2][8] === 'в т.ч. оплаты труда'
        && excel[i + 2][9] === 'на единицу'
        && excel[i + 2][10] === 'всего'
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

module.exports = new Fer8({
  schema: {
    name: 'ФЕР',
    type: 'new',
    amount: [3, 0],
    price: [6, 0],
    unit: [2, 1],
    betweenBrackets: true
  },
});
