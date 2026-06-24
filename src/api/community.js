import client from "./client";

export const communityApi = {
  // Check if the current user has community access (PRO gate)
  checkAccess: () =>
    client.get("/community/access"),

  settings: () =>
    client.get("/community/settings"),

  posts: (params) =>
    client.get("/community/posts", { params }),

  createPost: (data) =>
    client.post("/community/posts", data),

  updatePost: (id, data) =>
    client.put(`/community/posts/${id}`, data),

  deletePost: (id) =>
    client.delete(`/community/posts/${id}`),
};
