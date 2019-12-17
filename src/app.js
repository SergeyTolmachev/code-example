const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const formData = require('./middlewares/parseFiles');

const app = express();
const config = require('./config/config');
const { errorHandler } = require('./middlewares');
const noUrl = require('./middlewares/noUrl');
const router = require('./routes/routes');

if (config.enviroment === 'production') {
  require('./cron/startCron');
}

app.use(helmet());
app.use(helmet.hidePoweredBy());

app.use('/', express.static('public'));
app.use('/files', express.static('files'));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(formData.parse({
  uploadDir: os.tmpdir(),
  autoClean: true,
}));
app.use(formData.format());

app.use('/api', router);

app.all('*', noUrl);
app.use(errorHandler);
app.listen(config.port, () => {
  console.log(`App start on port ${config.port}`);
});
