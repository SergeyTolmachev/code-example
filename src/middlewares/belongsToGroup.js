const { USER_INCLUSIONS } = require('../config/constants');

module.exports = group => async (req, res, next) => {
  const groups = typeof group === 'object' ? group : [group];

  // если наша группа есть среди требуемых - сразу пускаем дальше
  if (groups.indexOf(req.user.group) !== -1) {
    return next();
  }

  // если дальше не пустили и дочерних групп у пользователя нет(допустим, если ты менеджер) - шлем нафек
  if (!USER_INCLUSIONS[req.user.group]) {
    return res.status(403).json({ _error: 'Недостаточно прав' });
  }

  // если дочерние есть, смотрим - есть ли среди них что-то из требуемых групп
  if (!USER_INCLUSIONS[req.user.group].find(childGroup => groups.indexOf(childGroup) !== -1)) {
    return res.status(403).json({ _error: 'Недостаточно прав' });
  }

  return next();
};
