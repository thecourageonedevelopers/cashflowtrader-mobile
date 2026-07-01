import client from "./client";

export const formsApi = {
  pending: () => client.get("/forms/pending"),
  respond: (formId, answers) => client.post(`/forms/${formId}/respond`, { answers }),
  dismiss: (formId) => client.post(`/forms/${formId}/dismiss`),
};
