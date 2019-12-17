const BaseSchema = require('./BaseSchema');

class Fer1 extends BaseSchema {
  isPosition(str) {
    const result = super.isPosition(str);
    if (!result) {
      return null;
    }
    result.unit = result.unit.replace('(', '').replace(')', '');
    return result;
  }

  isMaterial(str) {
    const result = super.isMaterial(str);
    if (!result) {
      return null;
    }
    let unit = String(str[2]).split('(');
    unit = unit[unit.length - 1].replace(')', '').replace('\r', '');
    result.unit = unit;
    return result;
  }


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
        && excel[i][3] === 'Количество\r\nна ед./\r\nвсего'
        && excel[i][4] === 'Стоимость единицы, руб.'
        && excel[i][7] === 'Общая стоимость, руб.'
        && excel[i + 1]
        && excel[i + 1][4] === 'всего'
        && excel[i + 1][5] === 'эксплуатации машин'
        && excel[i + 1][6] === 'мате-риалы'
        && excel[i + 1][7] === 'обору-дования'
        && excel[i + 1][8] === 'Всего'
        && excel[i + 1][9] === 'оплаты труда'
        && excel[i + 1][10] === 'эксплуатации машин'
        && excel[i + 1][11] === 'мате-риалы'
        && excel[i + 2]
        && excel[i + 2][4] === 'оплаты труда'
        && excel[i + 2][5] === 'в т.ч. оплаты труда'
        && excel[i + 2][10] === 'в т.ч. оплаты труда'
        && excel[i + 2][12] === 'на единицу'
        && excel[i + 2][13] === 'всего'
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

module.exports = new Fer1({
  schema: {
    name: 'ФЕР',
    type: 'old',
    amount: [3, 1],
    price: [8, 0],
    unit: [2, 0],
  },
  position: {
    amount: [3, 0],
    price: [8, 0],
    unit: [2, 1]
  },
  machine: {
    unit: [null],
  },
});
