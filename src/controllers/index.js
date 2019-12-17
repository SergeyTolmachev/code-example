const builder = require('./builderController');
const calculation = require('./calculationController');
const callrequest = require('./callRequestController');
const card = require('./cardController');
const cargo = require('./cargoController');
const city = require('./cityController');
const classifier = require('./classifierController');
const cron = require('./cronController');
const estimate = require('./estimateController');
const event = require('./eventController');
const good = require('./goodController');
const href = require('./hrefController');
const invite = require('./inviteController');
const leadcomment = require('./leadCommentController');
const lead = require('./leadController');
const leadphone = require('./leadPhoneController');
const materialfixedprice = require('./materialFixedPriceController');
const machinesfixedprice = require('./machinesFixedPriceController');
const payment = require('./paymentController');
const position = require('./positionController');
const provider = require('./providerController');
const region = require('./regionController');
const unit = require('./unitController');
const sro = require('./sroController');
const subscribesettings = require('./subscribeSettingsController');
const techTicket = require('./techTicketController');
const techTicketAnswer = require('./techTicketAnswerController');
const tender = require('./tenderController');
const ticket = require('./ticketController');
const user = require('./userController');
const workPrice = require('./workPriceController');


// TODO мб это импортить сразу в роутах?  это также по ключам один фиг достается
module.exports = {
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
  unit,
  sro,
  subscribesettings,
  user,
  techTicket,
  techTicketAnswer,
  tender,
  ticket,
  workPrice,
};
