const { DateTime } = require('luxon');
const { Op } = require('sequelize');
const { TARIFF_PLANS, PAYMENT_TYPES } = require('../config/constants');

const Builder = require('../schemas/Builder');
const Card = require('../schemas/Card');
const Payment = require('../schemas/Payment');
const TinkoffApi = require('../api/Tinkoff')

// на другие нам пока что пофиг, и мы их просто записываем в базу
const PAYMENT_STATUSES = {
  CONFIRMED: 'CONFIRMED',
  AUTHORIZED: 'AUTHORIZED'
};


class PaymentService {
  async checkPayments() {
    const now = DateTime.local().toString();
    const today = DateTime.local().plus({ days: 1, hours: 2 }).toString();


    // ищем билдеров через subscribed - это единственное поле ,по которому мы понимаем, что
    // у компании активная подписка, например - если компания подписана, но платеж не прошел
    // то ее тариф переведется на free.
    const builders = await Builder.findAll({
      where: {
        tariff: {
          [Op.gt]: TARIFF_PLANS.free.code,
        },
        nextPaymentDate: {
          [Op.gte]: now,
          [Op.lte]: today,
        }
      },
    });

    for (let i = 0; i < builders.length; i = i + 1) {
      const builder = builders[i].dataValues;
      // если пользователь перешел на бесплатный тариф, и с предыдущего платежа подписка закончилась -
      // переводим на бесплатный тариф
      if (builder.paymentType === PAYMENT_TYPES.none.code) {
        await Builder.update({ tariff: TARIFF_PLANS.free.code, subscribed: false }, { where: { id: builder.id } });
      } else {
        await this.remakePayment(builder);
      }
    }
  }

  // если мы переходим на более дорогой тариф, то оплачиваем его только частично
  // либо не оплачиваем вовсе, а просто меняем дату, если, например, было еще несколько месяцев дешевого
  // а мы подписались на месяц дорогого
  countAmountAndDays(tariff, type, company) {
    const currentTariffPlan = Object.values(TARIFF_PLANS).find(item => String(item.code) === String(company.tariff));

    const newPaymentType = Object.values(PAYMENT_TYPES).find(item => String(item.code) === String(type));
    const newTariffPlan = Object.values(TARIFF_PLANS).find(item => String(item.code) === String(tariff));

    const daysLeft = DateTime.fromISO(company.nextPaymentDate).diffNow().days();
    const valueLeft = currentTariffPlan.annualFee * (daysLeft / 365);

    const valueNeeded = newTariffPlan.annualFee;

    return {
      days: Math.floor(newPaymentType.days * (valueLeft / valueNeeded))
    };
  }

  // определяет, какого типа будет переход
  // 1 - новый тариф выше, предыдущий был бесплатный, полная оплата сразу
  // 2 - новый выше, но денег не надо, мы пересчитаем его в счет текущего баланса
  // 3 - новый тариф ниже - ставим некст тариф, оплаты нет
  // 4 - поменялся только тип - оплаты нет, просто меняет тип платежа
  // 5 - ничего не поменялось, какого фига пришел этот запрос?
  async checkTransitionType(tariff, type, companyId) {
    const company = await Builder.findOne({ where: { id: companyId } });

    // в целом пофиг, какой сейчас тариф ,если чел не подписан
    if (!company.subscribed && Number(tariff) > 0) {
      return { type: 1 };
    }

    if (tariff > company.tariff) {
      const { days } = await this.countAmountAndDays(tariff, type, company);

      return { type: 2, days };
    }

    if (tariff < company.tariff) {
      return { type: 3 };
    }

    if (type !== company.type) {
      return { type: 4 };
    }

    return { type: 5 };
  }



  // блокируем подпску - у пользователя остается такой же тариф и тип платежа, но он больше не имеет доступа
  // к сервисам, следующий платеж назначаем через неделю, чтобы не пытаться списывать бабки
  // каждый день
  async blockSubscription(builder) {
    let { nextPaymentDate } = builder;
    const { id } = builder;
    nextPaymentDate = DateTime.fromISO(nextPaymentDate).plus({ days: 7 }).toString();
    return Builder.update({ nextPaymentDate, subscribed: false }, { where: { id } });
  }

  // переводим дату следующего платежа на нужный период вперед
  async renewSubscription(builder) {
    const currentType = Object.values(PAYMENT_TYPES).find(type => String(type.code) === String(builder.paymentType));
    const { days } = currentType;

    // мы всегда именно плюсуем период тарифа. если пользователь не был подписан или его подписка была приостановлена
    // - нам надо считать подписку активной с сегодняшнего дня
    // если он активен и поднял тариф - мы пересчитываем оставшиеся деньги ровно так, чтобы прибавить весь период
    // - год или месяц, соответственно остаток обнуляется, и добавлется период целиком
    const nextPaymentDate = DateTime.local().plus({ days }).toString();
    await Builder.update({ nextPaymentDate, subscribed: true }, { where: { id: builder.id } });

    return undefined;
  }

  async remakePayment(builder) {
    const initResult = await TinkoffApi.initPayment(builder);
    const { PaymentId, Success } = initResult;

    if (!Success) {
      return this.blockSubscription(builder);
    }

    const chargeResult = await TinkoffApi.chargePayment(builder, PaymentId);
    const { Success: ChargeSuccess } = chargeResult;

    if (!ChargeSuccess) {
      return this.blockSubscription(builder);
    }

    return this.renewSubscription(builder);
  }

  async subscribe(builder, amount) {
    const { type, tariff, id } = builder;
    const builderDB = await Builder.findOne({ where: { id } });
    const { PaymentId, Success, ErrorMessage, Message } = await TinkoffApi.initPayment({
      ...builderDB.dataValues,
      type,
      tariff
    }, false, amount);

    if (!Success) {
      return { Success, ErrorMessage, Message };
    }

    const chargeResult = await TinkoffApi.chargePayment(builderDB.dataValues, PaymentId);

    if (chargeResult.Success) {
      console.log('успешно зачарджили, возращаем ответ апи');

      await Builder.update({ paymentType: type, tariff }, { where: { id } });
      const updatedBuilder = await Builder.findOne({ where: { id } });
      console.log('успешно зачарджили, возращаем ответ апи2', updatedBuilder.dataValues);
      await this.renewSubscription(updatedBuilder.dataValues);
      console.log('успешно зачарджили, возращаем ответ апи3');
    } else {
      console.log('НЕУСПЕШНО ЗАЧАРДЖИЛИ', chargeResult);
    }


    return chargeResult;
  }

  async updatePayment(tinkoffAnswer) {
    const { PaymentId, Status, ErrorCode, Message, ErrorMessage, OrderId, Details } = tinkoffAnswer;
    Payment.update({
      paymentId: PaymentId,
      status: Status,
      message: Message || ErrorMessage,
      errorCode: ErrorCode,
      details: Details
    }, { where: { id: OrderId } });
  }

  // обработка нотификации от банка о новом статусе платежа
  async handleBankNotification(request) {
    console.log('NOTIFICATION', request);

    const { Status, OrderId, RebillId, CardId, Pan, PaymentId, Amount } = request;
    await this.updatePayment(request);
    const payment = await Payment.findOne({ where: { id: OrderId }, });

    if (!payment) {
      console.log('не нашли такой платеж!!!!');
      return false;
    }

    console.log('платеж нашли');

    if (Status === PAYMENT_STATUSES.CONFIRMED && Amount === 100) {
      const { companyId } = payment.dataValues;

      await TinkoffApi.cancelPayment(PaymentId);

      console.log('платеж отменили, создаем карту', {
        companyId,
        rebillId: RebillId,
        cardId: CardId,
        pan: Pan
      });

      const card = await Card.findOne({ where: { companyId, cardId: CardId } });

      if (card) {
        await Builder.update({
          currentCardId: card.dataValues.id,
        }, { where: { id: companyId } });
      } else {
        const newCard = await Card.create({
          companyId,
          rebillId: RebillId,
          cardId: CardId,
          pan: Pan
        });

        await Builder.update({
          currentCardId: newCard.dataValues.id,
        }, { where: { id: companyId } });
      }
    }

    return true;
  }
}

module.exports = new PaymentService();
