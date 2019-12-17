const { TICKET_STATUS } = require('../config/constants');

const Lead = require('../schemas/Lead');
const Ticket = require('../schemas/Ticket');

class TicketService {
  async addInitializeTicket(leadId){
    const lead = await Lead.findOne({ where: {id: leadId }});
    if (!lead){
      return null;
    }
    return Ticket.create({
      type: lead.dataValues.type,
      leadId,
      status: TICKET_STATUS.ACTIVE,
      completeToDate: new Date(),
      managerId: lead.dataValues.managerId
    });
  }
}

module.exports = new TicketService();
