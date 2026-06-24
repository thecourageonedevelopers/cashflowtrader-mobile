import { storage } from "./storage";
import { STORAGE_KEYS } from "../constants/storage";

// All token reads are async — this replaces every localStorage.getItem("cf_token")
// call from the web app. The Axios interceptor awaits these methods.
export const tokenService = {
  get: () => storage.get(STORAGE_KEYS.TOKEN),

  set: (token) => storage.set(STORAGE_KEYS.TOKEN, token),

  remove: () => storage.remove(STORAGE_KEYS.TOKEN),

  async exists() {
    const token = await storage.get(STORAGE_KEYS.TOKEN);
    return token !== null && token !== "";
  },
};
