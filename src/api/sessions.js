import client from "./client";

export const sessionsApi = {
  list: () => client.get("/live-sessions"),
  join: (session_id) => client.post(`/live-sessions/${session_id}/join`),

  // 1-on-1 mentor sessions the client's sales agent has booked for them — read-only, mirrors web
  // Support.jsx's MySessions() exactly. Distinct from the live-sessions list above.
  myMentorSessions: () => client.get("/mentor-sessions/my"),
};
