import { useState, useEffect } from "react";
import { tokenService } from "../services/tokenService";

// Mirrors web src/lib/avatar.js:
// Resolves user.picture to a displayable URL.
// Google OAuth pictures are already https:// → used directly.
// Uploaded pictures are object-storage paths → served via /api/files/<path>?auth=<token>.
export function useAvatarUrl(picture) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!picture) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//.test(picture)) {
      setUrl(picture);
      return;
    }
    const base = process.env.EXPO_PUBLIC_API_URL || "";
    tokenService.get().then((token) => {
      setUrl(`${base}/api/files/${picture}${token ? `?auth=${token}` : ""}`);
    });
  }, [picture]);

  return url;
}
