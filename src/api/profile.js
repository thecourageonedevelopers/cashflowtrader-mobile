import client from "./client";

export const profileApi = {
  // The web never calls GET /profile. Profile data comes from GET /auth/me
  // (populated into AuthContext, then read directly in Profile.jsx).
  // Unwrap the nested `user` key so ProfileScreen receives a flat object.
  get: () =>
    client.get("/auth/me").then((r) => ({
      ...r,
      data: r.data.user ?? r.data,
    })),

  update: (data) => client.put("/profile", data),

  changePassword: (currentPassword, newPassword) =>
    client.put("/profile/password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  // OTP-secured "create password" flow for social-only accounts (has_password === false) —
  // mirrors web PasswordFlowModal.jsx mode="create" exactly. No current password needed since
  // none exists yet; web auto-fires the start call on mount (needs:"none"), req body is empty.
  createPasswordStart: () => client.post("/profile/password/create/start", {}),

  createPasswordVerify: (code, newPassword) =>
    client.post("/profile/password/create/verify", {
      code,
      new_password: newPassword,
    }),

  // OTP-gated change flow for protected identity fields — mirrors web ChangeContactModal.jsx
  // exactly. Mobile change: email OTP -> new-phone OTP. Email change: mobile OTP -> new-email OTP.
  // Both steps of both flows are actually emailed (no SMS provider configured) per web's own
  // documented comment — copy on the mobile screen mirrors that same caveat.
  changeMobileStart: (newValue) => client.post("/profile/change-mobile/start", { new_value: newValue }),
  changeMobileVerifyEmail: (code) => client.post("/profile/change-mobile/verify-email", { code }),
  changeMobileVerifyPhone: (code) => client.post("/profile/change-mobile/verify-phone", { code }),

  changeEmailStart: (newValue) => client.post("/profile/change-email/start", { new_value: newValue }),
  changeEmailVerifyMobile: (code) => client.post("/profile/change-email/verify-mobile", { code }),
  changeEmailVerifyEmail: (code) => client.post("/profile/change-email/verify-email", { code }),

  getGoalProgress: () => client.get("/profile/goal-progress"),

  archetypes: () => client.get("/transformation/archetypes"),

  // data = FormData with { uri, type, name } from expo-image-picker
  uploadAvatar: (formData) =>
    client.post("/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Mirrors web POST /profile/avatar-preset — set one of the preset CDN avatars
  setAvatarPreset: (picture_url) =>
    client.post("/profile/avatar-preset", { picture_url }),

  deleteAvatar: () => client.delete("/profile/avatar"),

  // Mirrors web: POST /profile/tour-complete → returns updated user
  tourComplete: () => client.post("/profile/tour-complete"),
};
