import client from "./client";

export const formsApi = {
  pending: () => client.get("/forms/pending"),
  respond: (formId, answers) => client.post(`/forms/${formId}/respond`, { answers }),
  dismiss: (formId) => client.post(`/forms/${formId}/dismiss`),
  // Fetches a specific Forms-module form by id — used by the challenge day modal's "form" item
  // type (Challenge.jsx's FormItem), distinct from the push-form queue above.
  get: (formId) => client.get(`/forms/${formId}`),
};
