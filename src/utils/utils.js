const fs = require('fs');
const randomize = require('randomatic');
const { promisify } = require('util');
const xml2js = require('xml2js');
const bcrypt = require('bcryptjs');
const extractZip = require('extract-zip');

const parser = new xml2js.Parser();


module.exports.parseXML = promisify(parser.parseString);
module.exports.readFile = promisify(fs.readFile);
module.exports.lstat = promisify(fs.lstat);
module.exports.writeFile = promisify(fs.writeFile);
module.exports.unlink = promisify(fs.unlink);
module.exports.readDir = promisify(fs.readdir);
module.exports.mkDir = promisify(fs.mkdir);
module.exports.exists = promisify(fs.exists);
module.exports.rename = promisify(fs.rename);
module.exports.copyFile = promisify(fs.copyFile);
module.exports.exists = promisify(fs.exists);
module.exports.extractZip = promisify(extractZip);

module.exports.encrypt = async password => bcrypt.hash(password, 8);

module.exports.decrypt = async (password, hash) => bcrypt.compare(password, hash);

module.exports.preparePhone = (phone) => {
  if (!phone) return null;
  let preparedPhone = phone.replace(/[^+\d]/g, '');
  if (preparedPhone.length === 11) preparedPhone = preparedPhone.substring(1, 11);
  if (preparedPhone.length === 10) preparedPhone = `7${preparedPhone}`;
  if (preparedPhone.length < 10) return null;
  if (preparedPhone.length > 11) return null;
  return preparedPhone;
};

module.exports.getListOfFiles = (files) => {
  const filesArr = [];
  for (const i in files) {
    if (files[i].files) {
      filesArr.concat(this.getListOfFiles(files[i].files));
    } else {
      filesArr.push(files[i]);
    }
  }
  return filesArr;
};

const getHash = async (schema, field) => {
  const hash = randomize('Aa0', 15);

  let where = { hash };

  if (field) {
    where = { [field]: hash };
  }

  const count = await schema.count({ where });

  if (count > 0) {
    return getHash();
  }

  return hash;
};


module.exports.getHash = getHash;

module.exports.timeout = (part = 1500, rand = 0) => {
  const delay = Math.random() * rand + part;
  return new Promise(resolve => setTimeout(resolve, delay));
};

module.exports.compareTitles = (mainTitle, secondTitle) => {
  if (!mainTitle || !secondTitle) {
    return false;
  }

  const main = mainTitle.replace(/[^\w\s]|_/g, '').replace(' ', '').toLowerCase();
  const second = secondTitle.replace(/[^\w\s]|_/g, '').replace(' ', '').toLowerCase();

  if (main.indexOf(second) > -1) {
    return true;
  }
  if (second.indexOf(main) > -1) {
    return true;
  }

  return false;
};
