const BaseController = require('./baseController');
const CallRequest = require('../schemas/CallRequest');

class CallRequestController extends BaseController {}

module.exports.controller = new CallRequestController(CallRequest, {
  searchField: ['title'],
});
