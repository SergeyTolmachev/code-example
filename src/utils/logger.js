const winston = require('winston');

module.exports = winston.createLogger({
  level: 'error',
  transports: [
    new winston.transports.File({
      filename: 'logs/info.log',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD hh:mm:ss'
        }),
        winston.format.prettyPrint()
      ),
      level: 'info'
    }),
    new winston.transports.File({
      filename: 'logs/errors.log',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD hh:mm:ss'
        }),
        winston.format.prettyPrint()
      ),
      level: 'error'
    })
  ]
});
