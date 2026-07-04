import client from "./client";

export const supportApi = {
  // req: { subject*, description*, category? }
  // subject  = request type label (e.g. "Request Support Call")
  // description = user's reason/details
  // category = request_type key (e.g. "support_call")
  submit: (data) => client.post("/support/tickets", data),

  // res: [{ ticketId, subject, category, priority, status, createdAt }]
  list: () => client.get("/support/tickets"),

  // res: { ticketId, subject, description, category, priority, status, replies[], createdAt }
  getTicket: (ticketId) => client.get(`/support/tickets/${ticketId}`),

  // req: { content* }
  reply: (ticketId, content) => client.post(`/support/tickets/${ticketId}/replies`, { content }),
};
