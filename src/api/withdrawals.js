import client from "./client";

export const withdrawalsApi = {
  // GET /withdrawals/levels — level-based progression (replaces /withdrawals/summary)
  // Returns: { verified_total, pending_total, pending_count, levels[], progress_to_next,
  //            remaining_to_next, current_level, all_complete, mentor_eligible }
  levels: () =>
    client.get("/withdrawals/levels"),

  list: () =>
    client.get("/withdrawals"),

  create: (formData) =>
    client.post("/withdrawals", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id) =>
    client.delete(`/withdrawals/${id}`),
};
