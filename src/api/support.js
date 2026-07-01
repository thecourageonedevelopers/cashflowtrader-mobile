import client from "./client";

export const supportApi = {
  // data: { name, email, mobile, reason, request_type }
  // request_type: "support_call" | "mentorship" | "account_opening" | "one_on_one"
  submit: (data) => client.post("/support", data),

  // Returns { requests: [...] } — each request has embedded .replies[]
  list: () => client.get("/support/my"),

  // Sends a user reply to an existing request thread
  reply: (requestId, message) => client.post(`/support/${requestId}/reply`, { message }),
};
