const calculationRpc = require('./calculationRpcController');
const companyRpc = require('./companyRpcController');
const emailRpc = require('./emailRpcController');
const estimateRpc = require('./estimateRpcController');
const exchangeRpc = require('./exchangeRpcController');
const goodRpc = require('./goodRpcController');
const hrefRpc = require('./hrefRpcController');
const inviteRpc = require('./inviteRpcController');
const leadRpc = require('./leadRpcController');
const paymentRpc = require('./paymentRpcController');
const parsersRpc = require('./parsersRpcController');
const positionRpc = require('./positionRpcController');
const subscribeSettingsRpc = require('./subscribeSettingsRpcController');
const tenderRpc = require('./tenderRpcController');
const ticketRpc = require('./ticketRpcController');
const userRpc = require('./userRpcController');
const workPriceRpc = require('./workPriceRpcController');

module.exports = {
  calculationRpc,
  companyRpc,
  estimateRpc,
  exchangeRpc,
  emailRpc,
  goodRpc,
  hrefRpc,
  inviteRpc,
  leadRpc,
  paymentRpc,
  parsersRpc,
  positionRpc,
  subscribeSettingsRpc,
  tenderRpc,
  ticketRpc,
  userRpc,
  workPriceRpc
};
