import client from "./client";

export const uploadApi = {
  // formData must contain file objects built from expo-image-picker result:
  //   { uri, type: "image/jpeg", name: "photo.jpg" }
  upload: (formData) =>
    client.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
