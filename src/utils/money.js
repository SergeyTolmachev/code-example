module.exports.round = (value) => {
  if (!value) {
    return null;
  }
  if (isNaN(parseFloat(value))) {
    return null;
  }
  return Math.round(value * 100) / 100;
};


const toFixed = (value) => {
  if (!value) {
    return null;
  }
  if (isNaN(parseFloat(value))) {
    return null;
  }
  value = +value;
  return +value.toFixed(2);
};

module.exports.toFixed = toFixed;

module.exports.toFixedUp = (value) => {
  const fixed = toFixed(value);
  if (fixed === 0 && value > 0) {
    return 0.01;
  }
  return fixed;
};

module.exports.floor = (value) => {
  if (!value) {
    return null;
  }
  if (isNaN(parseFloat(value))) {
    return null;
  }
  return Math.floor(value * 100) / 100;
};

module.exports.ceil = (value) => {
  if (!value) {
    return null;
  }
  if (isNaN(parseFloat(value))) {
    return null;
  }
  return Math.ceil(value);
};

module.exports.sum = (values) => {
  let sum = 0;
  values.forEach((item) => {
    if (item) {
      if (!isNaN(parseFloat(item))) {
        sum = sum + parseFloat(item);
      }
    }
  });
  return Math.round(sum * 100) / 100;
};
