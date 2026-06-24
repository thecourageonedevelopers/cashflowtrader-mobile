import client from "./client";

export const transformationApi = {
  dashboard: () => client.get("/transformation/dashboard"),
  toggleMission: (task, done) => client.post("/missions/today", { task, done }),
};
