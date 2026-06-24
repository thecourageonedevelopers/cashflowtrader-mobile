import axios from "axios";
import { tokenService } from "../services/tokenService";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn("[API] EXPO_PUBLIC_API_URL is not set. Check your .env file.");
}

const client = axios.create({
  baseURL: `${API_URL}/api`,
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
// On 401: clear stored token so AuthContext re-evaluates on next render.
// Actual navigation to login happens inside AuthContext, not here.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
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
