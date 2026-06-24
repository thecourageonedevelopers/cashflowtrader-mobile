import client from "./client";

export const sessionsApi = {
  list: () => client.get("/live-sessions"),
  join: (session_id) => client.post(`/live-sessions/${session_id}/join`),
};
