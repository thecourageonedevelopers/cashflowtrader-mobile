import client from "./client";

export const authApi = {
  login: (email, password) =>
    client.post("/auth/login", { email, password }),

  // Step 1 of registration email verification — mirrors web Register.jsx/api.js sendRegisterOtp.
  // Backend re-checks this was completed before /auth/register will create the account.
  sendRegisterOtp: (email) =>
    client.post("/auth/register/send-otp", { email }),

  // Step 2 — mirrors web verifyRegisterOtp exactly (payload key is "code", matching
  // AuthController#otpFrom on the backend, which reads "code" before falling back to "otp").
  verifyRegisterOtp: (email, code) =>
    client.post("/auth/register/verify-otp", { email, code }),

  register: (name, email, password) =>
    client.post("/auth/register", { name, email, password }),

  // Forgot-password flow — mirrors web PasswordFlowModal.jsx's "forgot" mode exactly. Web calls
  // only these two endpoints for this flow (never /auth/forgot-password/verify, which exists on
  // the backend but is not used by this particular UI path).
  forgotPasswordStart: (email) =>
    client.post("/auth/forgot-password/start", { email }),

  forgotPasswordReset: (email, code, newPassword) =>
    client.post("/auth/forgot-password/reset", {
      email,
      code,
      new_password: newPassword,
    }),

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
