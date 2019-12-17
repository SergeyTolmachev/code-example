const express = require('express');

const router = express.Router();

const {
  builder,
  calculation,
  callrequest,
  card,
  cargo,
  city,
  classifier,
  cron,
  estimate,
  event,
  good,
  href,
  invite,
  leadcomment,
  lead,
  leadphone,
  materialfixedprice,
  machinesfixedprice,
  payment,
  position,
  provider,
  region,
  sro,
  subscribesettings,
  techTicket,
  techTicketAnswer,
  tender,
  ticket,
  unit,
  user,
  workPrice
} = require('../controllers');

const {
  calculationRpc,
  companyRpc,
  emailRpc,
  estimateRpc,
  exchangeRpc,
  goodRpc,
  hrefRpc,
  inviteRpc,
  leadRpc,
  parsersRpc,
  paymentRpc,
  positionRpc,
  tenderRpc,
  ticketRpc,
  subscribeSettingsRpc,
  userRpc,
  workPriceRpc,
} = require('../rpc');

const { USER_GROUPS, TARIFF_PLANS } = require('../config/constants');
const {
  checkErrors, checkTariff, isAuth, belongsToGroup, bruteforceAuth, bruteforceChange
} = require('../middlewares');

const restRouterArray = {
  builder: {
    controller: builder.controller,
    validator: builder.validator,
    middlewares: [isAuth('auth')],
    extraMiddlewares: {
      create: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])],
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN])],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN])]
    }
  },
  calculation: {
    controller: calculation.controller,
    middlewares: [isAuth('getUserData')],
    extraMiddlewares: {
      create: [belongsToGroup([USER_GROUPS.CLIENT_ADMIN]), checkTariff(TARIFF_PLANS.free)],
      update: [belongsToGroup([USER_GROUPS.CLIENT_ADMIN]), checkTariff(TARIFF_PLANS.free)],
    },
    validator: calculation.validator,
  },
  callrequest: {
    controller: callrequest.controller,
    middlewares: [isAuth('getUserData')],
    extraMiddlewares: {
      getItem: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
      getList: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
    },
  },
  card: {
    controller: card.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN])],
  },
  cargo: {
    controller: cargo.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN])],
  },
  city: {
    controller: city.controller,
    middlewares: [isAuth('getUserData')],
    extraMiddlewares: {
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])],
      create: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])]
    },
  },
  classifier: {
    controller: classifier.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
    validator: classifier.validator,
  },
  cron: {
    controller: cron.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
    validator: cron.validator,
  },
  estimate: {
    controller: estimate.controller,
    validator: estimate.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
  },
  event: {
    controller: event.controller,
    middlewares: [isAuth('getUserData')],
  },
  good: {
    controller: good.controller,
    // TODO: ограничить управление товарами для клиентского манагера только над своими товарами
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER, USER_GROUPS.CLIENT_MANAGER])],
  },
  href: {
    controller: href.controller,
    validator: href.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
  },
  invite: {
    controller: invite.controller,
    validator: invite.validator,
    middlewares: [isAuth('auth'), checkTariff(TARIFF_PLANS.basic), belongsToGroup([USER_GROUPS.CLIENT_ADMIN, USER_GROUPS.PROVIDER_ADMIN])],
  },
  leadcomment: {
    controller: leadcomment.controller,
    validator: leadcomment.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
  },
  lead: {
    controller: lead.controller,
    validator: lead.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
  },
  leadphone: {
    controller: leadphone.controller,
    validator: leadphone.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
  },
  materialfixedprice: {
    controller: materialfixedprice.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER, USER_GROUPS.CLIENT_MANAGER])],
  },
  machinesfixedprice: {
    controller: machinesfixedprice.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER, USER_GROUPS.CLIENT_MANAGER])],
  },
  payment: {
    controller: payment.controller,
    validator: payment.validator,
    extraMiddlewares: {
      getList: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN])],
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      create: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])]
    },
  },
  position: {
    controller: position.controller,
    validator: position.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.PROVIDER_MANAGER])],
  },
  provider: {
    controller: provider.controller,
    validator: provider.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER, USER_GROUPS.PROVIDER_MANAGER])],
  },
  region: {
    controller: region.controller,
    validator: region.validator,
    extraMiddlewares: {
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      crete: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])]
    }
  },
  sro: {
    controller: sro.controller,
    validator: sro.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
  },
  subscribesettings: {
    controller: subscribesettings.controller,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_MANAGER])],
  },
  techticket: {
    controller: techTicket.controller,
    validator: techTicket.validator,
    middlewares: [isAuth('auth')],
    extraMiddlewares: {
      create: [belongsToGroup([USER_GROUPS.CLIENT_MANAGER, USER_GROUPS.PROVIDER_MANAGER])],
      getList: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT, USER_GROUPS.CLIENT_MANAGER, USER_GROUPS.PROVIDER_MANAGER])],
      getItem: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT])],
      update: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT])],
      remove: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT])]
    }
  },
  techticketanswer: {
    controller: techTicketAnswer.controller,
    validator: techTicketAnswer.validator,
    middlewares: [isAuth('auth')],
    extraMiddlewares: {
      create: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT])],
      getList: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT, USER_GROUPS.CLIENT_MANAGER, USER_GROUPS.PROVIDER_MANAGER])],
      getItem: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT, USER_GROUPS.CLIENT_MANAGER, USER_GROUPS.PROVIDER_MANAGER])],
      remove: [belongsToGroup([USER_GROUPS.SERVICE_SUPPORT])]
    }
  },
  tender: {
    controller: tender.controller,
    validator: tender.validator,
    middlewares: [isAuth('getUserData')],
    extraMiddlewares: {
      create: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])]
    }
  },
  ticket: {
    controller: ticket.controller,
    validator: ticket.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
  },
  unit: {
    controller: unit.controller,
    validator: unit.validator,
    extraMiddlewares: {
      update: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])],
      crete: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_ADMIN])]
    }
  },
  user: {
    controller: user.controller,
    validator: user.validator,
    // TODO: добавить возможность менеджеру редактировать свой профиль
    extraMiddlewares: {
      update: [isAuth('auth')],
      remove: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN, USER_GROUPS.PROVIDER_ADMIN])],
      getList: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN, USER_GROUPS.PROVIDER_ADMIN])],
      getItem: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN, USER_GROUPS.PROVIDER_ADMIN])]
    },
  },
  workprice: {
    controller: workPrice.controller,
    validator: workPrice.validator,
    middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_ADMIN])],
    extraMiddlewares: {
      create: [belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      remove: [belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
    },
  },
};

const rpcRouterArray = {
  calculation: {
    controller: calculationRpc.controller,
    validator: calculationRpc.validator,
    specials: {
      getExcel: {
        middlewares: [isAuth('getUserData')],
        path: 'excel',
      },
    }
  },
  company: {
    controller: companyRpc.controller,
    validator: companyRpc.validator,
    specials: {
      registration: {
        path: 'registration',
      }
    }
  },
  email: {
    controller: emailRpc.controller,
    validator: emailRpc.validator,
    specials: {
      confirmEmail: {
        path: 'confirm',
      },
      sendEmail: {
        path: 'send',
      },
      createTemplate: {
        path: 'template/create',
      },
      updateTemplate: {
        path: 'template/update',
      },
      deleteTemplate: {
        path: 'template/delete',
      },
      getTemplatesList: {
        path: 'template/list',
      },
      sendWelcomeEmails: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
        path: 'send/welcome',
      },
      retrySendWelcomeEmail: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
        path: 'send/welcome-retry',
      },
      getImageFromEmail: {
        method: 'all',
        path: 'get-image/:hash',
      },
    }
  },
  estimate: {
    controller: estimateRpc.controller,
    validator: estimateRpc.validator,
    specials: {
      getEstimatesFromTender: {
        path: 'parse',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      getStatisticFromEstimates: {
        path: 'parse-statistic',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      setNoSelect: {
        path: 'set-no-select',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
      },
      findRecommendedClassifiers: {
        path: 'find-classifiers',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
      },
    }
  },
  exchange: {
    controller: exchangeRpc.controller,
    specials: {
      exchange1C: {
        method: 'all',
        path: '1C',
        // middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_MANAGER])],
      },
    }
  },
  good: {
    controller: goodRpc.controller,
    validator: goodRpc.validator,
    specials: {
      getList: {
        path: 'get-list',
        middlewares: [isAuth('auth')],
      }
    }
  },
  invite: {
    controller: inviteRpc.controller,
    validator: inviteRpc.validator,
    specials: {
      create: {
        path: 'create',
        middlewares: [isAuth('auth')],
      }
    }
  },
  href: {
    controller: hrefRpc.controller,
    validator: hrefRpc.validator,
    specials: {
      getInfo: {
        path: 'get-info',
        middlewares: [isAuth('auth')],
      }
    }
  },
  lead: {
    controller: leadRpc.controller,
    validator: leadRpc.validator,
    specials: {
      parsePulscen: {
        path: 'parse-pulscen',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      parse: {
        path: 'parse',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      parseSroMembers: {
        path: 'parse-items',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      parseGovMembers: {
        path: 'parse-gov-members',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])]
      },
      extendSroMembersSynapset: {
        path: 'extend-items',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      failedLead: {
        path: 'failed-lead',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
      },
      getRegionFromInn: {
        path: 'region-from-inn',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      parseRusProfile: {
        path: 'parse-rus-profile',
        middlewares: [isAuth('auth'), belongsToGroup(USER_GROUPS.SERVICE_SUPER_ADMIN)]
      }
    }
  },
  parsers: {
    controller: parsersRpc.controller,
    validator: parsersRpc.validator,
    specials: {
      parseGovTenders: {
        path: 'parse-gov-tenders',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      checkFinished: {
        path: 'check-finished',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
      parseHrefs: {
        path: 'parse-hrefs',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
      },
    }
  },
  payment: {
    controller: paymentRpc.controller,
    specials: {
      checkTransitionType: {
        path: 'check-transition-type',
        middlewares: [isAuth('auth')],
      },
      upgradeTariffByMoney: {
        path: 'update-tariff-by-money',
        middlewares: [isAuth('auth')],
      },
      subscribe: {
        path: 'subscribe',
        middlewares: [isAuth('auth')],
      },
      upgradeTariffByBalance: {
        path: 'update-tariff-by-balance',
        middlewares: [isAuth('auth')],
      },
      downgradeTariff: {
        path: 'downgrade-tariff',
        middlewares: [isAuth('auth')],
      },
      changePaymentType: {
        path: 'change-payment-type',
        middlewares: [isAuth('auth')],
      },
      addCard: {
        path: 'add-card',
        middlewares: [isAuth('auth')],
      },
      handleBankNotification: {
        path: 'handle-bank-notification',
      }
    }
  },
  position: {
    controller: positionRpc.controller,
    validator: positionRpc.validator,
    specials: {
      assignGood: {
        path: 'assign',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
      },
      getPositionsFromFile: {
        path: 'parse',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.PROVIDER_MANAGER])],
      },
      getDiffPosition: {
        path: 'diff',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.PROVIDER_MANAGER])],
      },
      getPositionOrHref: {
        path: 'price',
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_MANAGER])],
      }
    }
  },
  subscribesettings: {
    controller: subscribeSettingsRpc.controller,
    specials: {
      createOrUpdate: {
        path: 'create-or-update',
        middlewares: [isAuth('auth')],
      },
    },
  },
  tender: {
    controller: tenderRpc.controller,
    validator: tenderRpc.validator,
    specials: {
      calculateTender: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
        path: 'calculate',
      },
      getFilesFromTender: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
        path: 'parse-files',
      },
      getItems: {
        middlewares: [isAuth('getUserData')],
        path: 'get-items',
      },
      getStatisticFromTender: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
        path: 'parse-statistic',
      },
      parseGovTenders: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
        path: 'parse-gov-tenders',
      },
      recalculate: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SUPER_ADMIN])],
        path: 'recalc',
      },
      setTenderSums: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
        path: 'set-sums',
      },
      updateTenderInfo: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_CONTENT_MANAGER])],
        path: 'update-info',
      },
    },
  },
  ticket: {
    controller: ticketRpc.controller,
    validator: ticketRpc.validator,
    specials: {
      getRandomTickets: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.SERVICE_SALES])],
        path: 'random',
      }
    },
  },
  user: {
    controller: userRpc.controller,
    validator: userRpc.validator,
    specials: {
      auth: {
        path: 'auth',
        middlewares: [bruteforceAuth.prevent],
      },
      me: {
        middlewares: [isAuth('auth')],
        path: 'me',
      },
      recoveryPassword: {
        path: 'recovery-password',
        middlewares: [bruteforceChange.prevent],
      },
      approveRecoveryPassword: {
        path: 'approve-recovery-password',
      },
      changeEmail: {
        middlewares: [isAuth('auth'), bruteforceChange.prevent],
        path: 'change-email',
      },
      approveChangeEmail: {
        path: 'approve-change-email',
      },
      changePassword: {
        middlewares: [isAuth('auth'), bruteforceChange.prevent],
        path: 'change-password',
      },
      approveChangePassword: {
        path: 'approve-change-password',
      },
      openWebSite: {
        path: 'open-website/:hash',
      },
      pressedLandingButton: {
        middlewares: [isAuth('getUserData')],
        path: 'pressed-landing-button',
      }
    },
  },
  workprice: {
    controller: workPriceRpc.controller,
    validator: workPriceRpc.validator,
    specials: {
      create: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_MANAGER])],
        path: 'create',
      },
      updateTypes: {
        middlewares: [isAuth('auth'), belongsToGroup([USER_GROUPS.CLIENT_MANAGER])],
        path: 'update-types',
      },
    },
  },
};

const standartMethods = {
  getItem: {
    method: 'get',
  },
  getList: {
    method: 'get',
    path: 'list',
  },
  create: {
    method: 'post',
  },
  update: {
    method: 'patch',
  },
  remove: {
    method: 'delete',
  }
};

Object.keys(restRouterArray).map((endpoint) => {
  const item = restRouterArray[endpoint];

  Object.keys(standartMethods).forEach((func) => {
    const standart = standartMethods[func];
    const path = standart.path ? `/${endpoint}/${standart.path}/` : `/${endpoint}/`;
    const extraMiddlewares = item.extraMiddlewares || {};

    // TODO получается на каждый метод контроллера обязательно должен быть валидатор?
    // мб стоит проверку именно на метод в валидаторе сделать?
    router[standart.method](
      path,
      ...(item.middlewares || []),
      ...(extraMiddlewares[func] || []),
      // если у функции есть валидатор - апплаим его как миддлвар и добавляем "checkErrors" - он вернет все ошибки
      // куда надо:)
      ...(
        item.validator && item.validator[func]
          ? [
            (req, res, next) => {
              try {
                item.validator[func](req, res, next);
              } catch (error) {
                next(error);
              }
            },
            checkErrors
          ]
          : []
      ),
      async (req, res, next) => {
        try {
          await item.controller[func](req, res, next);
        } catch (error) {
          next(error);
        }
      }
    );
  });
});
Object.keys(rpcRouterArray).map((endpoint) => {
  const item = rpcRouterArray[endpoint];
  const { specials } = item;

  Object.keys(specials).forEach((key) => {
    const path = specials[key].path ? `/rpc/${endpoint}/${specials[key].path}/` : `/rpc/${endpoint}/`;
    const method = specials[key].method || 'post';

    router[method](
      path,
      ...(specials[key].middlewares || []),
      // если у функции есть валидатор - апплаим его как миддлвар и добавляем "checkErrors" - он вернет все ошибки
      // куда надо:)
      ...(
        item.validator && item.validator[key]
          ? [
            (req, res, next) => {
              try {
                item.validator[key](req, res, next);
              } catch (error) {
                next(error);
              }
            },
            checkErrors
          ]
          : []
      ),
      async (req, res, next) => {
        try {
          await item.controller[key](req, res, next);
        } catch (error) {
          next(error);
        }
      }
    );
  });
});

module.exports = router;
