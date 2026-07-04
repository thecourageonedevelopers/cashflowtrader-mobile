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
