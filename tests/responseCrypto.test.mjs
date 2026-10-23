import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";

// The key is read lazily on first use, so set a throw-away test secret before the first decrypt.
process.env.EXPO_PUBLIC_RESPONSE_ENCRYPTION_KEY = "unit-test-secret-not-a-real-key";
const { decryptResponseData, ResponseDecryptionError } = await import("../src/utils/responseCrypto.js");

// Same envelope the gateway produces: base64(iv[12] + ciphertext + tag[16]), AES-256-GCM, key = SHA-256(secret).
function encrypt(secret, obj) {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return { __enc: Buffer.concat([iv, body, c.getAuthTag()]).toString("base64") };
}

test("a valid envelope is decrypted", async () => {
  const out = await decryptResponseData(encrypt("unit-test-secret-not-a-real-key", { token: "t", user: { id: 1 } }));
  assert.deepEqual(out, { token: "t", user: { id: 1 } });
});

test("plain (non-envelope) payloads pass through untouched", async () => {
  const blob = { ok: true };
  assert.equal(await decryptResponseData(blob), blob);
  assert.equal(await decryptResponseData(null), null);
});

test("an envelope encrypted with a different key throws instead of being returned as data", async () => {
  await assert.rejects(
    decryptResponseData(encrypt("some-other-secret", { token: "t" })),
    (e) => e instanceof ResponseDecryptionError && e.code === "RESPONSE_DECRYPTION_FAILED"
  );
});

test("a corrupted envelope throws", async () => {
  await assert.rejects(decryptResponseData({ __enc: "AAAA" }), ResponseDecryptionError);
});
