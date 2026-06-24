import AsyncStorage from "@react-native-async-storage/async-storage";

// Typed wrapper around AsyncStorage with silent error handling.
// All methods return null/false instead of throwing so callers never crash.
export const storage = {
  async get(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  async getObject(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setObject(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  async multiRemove(keys) {
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch {
      return false;
    }
  },
};
