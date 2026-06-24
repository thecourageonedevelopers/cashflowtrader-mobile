import client from "./client";

export const supportApi = {
  // data: { name, email, mobile, reason, request_type }
  // request_type: "support_call" | "mentorship" | "account_opening" | "one_on_one"
  submit: (data) => client.post("/support", data),
};
