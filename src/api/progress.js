import client from "./client";

export const progressApi = {
  // Returns streak, journals count, challenge completion %, discipline score
  get: () => client.get("/progress"),
};
