import client from "./client";

export const authApi = {
  login: (email, password) =>
    client.post("/auth/login", { email, password }),

  register: (name, email, password) =>
    client.post("/auth/register", { name, email, password }),

  logout: () =>
    client.post("/auth/logout"),

  me: () =>
    client.get("/auth/me"),

  // OAuth deep-link callback: exchange session_id from URL for a JWT token
  session: (session_id) =>
    client.post("/auth/session", { session_id }),
};
