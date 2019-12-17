module.exports.PAGE_SIZE = 10;

module.exports.UNIT_DICTIONARY = {
  MCH: ['маш-ч', 'маш.-ч', 'маш.-ч.', 'маш.час'],
};

const USER_GROUPS = {
  // Все права CLIENT начинаются с 1
  CLIENT_ADMIN: 11,
  CLIENT_MANAGER: 12,
  // Все права PROVIDER начинаются с 2
  PROVIDER_ADMIN: 21,
  PROVIDER_MANAGER: 22,
  // Все права SERVICE начинаются с 3
  SERVICE_SUPER_ADMIN: 31,
  SERVICE_ADMIN: 32,
  SERVICE_CONTENT_MANAGER: 33,
  SERVICE_SALES: 34,
  SERVICE_SUPPORT: 35
};

module.exports.USER_GROUPS = USER_GROUPS;

module.exports.USER_INCLUSIONS = {
  [USER_GROUPS.CLIENT_ADMIN]: [
    USER_GROUPS.CLIENT_MANAGER
  ],
  [USER_GROUPS.PROVIDER_ADMIN]: [
    USER_GROUPS.PROVIDER_MANAGER
  ],
  [USER_GROUPS.SERVICE_SUPER_ADMIN]: [
    USER_GROUPS.SERVICE_ADMIN,
    USER_GROUPS.SERVICE_SALES,
    USER_GROUPS.SERVICE_CONTENT_MANAGER,
    USER_GROUPS.CLIENT_ADMIN,
    USER_GROUPS.CLIENT_MANAGER,
    USER_GROUPS.PROVIDER_ADMIN,
    USER_GROUPS.PROVIDER_MANAGER
  ],
  [USER_GROUPS.SERVICE_ADMIN]: [
    USER_GROUPS.SERVICE_SALES,
    USER_GROUPS.SERVICE_CONTENT_MANAGER,
    USER_GROUPS.CLIENT_ADMIN,
    USER_GROUPS.CLIENT_MANAGER,
  ],
  [USER_GROUPS.SERVICE_CONTENT_MANAGER]: [
    USER_GROUPS.CLIENT_MANAGER,
  ],
};

module.exports.TICKET_PERIOD = 2; // измеряется в днях

module.exports.LEAD_TYPES = {
  CLIENT: 1,
  PROVIDER: 2,
};

module.exports.LEAD_ORIGINS = {
  SRO: 1,
  GOV: 2,
  PULSCEN: 3
};

module.exports.LEAD_STATUS = {
  ACTIVE: 1,
  SUCCESS: 2,
  FAILED: 3,
  // временно не интересен как лид
  SLEEP: 4,
  FAVORITE: 5
};

module.exports.LEAD_ACTIONS = {
  CHECK_INFORMATION: 1,
  EMAIL: 2,
  CALL: 3,
  OTHER: 99,
};

module.exports.TICKET_STATUS = {
  ACTIVE: 1,
  FINISHED: 2,
};

module.exports.HASH_TYPES = {
  CONFIRM_EMAIL: 1,
  CHANGE_EMAIL: 2,
  CHANGE_PASSWORD: 3,
};

module.exports.LAW_NUMBERS = {
  44: 44,
  223: 223,
  615: 615,
};

module.exports.COMPANIES_TYPES = {
  localhost: 0,
  BUILDER: 1,
  PROVIDER: 2,
};


module.exports.EMAIL_TEMPLATES = {
  main: 'd2862672-5631-11e9-888b-0a580a0b60e4',
  REGISTRATION_EMAIL_CONFIRM: '124a0562-6609-11e9-9487-0a580a0b4a39',
  PASSWORD_RECOVERY: '322fc146-661d-11e9-9710-0a580a0b5a4b',
  CHANGE_EMAIL_CONFIRM: '9dfb784e-6621-11e9-9080-0a580a0b4654',
  CHANGE_PASSWORD_CONFIRM: 'f8fff820-6624-11e9-81d3-0a580a0b5ac4',
  REGISTRATION_INVITE: '92d08016-943b-11e9-a797-0a580a0b4485',
  NEW_TENDERS_SUBSCRIPTION: '92d08016-943b-11e9-a797-0a580a0b4485',
  WELCOME_EMAIL: 'b0cefb48-fb6e-11e9-8f66-0a580a0b4dd8',
};

module.exports.ERRORS_FGIS = {
  category: {
    code: 1,
    text: 'ФГИС ИД является категорией, а не классификатором',
  },
  no_fgis_id: {
    code: 2,
    text: 'Отсутствует ФГИС ИД у материала',
  },
  no_fgis_in_system: {
    code: 3,
    text: 'Данный ФГИС ИД отсутствует в системе',
  },
  no_gesn_in_system: {
    code: 4,
    text: 'Данный номер ГЭСН отсутствует в системе',
  },
  no_price_value_no_select: {
    code: 5,
    text: 'Отсутствует стоимость для материала с noSelect',
  },
};

module.exports.COEFF_TYPES = {
  sum: {
    code: 1,
    description: 'Суммы в итогах сметы',
  },
  coeff: {
    code: 2,
    description: 'Коэффициент в итогах сметы',
  },
};

module.exports.CALCULATION_TYPES = {
  max: {
    code: 1,
    description: 'Максимальная калькуляция по тендеру. Наша',
  },
  min: {
    code: 2,
    description: 'Минимальная калькуляция по тендеру. Наша',
  },
  client: {
    code: 3,
    description: 'Калькуляция клиента по тендеру',
  }
};

module.exports.CLIENT_CONFLICT_ERRORS = {
  unit: {
    code: 1,
    description: 'Единица измерения не соответствует нормативной',
  },
  gesn: {
    code: 2,
    description: 'ГЭСН отсутствует в нашей системе',
  },
  difference: {
    code: 3,
    description: 'Состав расценки не соответствует нормативной',
  },
  amount: {
    code: 4,
    description: 'Объем не соответствует нормативному',
  },
  title: {
    code: 5,
    description: 'Заголовок не соответствует нормативному',
  },
  lowPrice: {
    code: 6,
    description: 'Стоимость материала существенно ниже среднерыночной',
  },
  highPrice: {
    code: 7,
    description: 'Стоимость материала существенно выше среднерыночной',
  },
  nullUnit: {
    code: 8,
    description: 'Стоимость материала не учтена в расценке и не учтена в позиции',
  }
};

module.exports.TARIFF_PLANS = {
  free: {
    code: 0,
    monthlyFee: 0,
    annualFee: 0,
    description: 'Бесплатный план, демо версия',
  },
  basic: {
    code: 1,
    monthlyFee: 3000,
    annualFee: 28800,
    description: 'Базовый тарифный план',
  },
  extended: {
    code: 2,
    monthlyFee: 5000,
    annualFee: 48000,
    description: 'Расширенный тарифный план',
  },
};

module.exports.PAYMENT_TYPES = {
  none: {
    code: 0,
    days: 0,
    description: 'Отсутствует следующий платеж, блокировка',
  },
  monthly: {
    code: 1,
    days: 30,
    description: 'Месячный платеж',
  },
  yearly: {
    code: 2,
    days: 365,
    description: 'Годовой платеж',
  },
};

module.exports.CATEGORIES_FIELDS = [
  'civilworks',
  'excavation',
  'metal',
  'wooden',
  'concrete',
  'block',
  'finishing',
  'installation',
  'plumbing',
  'ventilation',
  'electric',
  'lowcurrent',
  'rru',
  'repair',
  'reconstruction',
  'uninstallation',
  'rrl',
  'road',
  'roadrepair',
  'landscaping',
  'other',
];

module.exports.WORK_PRICE_UNPRICED = 'WORK_PRICE_UNPRICED';

module.exports.FER_COEFF = {
  smr: 8.14,
  mat: 4.32,
};

module.exports.CARGO_CLASS = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

module.exports.TENDER_TYPES = {
  ok504: {
    code: 'ok504',
    title: 'Открытый конкурс в электронной форме'
  },
  zk504: {
    code: 'zk504',
    title: 'Запрос котировок в электронной форме',
  },
  zp504: {
    code: 'zp504',
    title: 'Запрос предложений в электронной форме',
  },
  oku504: {
    code: 'oku504',
    title: 'Конкурс с ограниченным участием в электронной форме',
  },
  okd504: {
    code: 'okd504',
    title: 'Двухэтапный конкурс в электронной форме',
  },
  ksmisp: {
    code: 'ksmisp',
    title: 'Конкурс в электронной форме, участниками которого могут являться только субъекты малого и среднего предпринимательства',
  },
  asmisp: {
    code: 'asmisp',
    title: 'Аукцион в электронной форме, участниками которого могут являться только субъекты малого и среднего предпринимательства',
  },
  zksmisp: {
    code: 'zksmisp',
    title: 'Запрос котировок в электронной форме, участниками которого могут являться только субъекты малого и среднего предпринимательства',
  },
  zpsmisp: {
    code: 'zpsmisp',
    title: 'Запрос предложений в электронной форме, участниками которого могут являться только субъекты малого и среднего предпринимательства',
  },
  zkb44: {
    code: 'zkb44',
    title: 'Запрос котировок без размещения извещения',
  },
  okd44: {
    code: 'okd44',
    title: 'Двухэтапный конкурс',
  },
  inm111: {
    code: 'inm111',
    title: 'Способ определения поставщика (подрядчика, исполнителя), установленный Правительством Российской Федерации в соответствии со ст. 111 Федерального закона № 44-ФЗ',
  },
  ok44: {
    code: 'ok44',
    title: 'Открытый конкурс',
  },
  zp44: {
    code: 'zp44',
    title: 'Запрос предложений',
  },
  zk223: {
    code: 'zk223',
    title: 'Запрос котировок'
  },
  oku44: {
    code: 'oku44',
    title: 'Конкурс с ограниченным участием',
  },
  zep223: {
    code: 'zep223',
    title: 'Закупка у единственного поставщика (подрядчика, исполнителя)',
  },
  zkk44: {
    code: 'zkk44',
    title: 'Закрытый конкурс',
  },
  ok223: {
    code: 'ok223',
    title: 'Открытый аукцион',
  },
  zkku44: {
    code: 'zkku44',
    title: 'Закрытый конкурс с ограниченным участием',
  },
  ea44: {
    code: 'ea44',
    title: 'Электронный аукцион',
  },
  po44: {
    code: 'po44',
    title: 'Предварительный отбор',
  },
  zkkd44: {
    code: 'zkkd44',
    title: 'Закрытый двухэтапный конкурс',
  },
  za44: {
    code: 'za44',
    title: 'Закрытый аукцион',
  },
  fz223: {
    code: 'fz223',
    title: 'Запупка по 223 ФЗ',
  },
  ea615: {
    code: 'ea615',
    title: 'Запупка по 615 ФЗ Капитальный ремонт многоквартирных домов',
  },
  another: {
    code: 'another',
    title: 'Прочее',
  },
};

module.exports.TENDER_STATUSES = {
  ACTIVE: {
    code: 1,
    title: 'Подача заявок',
  },
  COMMISSION: {
    code: 2,
    title: 'Работа комиссии',
  },
  FINISHED: {
    code: 3,
    title: 'Закупка завершена',
  },
  CANCELED: {
    code: 4,
    title: 'Закупка отменена',
  },
};

module.exports.USER_AUTH_STATUSES = {
  SUCCESS: {
    code: 0,
    message: 'Корректно',
  },
  ANOTHER_AUTH: {
    code: 1,
    message: 'Под данным аккаунтом были авторизованы на другом устройстве',
  },
  NO_TOKEN: {
    code: 2,
    message: 'Отсутствует токен авторизации',
  },
  INCORRECT_TOKEN: {
    code: 3,
    message: 'Некорректный токен авторизации',
  },
};

module.exports.EVENT_TYPES = {
  WELCOME_EMAIL: {
    code: 0,
    title: 'Отправлено Welcome Email',
  },
  OPENED_WELCOME_EMAIL: {
    code: 1,
    title: 'Открыто для прочтения Welcome Email',
  },
  OPENED_WEBSITE: {
    code: 2,
    title: 'Открыт сайт по ссылке из Welcome Email',
  },
  PRESSED_LANDING_BUTTON: {
    code: 3,
    title: 'Выполнен переход с лендинга',
  },
};
