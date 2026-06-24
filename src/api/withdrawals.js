import client from "./client";

export const withdrawalsApi = {
  summary: () =>
    client.get("/withdrawals/summary"),

  list: () =>
    client.get("/withdrawals"),

  create: (formData) =>
    client.post("/withdrawals", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id) =>
    client.delete(`/withdrawals/${id}`),

  setGoal: (amount) =>
    client.put("/withdrawals/goal", { goal_amount: amount }),
};
