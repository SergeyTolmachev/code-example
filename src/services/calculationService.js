const _ = require('underscore');
const { Op } = require('sequelize');

const sequelize = require('../config/db/postgres');

const { CALCULATION_TYPES } = require('../config/constants');

const Calculation = require('../schemas/Calculation');
const Good = require('../schemas/Good');
const Href = require('../schemas/Href');
const FgisClassifier = require('../schemas/FgisClassifier');
const MaterialFixedPrice = require('../schemas/MaterialFixedPrice');
const MachinesFixedPrice = require('../schemas/MaсhinesFixedPrice');
const Position = require('../schemas/Position');
const Provider = require('../schemas/Provider');
const Tender = require('../schemas/Tender');
const WorkPrice = require('../schemas/WorkPrice');
const Unit = require('../schemas/Unit');

const money = require('../utils/money');

class CalculationService {
  async build(estimates, regionId = 38) {
    let minCostCalculation = {
      estimates: JSON.parse(JSON.stringify(estimates)),
      files: [],
      sections: [],
      subsections: [],
      positions: [],
      materials: [],
      machines: [],
    };
    minCostCalculation = this.buildCostCalculation(minCostCalculation);
    let maxCostCalculation = {
      estimates: JSON.parse(JSON.stringify(estimates)),
      files: [],
      sections: [],
      subsections: [],
      positions: [],
      materials: [],
      machines: [],
    };
    maxCostCalculation = this.buildCostCalculation(maxCostCalculation);
    let cargo = {
      1: {
        weight: 0,
        distance: null,
        price: null,
      },
      2: {
        weight: 0,
        distance: null,
        price: null,
      },
      3: {
        weight: 0,
        distance: null,
        price: null,
      },
      4: {
        weight: 0,
        distance: null,
        price: null,
      },
    };

    const { classifiers, goods } = await this.getClassifiers({ materials: minCostCalculation.materials, regionId });
    const machines = await this.getMachines({ machines: minCostCalculation.machines });
    minCostCalculation.machines = machines;
    maxCostCalculation.machines = machines;
    const { workprices } = await this.getWorkPrices(minCostCalculation.positions);
    minCostCalculation = await this.buildCost({ costCalculation: minCostCalculation, workprices, classifiers, minimax: 'min' });
    maxCostCalculation = await this.buildCost({ costCalculation: maxCostCalculation, workprices, classifiers, minimax: 'max' });
    cargo = this.calculateCargo({ materials: minCostCalculation.materials, classifiers, goods, cargo });

    minCostCalculation = this.setPricesPositions(minCostCalculation);
    minCostCalculation = this.setPricesMaterials(minCostCalculation);
    const minMaterialSum = this.calculateMaterialSum({ materials: minCostCalculation.materials, goods });

    maxCostCalculation = this.setPricesPositions(maxCostCalculation);
    maxCostCalculation = this.setPricesMaterials(maxCostCalculation);
    const maxMaterialSum = this.calculateMaterialSum({ materials: maxCostCalculation.materials, goods });

    return {
      minCostCalculation,
      minMaterialSum,
      maxCostCalculation,
      maxMaterialSum,
      cargo,
    };
  }

  async getMachines({ machines }) {
    const keys = Object.keys(machines);

    const machinesArr = [];

    const machinesDB = await FgisClassifier.findAll({ where: { fgisId: keys } });

    const machinesDBObj = {};
    machinesDB.forEach(({ dataValues }) => {
      const { title, fgisId } = dataValues;
      machinesDBObj[fgisId] = { title };
    });

    keys.forEach((key) => {
      machinesArr.push({ ...machines[key], title: key, ...machinesDBObj[key], fgisId: key });
    });

    return machinesArr;
  }

  async getClassifiers({ materials, regionId }) {
    const result = {
      classifiers: {},
      goods: {},
      synonym: {},
    };

    const materialsAmounts = {};

    materials = materials.map((item) => {
      if (item.fgisId && item.fgisId.match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}-\d{3,4}/)) {
        materialsAmounts[item.fgisId] = materialsAmounts[item.fgisId] ? materialsAmounts[item.fgisId] + item.amount : item.amount;
        return item.fgisId;
      }
    });

    materials = _.compact(_.uniq(materials));

    if (!materials || materials.length < 1) {
      return result;
    }

    const units = await Unit.findAll();
    const unitObj = {};
    units.forEach((item) => {
      unitObj[item.dataValues.id] = item.dataValues.name;
    });

    let classifiers = await FgisClassifier.findAll({
      where: {
        fgisId: {
          [Op.or]: materials
        }
      },
    });

    if (classifiers.length === 0) {
      return result;
    }

    classifiers = _.pluck(classifiers, 'dataValues');
    let ids = classifiers.map(item => item.id);
    let childrenClassifiers = await FgisClassifier.findAll({ where: { parentId: { [Op.or]: ids } } });
    childrenClassifiers = _.pluck(childrenClassifiers, 'dataValues');
    classifiers = classifiers.concat(childrenClassifiers);
    ids = classifiers.map(item => item.id);

    const goods = await Good.findAll({
      where: {
        classifierId: ids,
        averageCost: {
          [Op.not]: null,
        },
      },
    });

    const goodIds = goods.map(item => item.dataValues.id);

    const hrefsDB = await Href.findAll({
      where: {
        goodId: goodIds,
        regionId,
      },
    });

    const positionsDB = await Position.findAll({
      where: {
        goodId: goodIds,
        regionId,
      },
    });

    const classifierObj = {};
    const synonymObj = {};

    for (let i = 0; i < classifiers.length; i = i + 1) {
      synonymObj[classifiers[i].id] = classifiers[i].fgisId;
      classifierObj[classifiers[i].fgisId] = {
        id: classifiers[i].id,
        noSelect: classifiers[i].noSelect,
        fixedPrice: classifiers[i].fixedPrice,
        unitFactor: classifiers[i].unitFactor,
        unit: classifiers[i].unit,
        fullUnit: classifiers[i].fullUnit,
        brutto: classifiers[i].brutto,
        cargoClass: classifiers[i].cargoClass,
        max: {
          goodId: null,
          goodAmount: 1,
          goodPrice: 0,
          priceId: null,
          priceValue: 0,
        },
        min: {
          goodId: null,
          goodAmount: 1,
          goodPrice: 1000000000,
          priceId: null,
          priceValue: 1000000000,
        }
      };
    }

    const goodObj = {};

    for (let i = 0; i < goods.length; i = i + 1) {
      const good = goods[i].dataValues;
      goodObj[good.id] = {
        amount: good.amount,
        cargoClass: good.cargoClass,
        brutto: good.brutto,
        min: {
          priceValue: 1000000000,
          priceId: null,
        },
        max: {
          priceValue: 0,
          priceId: null,
        },
      };
    }

    for (let i = 0; i < hrefsDB.length; i = i + 1) {
      const href = hrefsDB[i].dataValues;
      if (href.price < goodObj[href.goodId].min.priceValue) {
        goodObj[href.goodId].min.priceValue = href.price;
        goodObj[href.goodId].min.priceId = `h_${href.id}`;
      }
      if (href.price > goodObj[href.goodId].max.priceValue) {
        goodObj[href.goodId].max.priceValue = href.price;
        goodObj[href.goodId].max.priceId = `h_${href.id}`;
      }
    }

    for (let i = 0; i < positionsDB.length; i = i + 1) {
      const position = positionsDB[i].dataValues;
      if (position.price < goodObj[position.goodId].min.priceValue) {
        goodObj[position.goodId].min.priceValue = position.price;
        goodObj[position.goodId].min.priceId = `p_${position.id}`;
      }
      if (position.price > goodObj[position.goodId].max.priceValue) {
        goodObj[position.goodId].max.priceValue = position.price;
        goodObj[position.goodId].max.priceId = `p_${position.id}`;
      }
    }

    for (let i = 0; i < goods.length; i = i + 1) {
      const good = goods[i].dataValues;
      const fgisId = synonymObj[good.classifierId];
      const parentFgisId = synonymObj[good.classifierId].parentId;

      let materialAmount = materialsAmounts[fgisId];

      if (!materialAmount) {
        materialAmount = parentFgisId ? materialsAmounts[parentFgisId] : 1;
      }

      if (money.ceil(materialAmount / good.amount * good.minCost) < (materialAmount / classifierObj[fgisId].min.goodAmount * classifierObj[fgisId].min.goodPrice)) {
        classifierObj[fgisId].min.goodPrice = good.minCost;
        classifierObj[fgisId].min.goodId = good.id;
        classifierObj[fgisId].min.goodAmount = good.amount;
        classifierObj[fgisId].min.fullUnit = good.fullUnit;
        classifierObj[fgisId].min.unit = unitObj[good.unitId];
        classifierObj[fgisId].min.priceValue = goodObj[good.id].min.priceValue;
        classifierObj[fgisId].min.priceId = goodObj[good.id].min.priceId;
        classifierObj[fgisId].min.cargoClass = goodObj[good.id].cargoClass;
        classifierObj[fgisId].min.brutto = goodObj[good.id].brutto;
      }
      if (money.ceil(materialAmount / good.amount * good.maxCost) > (materialAmount / classifierObj[fgisId].max.goodAmount * classifierObj[fgisId].max.goodPrice)) {
        classifierObj[fgisId].max.goodPrice = good.maxCost;
        classifierObj[fgisId].max.goodId = good.id;
        classifierObj[fgisId].max.goodAmount = good.amount;
        classifierObj[fgisId].max.fullUnit = good.fullUnit;
        classifierObj[fgisId].max.unit = unitObj[good.unitId];
        classifierObj[fgisId].max.priceValue = goodObj[good.id].max.priceValue;
        classifierObj[fgisId].max.priceId = goodObj[good.id].max.priceId;
        classifierObj[fgisId].max.cargoClass = goodObj[good.id].cargoClass;
        classifierObj[fgisId].max.brutto = goodObj[good.id].brutto;
      }
    }

    for (let i = 0; i < childrenClassifiers.length; i = i + 1) {
      const fgisId = synonymObj[childrenClassifiers[i].id];
      const parentFgisId = synonymObj[childrenClassifiers[i].parentId];
      if (classifierObj[fgisId].min.priceValue < classifierObj[parentFgisId].min.priceValue) {
        classifierObj[parentFgisId].min = { ...classifierObj[fgisId].min };
      }
      if (classifierObj[fgisId].max.priceValue > classifierObj[parentFgisId].max.priceValue) {
        classifierObj[parentFgisId].max = { ...classifierObj[fgisId].max };
      }
    }

    return {
      goods: goodObj,
      classifiers: classifierObj,
      synonym: synonymObj,
    };
  }

  async getWorkPrices(positions) {
    let types = positions.map(position => (position.workPriceType));
    types = _.compact(_.uniq(types));
    const workPrices = await WorkPrice.findAll({ where: { type: types } });

    const workPricesObj = {};

    for (let i = 0; i < workPrices.length; i = i + 1) {
      const workPrice = workPrices[i].dataValues;
      workPricesObj[workPrice.type] = workPrice.price;
    }

    return {
      workprices: workPricesObj,
    };
  }

  checkFixedPrice(mat, classifier) {
    if (!classifier) {
      return mat;
    }

    let goodAmount = Number(mat.amount);
    let fixedPrice = money.ceil(mat.price / mat.amount);
    let { unit } = mat;

    if (mat.unit === classifier.fullUnit && classifier.fixedPrice) {
      goodAmount = money.toFixedUp(mat.amount * classifier.unitFactor);
      fixedPrice = classifier.fixedPrice;
      unit = classifier.unit;
    }

    if (mat.unit === classifier.unit && classifier.fixedPrice) {
      fixedPrice = classifier.fixedPrice;
    }

    mat = { ...mat, goodAmount, fixedPrice, unit };

    return mat;
  }

  checkFactorInUnit(mat) {
    const result = { ...mat };
    if (result.unit && result.unit.match(/10+/g)) {
      const factor = result.unit.match(/10+/g);
      result.fixedPrice = money.toFixed(result.fixedPrice / Number(factor[0]));
      result.goodAmount = money.toFixed(result.goodAmount * Number(factor[0]));
      result.unit = result.unit.replace(factor, '').replace(' ', '');
    }

    return result;
  }

  buildCostCalculation(costCalculation) {
    let fileIndex = 0;
    let sectionIndex = 0;
    let subsectionIndex = 0;
    let positionIndex = 0;
    let materialIndex = 0;
    let machineIndex = 0;
    const machineObj = {};

    const grouppedPositions = {};
    const grouppedMaterials = {};

    for (let i = 0; i < costCalculation.estimates.length; i = i + 1) {
      costCalculation.files.push({
        title: costCalculation.estimates[i].title,
        index: fileIndex,
      });
      const { sections, subsections, positions, materials, machines } = costCalculation.estimates[i];

      for (let j = 0; j < sections.length; j = j + 1) {
        costCalculation.sections.push({
          ...sections[j],
          index: sectionIndex + sections[j].index,
          fileIndex,
        });
      }

      for (let j = 0; j < subsections.length; j = j + 1) {
        costCalculation.subsections.push({
          ...subsections[j],
          index: subsectionIndex + subsections[j].index,
          sectionIndex: sectionIndex + subsections[j].sectionIndex,
          fileIndex,
        });
      }

      for (let j = 0; j < positions.length; j = j + 1) {
        costCalculation.positions.push({
          ...positions[j],
          index: positionIndex + positions[j].index,
          subsectionIndex: subsectionIndex + positions[j].subsectionIndex,
          sectionIndex: sectionIndex + positions[j].sectionIndex,
          fileIndex,
        });

        const { code, title, index, dismantling } = costCalculation.positions[costCalculation.positions.length - 1];

        const key = code ? `${code}${!!dismantling}` : `${title}${!!dismantling}`;

        if (grouppedPositions[key]) {
          grouppedPositions[key].push(index);
        } else {
          grouppedPositions[key] = [index];
        }
      }

      for (let j = 0; j < materials.length; j = j + 1) {
        costCalculation.materials.push({
          ...materials[j],
          index: materialIndex + materials[j].index,
          positionIndex: positionIndex + materials[j].positionIndex,
          subsectionIndex: subsectionIndex + materials[j].subsectionIndex,
          sectionIndex: sectionIndex + materials[j].sectionIndex,
          fileIndex,
        });

        const { fgisId, title, index } = costCalculation.materials[costCalculation.materials.length - 1];

        const key = fgisId || title;

        if (grouppedMaterials[key]) {
          grouppedMaterials[key].push(index);
        } else {
          grouppedMaterials[key] = [index];
        }
      }

      for (let j = 0; j < machines.length; j = j + 1) {
        const { amount, fgisId } = machines[j];
        const category = fgisId.match(/\d{2}\.\d{2}\.\d{2}/);
        if (!category || !category[0]) {
          continue;
        }
        if (!machineObj[category[0]]) {
          machineObj[category[0]] = { amount, fixedPrice: 0, index: machineIndex };
          machineIndex = machineIndex + 1;
        } else {
          machineObj[category[0]].amount = money.toFixed(machineObj[category[0]].amount + amount);
        }
      }

      fileIndex = fileIndex + 1;
      sectionIndex = sectionIndex + sections.length;
      subsectionIndex = subsectionIndex + subsections.length;
      positionIndex = positionIndex + positions.length;
      materialIndex = materialIndex + materials.length;
    }

    costCalculation = {
      ...costCalculation,
      machines: machineObj,
      grouppedPositions,
      grouppedMaterials,
    };

    return costCalculation;
  }

  async buildCost({ costCalculation, workprices, classifiers, minimax = 'min' }) {
    for (let i = 0; i < costCalculation.positions.length; i = i + 1) {
      const { workPriceType } = costCalculation.positions[i];
      if (workprices[workPriceType] || workprices[workPriceType] === 0) {
        costCalculation.positions[i].price = workprices[workPriceType];
      }
    }

    for (let i = 0; i < costCalculation.materials.length; i = i + 1) {
      let mat = costCalculation.materials[i];

      if (mat.hidden) {
        continue;
      }
      const classifier = classifiers[mat.fgisId];

      if (!classifier) {
        mat = {
          fixedPrice: money.ceil(mat.price / mat.amount),
          goodAmount: money.toFixedUp(mat.amount),
          noSelect: true,
          ...mat,
        };
        mat = this.checkFactorInUnit(mat);
        costCalculation.materials[i] = mat;
        continue;
      }

      const material = this.checkFixedPrice(mat, classifier);

      const { unitFactor, fullUnit } = classifier;
      const { goodId, priceId, goodAmount, priceValue, unit } = classifier[minimax];

      if ((classifier && classifier.noSelect)
        || mat.noSelect
        || (!goodId || !priceId || !goodAmount)
        || (mat.unit !== unit && mat.unit !== fullUnit)) {
        mat = {
          ...material,
          noSelect: true,
        };

        mat = this.checkFactorInUnit(mat);
        costCalculation.materials[i] = mat;
        continue;
      }

      mat = {
        ...mat,
        goodId,
        goodAmount: money.toFixedUp(mat.amount * unitFactor),
        priceId,
        priceValue,
        unit,
      };

      costCalculation.materials[i] = mat;
    }

    return costCalculation;
  }

  calculateMaterialSum({ materials, goods }) {
    let materialSum = 0;

    for (let i = 0; i < materials.length; i = i + 1) {
      const { fixedPrice, goodAmount, priceValue, goodId } = materials[i];
      if (priceValue && goodId) {
        materialSum = materialSum + money.toFixed(money.toFixed(priceValue) * money.ceil(goodAmount / goods[goodId].amount));
      }
      materialSum = materialSum + money.toFixed(money.toFixed(fixedPrice) * money.toFixed(goodAmount));
    }

    return money.toFixed(materialSum * 1.2);
  }

  async recalculate(materials) {
    let hrefs = [];
    let positions = [];
    let classifiers = [];
    let goods = [];

    let materialCost = 0;

    materials.forEach((item) => {
      if (item && item.priceId && item.priceId.indexOf('p_') > -1) {
        positions.push(item.priceId.replace('p_', ''));
      }
      if (item && item.priceId && item.priceId.indexOf('h_') > -1) {
        hrefs.push(item.priceId.replace('h_', ''));
      }
      if (item && item.classifierId) {
        classifiers.push(item.classifierId);
      }
      if (item && item.goodId) {
        goods.push(item.goodId);
      }
    });

    positions = await Position.findAll({ where: { id: positions }, attributes: ['id', 'price'] });

    const pricesObj = {};

    positions.forEach((position) => {
      const { id, price } = position.dataValues;
      pricesObj[`p_${id}`] = price;
    });

    hrefs = await Href.findAll({ where: { id: hrefs }, attributes: ['id', 'price'] });

    hrefs.forEach((href) => {
      const { id, price } = href.dataValues;
      pricesObj[`h_${id}`] = price;
    });

    const classifiersObj = {};

    classifiers = await FgisClassifier.findAll({ where: { id: classifiers }, attributes: ['id', 'fixedPrice'] });

    classifiers.forEach((classifier) => {
      const result = classifier.dataValues;
      classifiersObj[result.id] = result.fixedPrice;
    });

    const goodsObj = {};

    goods = await Good.findAll({ where: { id: goods }, attributes: ['id', 'amount'] });

    goods.forEach((good) => {
      const result = good.dataValues;
      classifiersObj[result.id] = result.amount;
    });

    for (let i = 0; i < materials.length; i = i + 1) {
      const { priceId, fixedPrice, classifierId, goodId, goodAmount } = check.materials[i];
      let priceValue = pricesObj[priceId];

      if (!priceValue) {
        priceValue = classifiersObj[classifierId] ? classifiersObj[classifierId] : fixedPrice;
      }

      materials[i] = {
        ...materials[i],
        priceId,
        priceValue,
      };
      materialCost = materialCost + money.toFixedUp(goodAmount / goodsObj[goodId].amount) * priceValue;
    }

    materialCost = money.toFixed(materialCost);

    return { materials, materialCost };
  }

  async recalculateTenders() {
    const ids = await Tender.findAll({ where: { finished: false }, order: ['id'], attributes: ['id'] });
    console.log(`Всего ${ids.length} тендеров для пересчета`);
    for (let i = 0; i < ids.length; i = i + 1) {
      console.log(i + 1, '/', ids.length);
      const tenderId = ids[i].dataValues.id;

      const transaction = await sequelize.transaction();

      try {
        const calculationMin = await Calculation.findOne({ where: { tenderId, type: CALCULATION_TYPES.min.code } }, { transaction });
        const calculationMax = await Calculation.findOne({ where: { tenderId, type: CALCULATION_TYPES.max.code } }, { transaction });

        let materialMinCost = 0;
        let materialMaxCost = 0;

        if (calculationMin) {
          const { materials, materialCost } = await this.recalculate(calculationMin.dataValues.materials);
          await Calculation.update({ materials, materialCost }, { where: { id: calculationMin.dataValues.id } }, { transaction });

          materialMinCost = materialCost;
        }

        if (calculationMax) {
          const { materials, materialCost } = await CalculationService.recalculate(calculationMin.dataValues.materials);
          await Calculation.update({ materials, materialCost }, { where: { id: calculationMax.dataValues.id } }, { transaction });

          materialMaxCost = materialCost;
        }
        await Tender.update({ materialMinCost, materialMaxCost }, { where: { id: tenderId } }, { transaction });

        transaction.commit();
        console.log('Тендер с id ', tenderId, ' пересчитан');
      } catch (error) {
        transaction.rollback();
        console.log('Ошибка при пересчете тендера с id ', tenderId);
      }
    }

    console.log('Everything is done!!!');
  }

  async validate(estimate, calculationId) {
    const { files, sections, subsections, positions, materials, machines } = estimate;
    const calculationFromBase = await Calculation.findOne({
      where: {
        id: calculationId,
      },
    });
    const conflicts = {
      count: 0,
      conflicts: [],
    };

    const { files: filesPrev, sections: sectionsPrev, subsections: subsectionsPrev, positions: positionsPrev, materials: materialsPrev, machines: machinesPrev } = calculationFromBase.dataValues;

    let materialCost = 0;
    let workCost = 0;

    if (filesPrev.length !== files.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество files не соответствует исходному');
      return conflicts;
    }

    if (sectionsPrev.length !== sections.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество sections не соответствует исходному');
      return conflicts;
    }

    if (subsectionsPrev.length !== subsections.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество subsections не соответствует исходному');
      return conflicts;
    }

    if (positionsPrev.length !== positions.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество positions не соответствует исходному');
      return conflicts;
    }

    if (materialsPrev.length !== materials.length) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество materials не соответствует исходному');
      return conflicts;
    }

    let machinesCount = 0;

    for (let i = 0; i < machines.length; i = i + 1) {
      const { clientItem } = machines[i];

      if (!clientItem) {
        machinesCount = machinesCount + 1;
      } else {
        machines[i] = _.pick(machines[i], 'index', 'title', 'amount', 'fgisId', 'fixedPrice');
      }
    }

    if (machinesPrev.length !== machinesCount) {
      conflicts.count = conflicts.count + 1;
      conflicts.conflicts.push('Количество machines без clientItem не соответствует исходному');
      return conflicts;
    }

    for (let i = 0; i < positionsPrev.length; i = i + 1) {
      const {
        code, title, unit, amount
      } = positionsPrev[i];
      workCost = workCost + money.toFixed(positions[i].price * positions[i].amount);

      if (code && code !== positions[i].code) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`Код позиции ${i} ${positions[i].code} не соответствует исходному`);
      }
      if (title && title !== positions[i].title) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`Заголовок позиции ${i} ${positions[i].title} не соответствует исходному`);
      }
      if (unit && unit !== positions[i].unit) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`Ед.изм. позиции ${i} ${positions[i].unit} не соответствует исходному`);
      }
      if (amount && amount !== positions[i].amount) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`Количество позиции ${i} ${positions[i].amount} не соответствует исходному`);
      }
    }

    for (let i = 0; i < materialsPrev.length; i = i + 1) {
      const {
        priceId, goodAmount, fixedPrice, priceValue, noSelect, userNoSelect
      } = materials[i];

      if (fixedPrice && (noSelect || userNoSelect)) {
        materials[i].fixedPrice = money.round(materials[i].fixedPrice);
        materialCost = materialCost + money.toFixed(goodAmount * fixedPrice);
      } else {
        materialCost = materialCost + money.toFixed(goodAmount * priceValue);
      }

      const fixedKeys = ['unit', 'price', 'title', 'amount', 'fgisId', 'hidden', 'noSelect', 'expandPrice', 'classifierId'];
      fixedKeys.forEach((key) => {
        if (materialsPrev[i][key] !== materials[i][key]) {
          conflicts.count = conflicts.count + 1;
          conflicts.conflicts.push(`${key} в ${i} ${materials[i]} не соответствует исходной`);
        }
      });
      const numberKeys = ['fixedPrice', 'goodAmount', 'goodId', 'priceValue'];
      numberKeys.forEach((key) => {
        if (materials[i][key] && Number.isNaN(Number(materials[i][key]))) {
          conflicts.count = conflicts.count + 1;
          conflicts.conflicts.push(`${key} в ${i} ${materials[i]} не является числовым значением`);
        }
      });
      if (priceId && priceId.indexOf('h_') === -1 && priceId.indexOf('p_') === -1) {
        conflicts.count = conflicts.count + 1;
        conflicts.conflicts.push(`PriceId: ${priceId} в ${i} ${materials[i]} не верный формат priceId`);
      }
    }

    return { conflicts, materialCost: money.toFixed(materialCost), workCost: money.toFixed(workCost) };
  }

  async getItems(files) {
    if (!files) {
      return null;
    }

    const items = {
      goods: {},
      hrefs: {},
      positions: {},
      providers: [],
      machines: {},
    };

    let { materials, positions, machines } = files;

    let classifiers = [];

    materials.forEach((item) => {
      if (item && item.classifierId) {
        classifiers.push(item.classifierId);
      }
    });

    classifiers = _.uniq(_.compact(classifiers));

    const childrenClassifiers = await FgisClassifier.findAll({ where: { parentId: classifiers }, attributes: ['id', 'parentId'] });

    const childrenClassifiersIds = childrenClassifiers.map(item => (item.dataValues.id));

    classifiers = classifiers.concat(childrenClassifiersIds);

    const goods = await Good.findAll({ where: { classifierId: classifiers }, attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'maxCost', 'minCost', 'averageCost'] } });

    const goodIds = goods.map(item => (item.dataValues.id));

    const hrefs = await Href.findAll({ where: { goodId: goodIds }, attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'href', 'parseCoeff', 'title'] } });
    positions = await Position.findAll({ where: { goodId: goodIds }, attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'vendorcode', 'barcode', 'version', 'assigned'] } });

    classifiers.forEach((classifier) => {
      items.goods[classifier] = [];
    });

    goods.forEach((good) => {
      const { id, classifierId } = good.dataValues;
      items.goods[classifierId].push(good.dataValues);
      items.hrefs[id] = [];
      items.positions[id] = [];
    });

    const providerIds = [];

    hrefs.forEach((href) => {
      const { goodId } = href.dataValues;
      items.hrefs[goodId].push(href.dataValues);
      providerIds.push(href.dataValues.providerId);
    });

    positions.forEach((position) => {
      const { goodId } = position.dataValues;
      items.positions[goodId].push(position.dataValues);
      providerIds.push(href.dataValues.providerId);
    });

    childrenClassifiers.forEach((children) => {
      const { id, parentId } = children.dataValues;
      items.goods[parentId] = items.goods[parentId].concat(items.goods[id]);
    });

    const providers = await Provider.findAll({ where: { id: providerIds }, attributes: ['id', 'title', 'regionId'] });

    providers.forEach((provider) => {
      items.providers.push(provider.dataValues);
    });

    let machineIds = machines.map((mch) => {
      if (mch.fgisId && mch.fgisId.match(/\d{2}\.\d{2}\.\d{2}/)) {
        return mch.fgisId.match(/\d{2}\.\d{2}\.\d{2}/)[0];
      }
    });

    machineIds = _.uniq(_.compact(machineIds));

    const machinesDB = await FgisClassifier.findAll({ where: { fgisId: machineIds } });

    machinesDB.forEach((mch) => {
      items.machines[mch.fgisId] = mch.dataValues.title;
    });

    return items;
  }

  setPricesPositions(files) {
    const { positions } = files;

    const positionObj = {};

    for (let i = 0; i < positions.length; i = i + 1) {
      const {
        code, price, amount, workPriceType, dismantling
      } = positions[i];
      if (workPriceType) {
        continue;
      }
      if (!positionObj[code]) {
        positionObj[code] = { [price]: amount };
      }
      if (positionObj[code] && !positionObj[code][price]) {
        positionObj[code][price] = amount;
      }
      if (positionObj[code] && positionObj[code][price]) {
        positionObj[code][price] = +positionObj[code][price] + amount;
      }

      if (!positionObj[code].dismantling && dismantling) {
        positionObj[code].dismantling = dismantling;
      }
    }

    const codes = Object.keys(positionObj);

    for (let i = 0; i < codes.length; i = i + 1) {
      const code = codes[i];
      const { dismantling } = positionObj[code];
      delete positionObj[code].dismantling;
      const prices = Object.keys(positionObj[code]);
      if (prices.length === 1) {
        positionObj[code].average = money.toFixed(prices[0]);
        positionObj[code].min = money.toFixed(prices[0]);
        positionObj[code].max = money.toFixed(prices[0]);
      } else {
        let sum = 0;
        let amounts = 0;
        for (let j = 0; j < prices.length; j = j + 1) {
          const price = prices[j];
          const amount = positionObj[code][price];
          sum = sum + money.toFixed(price * amount);
          amounts = amounts + money.toFixed(amount);
        }
        const average = money.toFixed(sum / amounts);

        sum = 0;
        amounts = 0;
        for (let j = 0; j < prices.length; j = j + 1) {
          const price = prices[j];
          if (+price < +average) {
            const amount = positionObj[code][price];
            sum = sum + money.toFixed(price * amount);
            amounts = amounts + money.toFixed(amount);
          }
        }
        const min = money.toFixed(sum / amounts);

        sum = 0;
        amounts = 0;
        for (let j = 0; j < prices.length; j = j + 1) {
          const price = prices[j];
          if (+price >= +average) {
            const amount = positionObj[code][price];
            sum = sum + money.toFixed(price * amount);
            amounts = amounts + money.toFixed(amount);
          }
        }
        const max = money.toFixed(sum / amounts);

        positionObj[code].average = average;
        positionObj[code].min = min;
        positionObj[code].max = max;

        if (!dismantling) {
          positionObj[code].min = average;
          positionObj[code].max = average;
        }
      }
    }

    for (let i = 0; i < positions.length; i = i + 1) {
      const { workPriceType, code } = positions[i];
      if (!workPriceType) {
        if (positionObj[code]) {
          if (positions[i].price >= positionObj[code].average) {
            positions[i].price = positionObj[code].max;
          }
          if (positions[i].price < positionObj[code].average) {
            positions[i].price = positionObj[code].min;
          }
        }
      }
    }

    files.positions = positions;

    return files;
  }

  setPricesMaterials(files) {
    const { materials } = files;

    const materialsObj = {};

    for (let i = 0; i < materials.length; i = i + 1) {
      const {
        fixedPrice, goodAmount, noSelect, unit, title
      } = materials[i];
      let { fgisId } = materials[i];
      if (!noSelect) {
        continue;
      }
      fgisId = fgisId || title;
      if (!materialsObj[fgisId]) {
        materialsObj[fgisId] = { [unit]: {
          amount: goodAmount,
          price: fixedPrice * goodAmount,
        } };
      }
      if (materialsObj[fgisId] && !materialsObj[fgisId][unit]) {
        materialsObj[fgisId][unit] = {
          amount: goodAmount,
          price: fixedPrice * goodAmount,
        };
      }
      if (materialsObj[fgisId] && materialsObj[fgisId][unit]) {
        materialsObj[fgisId][unit] = {
          amount: materialsObj[fgisId][unit].amount + goodAmount,
          price: materialsObj[fgisId][unit].price + fixedPrice * goodAmount,
        };
      }
    }

    const fgisIds = Object.keys(materialsObj);

    for (let i = 0; i < fgisIds.length; i = i + 1) {
      const fgisId = fgisIds[i];
      const units = Object.keys(materialsObj[fgisId]);

      for (let j = 0; j < units.length; j = j + 1) {
        const unit = units[j];
        materialsObj[fgisId][unit].average = money.toFixed(materialsObj[fgisId][unit].price / materialsObj[fgisId][unit].amount);
      }
    }

    for (let i = 0; i < materials.length; i = i + 1) {
      const { unit, title } = materials[i];
      let { fgisId } = materials[i];
      fgisId = fgisId || title;
      if (fgisId && unit && materialsObj[fgisId] && materialsObj[fgisId][unit]) {
        materials[i].fixedPrice = materialsObj[fgisId][unit].average;
      }
    }

    files.materials = materials;

    return files;
  }

  calculateCargo({ materials, classifiers, goods, cargo }) {
    for (let i = 0; i < materials.length; i = i + 1) {
      const { goodAmount, goodId, fgisId, amount: matAmount } = materials[i];

      if (!goodId) {
        if (fgisId && classifiers[fgisId]) {
          const { cargoClass, brutto } = classifiers[fgisId];

          if (cargoClass && brutto) {
            cargo[cargoClass].weight = cargo[cargoClass].weight + money.toFixed(brutto * money.ceil(matAmount));
          }

          continue;
        }

        const { unit } = materials[i];

        if (unit === 'кг' || unit === 'кг.') {
          cargo[1].weight = cargo[1].weight + money.toFixed(0.001 * money.ceil(goodAmount));
        }
        if (unit === 'т' || unit === 'т.') {
          cargo[1].weight = cargo[1].weight + money.toFixed(1 * money.ceil(goodAmount));
        }

        continue;
      }

      const { cargoClass, brutto, amount } = goods[goodId];

      if (!cargoClass || !brutto) {
        continue;
      }

      cargo[cargoClass].weight = cargo[cargoClass].weight + money.toFixed(brutto * money.ceil(goodAmount / amount));
    }

    return cargo;
  }

  async updateUserMaterialFixedPrices(materials, userId) {
    let materialObj = {};

    materials.forEach((mat) => {
      const { fgisId, noSelect, fixedPrice } = mat;
      if (fgisId && noSelect && fixedPrice && mat.fgisId.match(/\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}-\d{3,4}/)) {
        if (!materialObj[mat.fgisId]) {
          materialObj[mat.fgisId] = { price: mat.fixedPrice, count: 1 };
        } else if (materialObj[mat.fgisId] !== mat.fixedPrice) {
          materialObj[mat.fgisId].count = materialObj[mat.fgisId].count + 1;
        }
      }
    });

    Object.keys(materialObj).forEach((key) => {
      if (materialObj[key].count > 1) {
        delete materialObj[key];
      } else {
        materialObj[key] = materialObj[key].price;
      }
    });

    if (Object.keys(materialObj).length <= 0) {
      return false;
    }

    const materialFixedPrice = await MaterialFixedPrice.findOne({ where: { userId } });

    if (materialFixedPrice) {
      materialObj = { ...materialFixedPrice.dataValues.prices, ...materialObj };
      await MaterialFixedPrice.update({ prices: materialObj }, { where: { userId } });
    } else {
      await MaterialFixedPrice.create({ prices: materialObj, userId });
    }

    return true;
  }

  async updateUserMaсhinesFixedPrices(machines, userId) {
    let machinesObj = {};

    machines.forEach((mch) => {
      if (mch.fgisId) {
        machinesObj[mch.fgisId] = mch.price;
      } else {
        machinesObj[mch.title] = mch.price;
      }
    });

    if (Object.keys(machinesObj).length <= 0) {
      return false;
    }

    const machinesFixedPrice = await MachinesFixedPrice.findOne({ where: { userId } });

    if (machinesFixedPrice) {
      machinesObj = { ...machinesFixedPrice.dataValues.prices, ...machinesObj };
      await MachinesFixedPrice.update({ prices: machinesObj }, { where: { userId } });
    } else {
      await MachinesFixedPrice.create({ prices: machinesObj, userId });
    }

    return true;
  }
}


module.exports = new CalculationService();
