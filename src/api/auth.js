import client from "./client";

export const authApi = {
  login: (email, password) =>
    client.post("/auth/login", { email, password }),

  register: (name, email, password) =>
    client.post("/auth/register", { name, email, password }),

  googleLogin: (credential) =>
    client.post("/auth/google", { credential }),

  // Mirror web authSlice: POST /session/logout before /auth/logout
  sessionLogout: () =>
    client.post("/session/logout", { reason: "manual" }),

  logout: () =>
    client.post("/auth/logout"),

  me: () =>
    client.get("/auth/me"),
};
