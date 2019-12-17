const BaseSchema = require('./BaseSchema');

class Fer2 extends BaseSchema {
  isMaterial(str) {
    const result = super.isMaterial(str);
    if (!result) {
      return null;
    }
    let unit = String(str[3]).split('(');
    let amount = this.getSplitNR(str[4], 1);
    unit = unit[unit.length - 1].replace(')', '').replace('\r', '');
    if (Number.isInteger(+str[0])) {
      amount = this.getSplitNR(str[4], 0);
    }
    result.unit = unit;
    result.amount = Number(String(amount).replace(',', '.'));
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
        && excel[i][1] === 'Обосно-\r\nвание'
        && excel[i][2] === 'Наименование'
        && excel[i][3] === 'Ед. изм.'
        && excel[i][4] === 'Кол.\r\nна ед./\r\nвсего'
        && excel[i][5] === 'Стоимость единицы, руб.'
        && excel[i][9] === 'Общая стоимость, руб.'
        && excel[i + 1]
        && excel[i + 1][5] === 'Всего'
        && excel[i + 1][6] === 'В том числе'
        && excel[i + 1][9] === 'Обору-\r\nдование'
        && excel[i + 1][10] === 'Всего'
        && excel[i + 1][11] === 'В том числе'
        && excel[i + 2]
        && excel[i + 2][6] === 'Осн.З/п'
        && excel[i + 2][7] === 'Эк.Маш'
        && excel[i + 2][8] === 'З/пМех'
        && excel[i + 2][11] === 'Осн.З/п'
        && excel[i + 2][12] === 'Эк.Маш'
        && excel[i + 2][13] === 'З/пМех'
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

module.exports = new Fer2({
  schema: {
    name: 'ФЕР',
    type: 'new',
    amount: [4, 1],
    price: [10, 0],
    unit: [3, 0],
  },
  position: {
    amount: [4, 0],
  },
});
