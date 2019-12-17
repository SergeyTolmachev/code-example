const validator = require('validator');
const { preparePhone } = require('./utils');

module.exports.validate = (query, schema) => {
  const validated = {};
  const errors = {};
  Object.keys(schema).forEach((key) => {
    for (let i = 0; i < schema[key].length; i = i + 1) {
      const check = schema[key][i];
      const checked = check(query[key]);
      if (checked) {
        errors[key] = checked;
        break;
        // не добавляем в итоговый объект undefined, если его до этого не было
        // так, например, в квери нет regionId, но он туда обязательно добавляется как undefined
      }
    }

    if (query[key] !== undefined) {
      validated[key] = query[key];
    }
  });
  return { validated, errors };
};

module.exports.required = (value) => {
  if (!value) {
    return 'Поле является обязательным';
  }

  return false;
};

module.exports.number = (value) => {
  if (value === undefined) {
    return false;
  }
  if (!validator.isNumeric(String(value))) {
    return 'Поле должно быть числом';
  }
  return false;
};

module.exports.float = (value) => {
  if (value === undefined) {
    return false;
  }
  const float = parseFloat(value).toFixed(2);
  value = String(value);
  if (float !== value && float !== `${value}.00` && float !== `${value}0`) {
    return 'Поле должно быть числом, максимум с двумя знаками после запятой';
  }
  return false;
};


module.exports.length = (min, max) => (value) => {
  if (value === undefined) {
    return false;
  }
  if (value.length < min) {
    return `Длина должна быть больше ${min}`;
  }
  if (value.length > max) {
    return `Длина должна быть меньше ${max}`;
  }
  return false;
};

module.exports.lessThan = max => (value) => {
  if (value === undefined) {
    return false;
  }
  if (+value > max) {
    return `Число должно быть меньше ${max}`;
  }
  return false;
};

module.exports.moreThan = min => (value) => {
  if (value === undefined) {
    return false;
  }
  if (+value < min) {
    return `Число должно быть больше ${min}`;
  }
  return false;
};

module.exports.date = (value) => {
  if (value === undefined) {
    return false;
  }
  if (!value) return 'Поле должно являться датой';
  const date = new Date(value);
  if (isNaN(date.getDate())) return 'Поле должно являться датой';
  return false;
};

module.exports.isUrl = (value) => {
  if (value === undefined) {
    return false;
  }
  if (!value || !validator.isURL(value)) return 'Поле должно быть ссылкой';
  return false;
};

module.exports.phone = (value) => {
  if (value === undefined) {
    return false;
  }
  if (!preparePhone(value)) {
    return 'Поле должно быть номером телефона';
  }
  return false;
};

module.exports.isEmail = (value) => {
  if (value === undefined) {
    return false;
  }
  if (!validator.isEmail(value)) {
    return 'Неверный формат email';
  }
  return false;
};

module.exports.boolean = (value) => {
  if (value === undefined) {
    return false;
  }

  if (['true', 'false', false, true].indexOf(value) === -1) return 'Поле должно быть логического типа';
  return false;
};

module.exports.excel = (value) => {
  if (!value) {
    return 'Файл отсутствует или поврежден';
  }
  if (!value.originalFilename || !value.type) {
    return 'Файл отсутствует или поврежден';
  }
  const format = value.originalFilename.split('.');

  if ((format[format.length - 1] !== 'xls') && (format[format.length - 1] !== 'xlsx')) {
    return 'Поле должно быть файлов в формате Excel';
  }
  if (value.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  && value.type !== 'application/vnd.ms-excel') {
    return 'Поле должно быть файлов в формате Excel';
  }
  return false;
};

module.exports.fromEnum = arr => (value) => {
  if (!value) {
    return false;
  }
  if (arr.indexOf(value) === -1) {
    return `Не верное значение, должно быть одним из ${arr}`;
  }
  return false;
};
