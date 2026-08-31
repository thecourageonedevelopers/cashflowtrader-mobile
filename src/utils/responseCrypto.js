// Mirrors web's src/lib/api.js decryptResponseData/decryptEnvelope, and must stay in lockstep
// with the backend's ResponseEncryptionFilter (cashflowtrader-api-gateway). The gateway encrypts
// every JSON response as {"__enc": "<base64(iv[12] + ciphertext+tag)>"} using AES-256-GCM with a
// key derived by SHA-256'ing a shared secret string — this file reverses exactly that, so the two
// sides only need to agree on the secret string, not on any base64/key-length formatting.
//
// Deliberately does not rely on TextEncoder/TextDecoder/atob being globally available in the RN/
// Hermes runtime (unlike a browser, none of those are guaranteed here) — base64 and UTF-8 codecs
// are implemented from scratch below instead of assumed. AES-GCM/SHA-256 themselves still come
// from audited pure-JS libraries (@noble/ciphers, @noble/hashes) rather than being hand-rolled.
import { gcm } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(base64) {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const byteLength = Math.floor((clean.length * 6) / 8);
  const bytes = new Uint8Array(byteLength);
  let bitBuffer = 0;
  let bitCount = 0;
  let byteIndex = 0;
  for (let i = 0; i < clean.length; i++) {
    const value = BASE64_ALPHABET.indexOf(clean[i]);
    if (value === -1) continue;
    bitBuffer = (bitBuffer << 6) | value;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[byteIndex++] = (bitBuffer >> bitCount) & 0xff;
    }
  }
  return bytes;
}

function utf8StringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i);
    if (code > 0xffff) i++; // consume the low surrogate of the pair codePointAt already read
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

function utf8BytesToString(bytes) {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if ((byte1 & 0xe0) === 0xc0) {
      const byte2 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      result += String.fromCharCode(
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
      );
    } else if ((byte1 & 0xf8) === 0xf0) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      const byte4 = bytes[i++];
      let codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f);
      codePoint -= 0x10000;
      result += String.fromCharCode(
        0xd800 + (codePoint >> 10),
        0xdc00 + (codePoint & 0x3ff)
      );
    } else {
      i++; // skip an invalid leading byte rather than corrupt the rest of the decode
    }
  }
  return result;
}

let _keyBytes = null;
function getKey() {
  if (_keyBytes) return _keyBytes;
  const secret = process.env.EXPO_PUBLIC_RESPONSE_ENCRYPTION_KEY || "";
  _keyBytes = sha256(utf8StringToBytes(secret));
  return _keyBytes;
}

// base64 -> { iv[12], ciphertext+tag } -> AES-256-GCM decrypt -> UTF-8 decode -> JSON.parse.
// Same envelope layout as web's decryptEnvelope (src/lib/api.js) and the backend's
// ResponseEncryptionFilter#encryptToEnvelope: iv is the first 12 bytes, the rest is
// ciphertext with the 16-byte GCM tag appended (WebCrypto/JCA convention — @noble/ciphers'
// gcm() expects the same layout, confirmed against its source).
export async function decryptEnvelope(base64) {
  const combined = base64ToBytes(base64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = getKey();
  const plainBytes = gcm(key, iv).decrypt(ciphertext);
  return JSON.parse(utf8BytesToString(plainBytes));
}

// Transparently swaps the encrypted envelope back for the real JSON object. Anything that isn't
// the {"__enc": "..."} shape passes through unchanged, mirroring web's decryptResponseData.
export async function decryptResponseData(data) {
  if (data && typeof data === "object" && typeof data.__enc === "string") {
    try {
      return await decryptEnvelope(data.__enc);
    } catch (e) {
      console.error("Response decryption failed:", e?.message || e);
      return data;
    }
  }
  return data;
}
