// const { FER_COEFF } = require('../../../config/constants');
//
// const money = require('../../../utils/money');

class BaseSchema {
  constructor({
    machine, material, mechanic, position, schema, worker, betweenBrackets
  }) {
    this.machine = { ...schema, ...machine };
    this.material = { ...schema, ...material };
    this.mechanic = { ...schema, ...mechanic };
    this.position = { ...schema, ...position };
    this.schema = schema;
    this.worker = { ...schema, ...worker };
    this.betweenBrackets = !!betweenBrackets;
  }

  getTitle(excelString, replaceUnit) {
    let result = String(excelString[2]).split('\n')[0].replace('\r', '');
    if (replaceUnit) {
      const parts = String(result).match(/\((.*?)\)/g);
      if (parts) {
        result = result.replace(`, ${parts[parts.length - 1]}`, '');
      }
    }
    return result;
  }

  getSplitNR(cell, index, replaceCommaWithDot) {
    if (!cell) {
      return null;
    }
    let newString = String(cell).split('\n');

    if (!newString || newString.length < index + 1) {
      return null;
    }

    newString = newString[index].replace('\r', '');

    if (!newString) {
      return null;
    }

    if (replaceCommaWithDot) {
      return newString.replace(',', '.');
    }

    return newString;
  }

  isSection(str) {
    if (str.length !== 1) {
      return null;
    }
    let title = String(str[0]).toLowerCase();
    if (title.indexOf('раздел') === -1) {
      return null;
    }
    if (title.indexOf('разделу') !== -1) {
      return null;
    }
    title = title.replace('раздел ', '').replace(/\d{1,2}. /, '');
    if (!title) {
      return 'Без названия';
    }
    return title;
  }

  isSubSection(str) {
    if (str.length !== 1) {
      return null;
    }
    const title = String(str[0]).toLowerCase();

    const words = ['раздел', 'итоги', 'в том числе', 'справочно', 'расшифровка', 'по смете',
      'должность', 'подпись', 'составил', 'проверил', 'сметная', 'прибыль', 'накладные', 'расходы',
      'автомобильные дороги', 'перевозка грузов автотранспортом:', 'земляные работы, выполняемые механизированным способом',
      'земляные работы, выполняемые по другим видам работ (подготовительным, сопутствующим, укрепительным)',
      'пусконаладочные работы:', 'потребное количество ресурсов', 'подрядчик', 'м.п.', 'заказчик', 'письмо',
      'сдал', 'принял', 'МДС81', 'наименование стройки', 'материалы:',
    ];

    for (let i = 0; i < words.length; i = i + 1) {
      if (title.indexOf(words[i]) > -1) {
        return null;
      }
    }

    return String(str[0]).trim();
  }

  isWorkers(str) {
    if (!str[2]) {
      return null;
    }
    const title = String(str[2]).toLowerCase();
    if (title.indexOf('затраты труда рабочих') > -1 || title.indexOf('затраты труда рабочих-строителей') > -1) {
      const rank = Number(str[2].replace(/[^-0-9]/gim, ''));
      const amount = Number(this.getSplitNR(str[this.worker.amount[0]], this.worker.amount[1], true));
      const price = Number(this.getSplitNR(str[this.worker.price[0]], this.worker.price[1], true));

      if (!amount) {
        return null;
      }
      return {
        rank,
        amount,
        price,
      };
    }
    return null;
  }

  isMechanics(str) {
    if (!str[2]) {
      return null;
    }
    if (String(str[2]).indexOf('Затраты труда машинистов') > -1) {
      const amount = Number(this.getSplitNR(str[this.mechanic.amount[0]], this.mechanic.amount[1], true));

      const price = str[this.mechanic.price[0]]
        ? Number(this.getSplitNR(str[this.mechanic.price[0]], this.mechanic.price[1], true))
        : null;
      if (!amount) {
        return null;
      }
      return {
        amount,
        price,
      };
    }
    return null;
  }

  isPosition(str) {
    if (!str || !str[0]) {
      return null;
    }
    if (str.length <= 1) {
      return null;
    }
    if (!str[this.position.amount[0]]
      || !str[this.position.unit[0]]
      || !str[this.position.price[0]]) {
      return null;
    }
    str[0] = String(str[0]).replace('.', '').replace(',', '');
    if (!Number.isInteger(+str[0])) {
      return null;
    }
    if (String(str[1]).indexOf(this.schema.name) === -1) {
      return null;
    }
    let unit;
    if (this.position.betweenBrackets) {
      unit = this.findUnitBetweenBrackets(str[this.position.unit[0]]);
    } else {
      unit = this.schema.name === 'ФЕР'
        ? this.getSplitNR(str[this.position.unit[0]], this.position.unit[1])
        : str[this.position.unit[0]];
    }

    const price = Number(this.getSplitNR(str[this.position.price[0]], this.position.price[1], true));
    const amount = Number(this.getSplitNR(str[this.position.amount[0]], this.position.amount[1], true));

    let title = this.getTitle(str);
    let dismantling;

    if (String(str[2]).toLowerCase().indexOf('демонтаж') > -1 || String(str[2]).toLowerCase().indexOf('(разборка)') > -1) {
      title = `Демонтаж: ${title}`;
      dismantling = true;
    }

    return {
      code: this.getSplitNR(str[1], 0),
      title,
      fullTitle: str[2],
      amount,
      price,
      unit,
      dismantling,
    };
  }

  isMachine(str) {
    if (!str[1]) {
      return null;
    }
    if (!str[this.machine.amount[0]]
      || !str[this.machine.unit[0]]
      || !str[this.machine.price[0]]) {
      return null;
    }
    const code = this.schema.type === 'old'
      ? String(str[1]).match(/\d{6}/)
      : String(str[1]).match(/\d{2}\.\d{2}\.\d{2}-\d{2,3}/);

    let unit;
    if (this.machine.betweenBrackets) {
      unit = this.findUnitBetweenBrackets(str[this.machine.unit[0]], true);
    } else {
      unit = this.getSplitNR(str[this.machine.unit[0]], this.machine.unit[1]);
    }

    if (code) {
      return {
        title: this.getTitle(str),
        fgisId: code[0],
        amount: Number(this.getSplitNR(str[this.machine.amount[0]], this.machine.amount[1], true)),
        unit,
        price: Number(this.getSplitNR(str[this.machine.price[0]], this.machine.price[1], true)),
      };
    }
    return null;
  }

  isMaterial(str) {
    if (!str || !str[1]) {
      return null;
    }
    if (!str[this.material.amount[0]]
      || !str[this.material.unit[0]]
      || !str[this.material.price[0]]) {
      return null;
    }
    const code = this.schema.type === 'old'
      ? String(str[1]).match(/\d{3}-\d{4}/)
      : String(str[1]).match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}/);
    const fullCode = String(str[1]).match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}-\d{3,4}/);
    const isPositioned = str[0] ? String(str[0]).replace(/[^0-9.]/gim, '') : false;

    let unit;

    if (this.material.betweenBrackets) {
      unit = isPositioned
        ? this.findUnitBetweenBrackets(str[this.position.unit[0]], true)
        : this.findUnitBetweenBrackets(str[this.material.unit[0]], true);
    } else {
      unit = isPositioned
        ? this.getSplitNR(str[this.position.unit[0]], this.position.unit[1])
        : this.getSplitNR(str[this.material.unit[0]], this.material.unit[1]);
    }

    unit = unit ? unit.replace(/[^a-zA-Z0-9а-яА-Я ]+/gim, '') : unit;

    if (unit === 'машчас') {
      return null;
    }

    let hidden = false;

    if (String(str[0]).toLowerCase().indexOf('н, уд') > -1) {
      hidden = true;
    }
    if (String(str[0]).toLowerCase().indexOf('уд') > -1) {
      hidden = true;
    }
    if (String(str[1]).toLowerCase().match(/фссцпг\d{2}-\d{2}-\d{2}-\d{3}/)) {
      hidden = true;
    }
    if (String(str[1]).toLowerCase().match(/фссцпг-\d{2}-\d{2}-\d{2}-\d{3}/)) {
      hidden = true;
    }

    const amount = isPositioned
      ? Number(this.getSplitNR(str[this.position.amount[0]], this.position.amount[1], true))
      : Number(this.getSplitNR(str[this.material.amount[0]], this.material.amount[1], true));
    const price = isPositioned
      ? Number(this.getSplitNR(str[this.position.price[0]], this.position.price[1], true))
      : Number(this.getSplitNR(str[this.material.price[0]], this.material.price[1], true));

    // price = this.schema.name === 'ФЕР' ? money.round(price * FER_COEFF.mat) : price;

    if (!amount && !price) {
      return null;
    }

    if (code) {
      return {
        title: this.getTitle(str, true),
        fgisId: fullCode ? fullCode[0] : code[0],
        amount,
        unit,
        price,
        expandPrice: !!isPositioned,
        hidden,
      };
    }
    if (!code) {
      if (str[1] && String(str[1]).match(/\d{2}\.\d{2}\.\d{2}-\d{3}/)
          || String(str[1]).match(/\d{6}/)
            || String(str[this.material.unit[0]]).indexOf('маш.час') > -1) {
        return null;
      }
      if (!str[2] || !str[this.material.amount[0]] || !str[this.material.price[0]
      || !str[this.material.unit[0]]]) {
        return null;
      }
      if (String(str[this.material.unit[0]]).replace(/[0-9]/gi, '') === '') {
        return null;
      }
      if (str[1] && (String(str[1]).indexOf('ФЕР') > -1 || String(str[1]).indexOf('ГЭСН') > -1)) {
        return null;
      }
      const [check] = String(str[1]).toLowerCase().split('\n');
      let trash = false;
      if (check.indexOf('фссцпг01-01-01-041') > -1
        || check.indexOf('фссцпг01-01-01-042') > -1
        || check.indexOf('фссцпг01-01-01-043') > -1
        || check.indexOf('фссцпг01-02-01-026') > -1
        || check.indexOf('фссцпг01-02-02-026') > -1) {
        trash = true;
      }
      if (String(str[2]).toLowerCase().indexOf('мусор') > -1) {
        trash = true;
      }

      return {
        title: this.getTitle(str, true),
        fgisId: check.indexOf('фссцпг') > -1
          ? check
          : null,
        amount,
        unit,
        price,
        expandPrice: !!isPositioned,
        hidden,
        trash,
      };
    }
  }

  isTheEnd(str) {
    if (!str || !str[0]) {
      return false;
    }

    const string = String(str[0]).toLowerCase();

    if (string.indexOf('итого прямые затраты по смете') > -1) {
      return true;
    }
    if (string.indexOf('итоги по смете') > -1) {
      return true;
    }
    if (string.indexOf('всего по смете') > -1) {
      return true;
    }

    return false;
  }

  findUnitBetweenBrackets(str, last) {
    let result = null;

    const parts = String(str).match(/\((.*?)\)/g);

    let checkStr;

    if (parts) {
      if (!last) {
        result = parts[0];
        checkStr = result.replace(/\w+/gim, '');
        if (checkStr.length > 5) {
          let setResult = null;
          for (let i = 0; i < parts.length; i = i + 1) {
            if (!setResult && parts[i].length < 5) {
              setResult = parts[i];
            }
          }
          result = setResult ? setResult.replace(/\w+/gim, '') : null;
        }
      }

      if (last) {
        result = parts[parts.length - 1];
        checkStr = result.replace(/\w+/gim, '');
        if (checkStr.length > 5) {
          let setResult = null;
          for (let i = parts.length - 1; i >= 0; i = i - 1) {
            if (!setResult && parts[i].length < 5) {
              setResult = parts[i];
            }
          }
          result = setResult ? setResult.replace(/\w+/gim, '') : null;
        }
      }
    }
    return result ? result.replace('(', '').replace(')', '') : null;
  }
}

module.exports = BaseSchema;
