const BaseSchema = require('./BaseSchema');

class Gesn6 extends BaseSchema {
  recognize(excel) {
    if (!excel) {
      return false;
    }
    let header = false;
    let type = false;
    let newGesn = false;
    let oldGesn = false;
    for (let i = 0; i < excel.length; i = i + 1) {
      if (excel[i][0] === '№ пп'
        && excel[i][1] === 'Обоснование'
        && excel[i][2] === 'Наименование'
        && excel[i][3] === 'Ед. изм.'
        && excel[i][4] === 'Кол.'
        && excel[i][6] === 'Сметная стоимость в текущих (прогнозных) ценах, руб.'
        && excel[i + 1]
        && excel[i + 1][4] === 'на ед.'
        && excel[i + 1][5] === 'всего'
        && excel[i + 1][6] === 'на ед.'
        && excel[i + 1][7] === 'общая'
      ) {
        header = true;
      }
      if (String(excel[i][1]).match(/\d{2}\.\d{2}\.\d{2}-\d{2,3}/)) {
        newGesn = true;
      }
      if (this.isMachine(excel[i])) {
        oldGesn = true;
      }
      if (String(excel[i][1]).indexOf('ГЭСН') > -1) {
        type = true;
      }
      if (header && type && newGesn) {
        return true;
      }
    }
    if (header && type && !oldGesn && !newGesn) {
      return true;
    }
    return false;
  }
}

module.exports = new Gesn6({
  schema: {
    name: 'ГЭСН',
    type: 'new',
    amount: [5, 0],
    price: [7, 0],
    unit: [3, 0],
  },
});
