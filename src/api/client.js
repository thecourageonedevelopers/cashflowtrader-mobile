import axios from "axios";
import { tokenService } from "../services/tokenService";
import { decryptResponseData } from "../utils/responseCrypto";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn("[API] EXPO_PUBLIC_API_URL is not set. Check your .env file.");
}

// Exported for the rare call site that needs a raw, non-axios request against the same base URL
// (e.g. a file download via expo-file-system) — mirrors web's own API_BASE export from
// src/lib/api.js, used the same way there.
export const API_BASE = `${API_URL}/api`;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Request interceptor ────────────────────────────────────────────────────
// Must be async because AsyncStorage.getItem is async (unlike localStorage).
client.interceptors.request.use(
  async (config) => {
    const token = await tokenService.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────
// Every JSON response leaving the gateway is encrypted (ResponseEncryptionFilter, backend) —
// decrypt first, on both the success and error paths, before any other code (including the 401
// handling right below, which will read fields off the decrypted error body once callers rely on
// it) ever sees `.data`. Same order as web's axios interceptor in src/lib/api.js.
// On 401: clear stored token so AuthContext re-evaluates on next render.
// Actual navigation to login happens inside AuthContext, not here.
client.interceptors.response.use(
  async (response) => {
    response.data = await decryptResponseData(response.data);
    return response;
  },
  async (error) => {
    if (error.response) {
      error.response.data = await decryptResponseData(error.response.data);
    }
    if (error.response?.status === 401) {
      await tokenService.remove();
      // onUnauthorized callback — set by AuthContext after mount
      if (client._onUnauthorized) {
        client._onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

// AuthContext registers this after mount so the interceptor can trigger logout
// without creating a circular import.
client._onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  client._onUnauthorized = fn;
}

export default client;
