const xlsx = require('node-xlsx');
const _ = require('underscore');
const { Op } = require('sequelize');

const { postgres: sequelize } = require('../../config/db');
const { CLIENT_CONFLICT_ERRORS, ERRORS_FGIS, WORK_PRICE_UNPRICED } = require('../../config/constants');
const schemas = require('./schemas');

const { compareTitles } = require('../../utils/utils');

const GESN = require('../../schemas/GESN');
const FgisClassifier = require('../../schemas/FgisClassifier');
const Estimate = require('../../schemas/Estimate');

const money = require('../../utils/money');

class EstimateService {
  async build(path) {
    const excel = xlsx.parse(path);
    let schema = this.recognizeSchema(excel[0].data);
    let props = { schema, excel: excel[0].data };

    if (excel.length > 1) {
      for (let i = 1; i < excel.length; i = i + 1) {
        schema = this.recognizeSchema(excel[i].data);
        if (schema) {
          props = { schema, excel: excel[i].data };
        }
      }
    }

    return this.parseExcel(props);
  }

  recognizeSchema(excel) {
    let result = false;
    let schema;
    for (let i = 0; i < schemas.length; i = i + 1) {
      result = schemas[i].recognize(excel);
      if (result) {
        schema = schemas[i];
        break;
      }
    }
    return schema;
  }

  pushResult(estimate, props, string, type) {
    const { schema } = props;

    if (!string || !type || !estimate) {
      return false;
    }

    if (type === 'section') {
      if (estimate.sections.length > 0 && !this.findAllItems(estimate.positions, 'sectionIndex', estimate.sections.length - 1)) {
        for (let i = estimate.subsections.length - 1; i >= 0; i = i - 1) {
          if (estimate.subsections[i].sectionIndex === estimate.sections.length - 1) {
            estimate.subsections.pop();
          } else {
            break;
          }
        }
        estimate.sections.pop();
      }
      estimate.sections.push({
        index: estimate.sections.length,
        title: schema.isSection(string),
      });
    }

    if (estimate.sections.length === 0) {
      estimate.sections.push({
        index: estimate.sections.length,
        title: 'Без названия',
      });
    }

    if (type === 'subsection') {
      if (estimate.subsections.length > 0 && !this.findAllItems(estimate.positions, 'subsectionIndex', estimate.subsections.length - 1)) {
        estimate.subsections.pop();
      }
      estimate.subsections.push({
        title: schema.isSubSection(string),
        index: estimate.subsections.length,
        sectionIndex: estimate.sections.length - 1,
      });
    }

    if (!this.findAllItems(estimate.subsections, 'sectionIndex', estimate.sections.length - 1)) {
      estimate.subsections.push({
        index: estimate.subsections.length,
        title: 'Без названия',
        sectionIndex: estimate.sections.length - 1,
      });
    }

    if (type === 'position') {
      const result = schema.isPosition(string);
      estimate.positions.push({
        ...result,
        index: estimate.positions.length,
        subsectionIndex: estimate.subsections.length - 1,
        sectionIndex: estimate.sections.length - 1,
      });
      estimate.fullCost = estimate.fullCost + result.price;
    }

    if (type === 'material' || type === 'machine') {
      if (!this.findAllItems(estimate.positions, 'subsectionIndex', estimate.subsections.length - 1)) {
        estimate.positions.push({
          title: 'Материалы без работы',
          withoutWork: true,
          index: estimate.positions.length,
          subsectionIndex: estimate.subsections.length - 1,
          sectionIndex: estimate.sections.length - 1,
        });
      }
    }

    if (type === 'material') {
      const result = schema.isMaterial(string);
      estimate.materials.push({
        ...result,
        index: estimate.materials.length,
        positionIndex: estimate.positions.length - 1,
        subsectionIndex: estimate.subsections.length - 1,
        sectionIndex: estimate.sections.length - 1,
      });
      estimate.materialCost = estimate.materialCost + result.price;
    }
    if (type === 'machine') {
      const result = schema.isMachine(string);
      estimate.machines.push({
        ...result,
        index: estimate.machines.length,
        positionIndex: estimate.positions.length - 1,
        subsectionIndex: estimate.subsections.length - 1,
        sectionIndex: estimate.sections.length - 1,
      });
    }
    if (type === 'mechanic' && estimate.positions.length > 0) {
      const { amount } = schema.isMechanics(string);
      estimate.positions[estimate.positions.length - 1].operatorAmount = amount;
    }
    if (type === 'worker' && estimate.positions.length > 0) {
      const { amount, rank } = schema.isWorkers(string);
      estimate.positions[estimate.positions.length - 1].workerAmount = amount;
      estimate.positions[estimate.positions.length - 1].workerClass = rank;
    }

    return estimate;
  }

  parseExcel(props) {
    if (!props || !props.schema || !props.excel) {
      return null;
    }

    const { excel, schema } = props;

    let result = {
      sections: [],
      subsections: [],
      positions: [],
      machines: [],
      materials: [],
      fullCost: 0,
      materialCost: 0,
      title: 'Заголовок не распознан',
    };

    for (let i = 0; i < excel.length; i = i + 1) {
      const string = excel[i];
      if (string.includes('(наименование работ и затрат, наименование объекта)')) {
        result.title = excel[i - 1].join(' ');
      }
      if (schema.isSection(string)) {
        result = this.pushResult(result, props, string, 'section');
      }
      if (schema.isSubSection(string)) {
        result = this.pushResult(result, props, string, 'subsection');
      }
      if (schema.isPosition(string)) {
        result = this.pushResult(result, props, string, 'position');
      }
      if (schema.isMaterial(string)) {
        result = this.pushResult(result, props, string, 'material');
      }
      if (schema.isMachine(string)) {
        result = this.pushResult(result, props, string, 'machine');
      }
      if (schema.isMechanics(string)) {
        result = this.pushResult(result, props, string, 'mechanic');
      }
      if (schema.isWorkers(string)) {
        result = this.pushResult(result, props, string, 'worker');
      }
      if (schema.isTheEnd(string)) {
        break;
      }
    }

    return result;
  }

  findGesnFromCode(code) {
    const regulars = [
      /м\d{2}-\d{2}-\d{3}-\d{2}/,
      /р\d{2}-\d{1,2}-\d{1,2}/,
      /мр\d{2}-\d{2}-\d{3}-\d{2}/,
      /п\d{2}-\d{2}-\d{3}-\d{2}/,
      /\d{2}-\d{2}-\d{3}-\d{2}/,
    ];

    let codeToSearch = null;
    regulars.forEach((regular) => {
      if (String(code).match(regular) && !codeToSearch) {
        codeToSearch = String(code).match(regular);
      }
    });

    if (codeToSearch) {
      return codeToSearch[0];
    }
    return codeToSearch;
  }

  async getGesns(positions) {
    let gesns = positions.map(item => this.findGesnFromCode(item.code));
    gesns = _.uniq(_.compact(gesns));
    gesns = await GESN.findAll({
      where: {
        code: {
          [Op.in]: gesns,
        }
      }
    });
    const gesnObj = {};
    gesns.forEach((item) => {
      const result = item.dataValues;
      gesnObj[result.code] = result;
    });
    return gesnObj;
  }

  async getClassifiers(materials) {
    if (!materials || materials.length < 1) {
      return {};
    }

    let materialFgisIds = materials.map((item) => {
      if (item.fgisId && item.fgisId.match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}-\d{3,4}/)) {
        return item.fgisId;
      }
    });
    materialFgisIds = _.uniq(_.compact(materialFgisIds));

    const classifiers = await FgisClassifier.findAll({ where: { fgisId: { [Op.or]: materialFgisIds } } });
    const classifierObj = {};
    classifiers.forEach((classifier) => {
      const result = classifier.dataValues;
      classifierObj[result.fgisId] = result;
    });
    return classifierObj;
  }

  findAllItems(arr, indexType, index) {
    const result = arr.filter((item) => {
      if (item[indexType] === index) {
        return item;
      }
    });

    if (result.length <= 0) {
      return null;
    }

    return result;
  }

  async findRecommendedClassifiers(title) {
    let result = [];

    let search = title;

    const tags = search.match(/\((.*?)\)/g);

    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        search = search.replace(tag, '');
      });
    }

    const [classifierResult] = await sequelize.query(`SELECT * FROM "fgisClassifier" WHERE "_search" @@ plainto_tsquery('russian', '${search}') AND "isLeaf" = 'true' LIMIT 10;`);

    for (let i = 0; i < classifierResult.length; i = i + 1) {
      result.push(classifierResult[i].id);
    }

    const [goodResult] = await sequelize.query(`SELECT * FROM "good" WHERE "_search" @@ plainto_tsquery('russian', '${search}') LIMIT 10;`);

    let j = 10;

    for (let i = 0; i < goodResult.length; i = i + 1) {
      if (result.length + goodResult.length <= 10) {
        result.push(goodResult[i].classifierId);
      } else if (j > 5 && result.indexOf(goodResult[i].classifierId) < 0) {
        j = j - 1;
        result[j] = goodResult[i].classifierId;
      }
    }

    result = _.compact(_.uniq(result));

    const classifiers = await FgisClassifier.findAll({ where: { id: result } });

    const classifiersResult = [];

    for (let i = 0; i < classifiers.length; i = i + 1) {
      const { id, title: classifierTitle, fgisId } = classifiers[i].dataValues;
      classifiersResult.push({
        id,
        fgisId,
        title: classifierTitle,
      });
    }

    return classifiersResult;
  }

  validateMaterial(mat, classifiers) {
    let validated = { ...mat };

    const {
      amount, fgisId, hidden, noSelect, price, title, unit
    } = validated;
    let { fixedPrice } = mat;

    if (amount <= 0 || hidden) {
      validated.hidden = true;
      delete validated.conflict;
      return { validated, conflict: false };
    }

    if (noSelect) {
      fixedPrice = money.round(fixedPrice) || money.round(mat.price / mat.amount);
      delete validated.conflict;

      validated = {
        ...validated, priceValue: price, goodAmount: money.toFixedUp(amount), fixedPrice,
      };

      return { validated, conflict: false };
    }

    if (!fgisId) {
      validated.conflict = ERRORS_FGIS.no_fgis_id.code;
      return { validated, conflict: true };
    }

    if (fgisId) {
      const classifier = classifiers[fgisId];

      if (!classifier) {
        if (fgisId.match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}-\d{3,4}/)) {
          validated.conflict = ERRORS_FGIS.no_fgis_in_system.code;
          return { validated, conflict: true };
        }

        if (fgisId.match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}/)) {
          validated.conflict = ERRORS_FGIS.category.code;
          return { validated, conflict: true };
        }
      }

      if (classifier) {
        if (!compareTitles(title, classifier.title)) {
          validated.clientConflict = this.addClientError(validated.clientConflict, {
            code: CLIENT_CONFLICT_ERRORS.title.code,
            additional: classifier.title,
          });
        }

        if (validated.hideTitleConflict) {
          delete validated.clientConflict;
        }

        validated.classifierId = classifier.id;

        if (!classifier.fixedPrice) {
          if (!classifier.hasGoods) {
            validated.conflict = ERRORS_FGIS.no_price_value_no_select.code;
            return { validated, conflict: true };
          }
          if (!classifier.goodsCount) {
            validated.conflict = ERRORS_FGIS.no_price_value_no_select.code;
            return { validated, conflict: true };
          }
        }

        if (!compareTitles(classifier.fullUnit, unit) && !compareTitles(classifier.unit, unit)) {
          validated.clientConflict = this.addClientError(validated.clientConflict, {
            code: CLIENT_CONFLICT_ERRORS.unit.code,
            additional: classifier.fullUnit,
          });
        }
        if (validated.conflict) {
          delete validated.conflict;
          return { validated, conflict: false };
        }
      }
    }

    return { validated, conflict: false };
  }

  async validateEstimate(check) {
    const result = { ...check };

    const gesns = await this.getGesns(check.positions);
    const classifiers = await this.getClassifiers(check.materials);

    let conflicts = 0;

    for (let i = 0; i < result.positions.length; i = i + 1) {
      const position = result.positions[i];
      let { code } = position;
      const { index, subsectionIndex, sectionIndex } = position;

      code = this.findGesnFromCode(code);

      const gesn = gesns[code] ? JSON.parse(JSON.stringify({ ...gesns[code] })) : null;

      if (gesn) {
        const { unit, unitFactor } = gesn;

        if (!position.workPriceType) {
          position.workPriceType = gesn.workPriceType;
        }

        if (position.workPriceType === WORK_PRICE_UNPRICED) {
          position.price = 0;
        }

        position.price = Math.abs(position.price);

        if (!compareTitles(position.title, gesn.title) && !position.dismantling) {
          position.clientConflict = this.addClientError(position.clientConflict, {
            code: CLIENT_CONFLICT_ERRORS.title.code,
            additional: gesn.title,
          });
        }

        if (position.hideTitleConflict) {
          delete position.clientConflict;
        }

        if (!position.unitFactor && position.unit !== unit) {
          position.amount = money.round(position.amount * unitFactor);
          position.price = money.ceil(position.price / position.amount);
          position.unit = unit;
          position.unitFactor = unitFactor;
        }

        if (!position.unitFactor && position.unit === unit) {
          position.unitFactor = 1;
          position.price = money.ceil(position.price / position.amount);
        }

        if (!this.findAllItems(result.materials, 'positionIndex', index) && !this.findAllItems(result.machines, 'positionIndex', index) && !position.dismantling) {
          const instance = {
            tzr: gesn.tzr,
            tzm: gesn.tzm,
            mch: gesn.mch,
            mat: gesn.mat,
          };
          if (instance.tzr && instance.tzr.amount) {
            position.workerAmount = Math.abs(money.round(instance.tzr.amount * position.amount));
            if (instance.tzr.workClass && String(instance.tzr.workClass).replace(',', '.')) {
              position.workerClass = Number(String(instance.tzr.workClass).replace(',', '.'));
            }
          }
          if (instance.tzm && instance.tzm.amount) {
            position.operatorAmount = Math.abs(money.round(instance.tzm.amount * position.amount));
          }
          instance.mch = instance.mch.forEach((mch) => {
            result.machines.push({
              index: result.machines.length,
              unit: mch.unit,
              title: mch.title,
              amount: Math.abs(money.round(mch.amount * position.amount)),
              fgisId: mch.fgisId,
              positionIndex: index,
              subsectionIndex,
              sectionIndex,
            });
          });
          instance.mat = instance.mat.forEach((mat) => {
            const item = mat;
            item.amount = Math.abs(money.toFixedUp(item.amount * position.amount / unitFactor));
            if (item.amount <= 0) {
              item.hidden = true;
            }
            if (!item.fgisId.match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}-\d{3,4}/)) {
              item.conflict = ERRORS_FGIS.category.code;
              conflicts = conflicts + 1;
            }
            if (!item.unit) {
              item.unit = null;
              item.clientConflict = this.addClientError(item.clientConflict, {
                code: CLIENT_CONFLICT_ERRORS.nullUnit.code,
                // additional: 'Данный материал учитывается по проекту и не отображен в смете',
              });
            }

            result.materials.push({
              ...item,
              index: result.materials.length,
              positionIndex: index,
              subsectionIndex,
              sectionIndex,
            });

            return item;
          });
        }
      } else {
        if (position.workPriceType !== null) {
          position.workPriceType = null;

          position.price = money.ceil(position.price / position.amount);
          position.price = Math.abs(position.price);
        }

        if (code) {
          position.clientConflict = this.addClientError(position.clientConflict, {
            code: CLIENT_CONFLICT_ERRORS.gesn.code
          });
        }
      }

      result.positions[i] = { ...position };
    }

    for (let i = 0; i < result.materials.length; i = i + 1) {
      const { validated, conflict: plus } = this.validateMaterial(result.materials[i], classifiers);
      conflicts = plus ? conflicts + 1 : conflicts;
      result.materials[i] = validated;
    }

    return { result, conflicts };
  }

  addClientError(errors, error) {
    const { code, additional } = error;

    if (!errors || !errors.length || errors.length <= 0) {
      return [error];
    }

    for (let i = 0; i < errors.length; i = i + 1) {
      const item = errors[i];
      if (item.code === code && item.additional === additional) {
        return errors;
      }
    }
    errors.push(error);
    return errors;
  }

  async validateEstimateStructure(check, estimateId) {
    const estimateFromBase = await Estimate.findOne({
      where: {
        id: estimateId,
      },
    });
    const conflicts = {
      count: 0,
      conflicts: [],
    };

    const { sections, subsections, positions, materials, machines } = estimateFromBase.dataValues;

    if (check.sections.length !== sections.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество разделов не соответствует исходному');
    }

    if (check.subsections.length !== subsections.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество подразделов не соответствует исходному');
    }

    if (check.positions.length !== positions.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество позиций не соответствует исходному');
    }

    if (check.materials.length !== materials.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество материалов в не соответствует исходному');
    }

    if (check.machines.length !== machines.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество машин и механизмов в не соответствует исходному');
    }

    if (conflicts && conflicts.count) {
      return { sections, conflicts };
    }

    for (let i = 0; i < positions.length; i = i + 1) {
      const { code } = positions[i];
      if (code && code !== check.positions[i].code) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`Код позиции ${i} ${check.positions[i].code} не соответствует исходному ${positions[i].code} `);
      }
    }

    for (let i = 0; i < materials.length; i = i + 1) {
      const { price } = materials[i];
      if (price && price !== check.materials[i].price) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`Стоимость в ${i} ${check.materials[i]} не соответствует исходной ${materials[i]}`);
      }
    }

    return { sections, conflicts };
  }
}

module.exports = new EstimateService();
