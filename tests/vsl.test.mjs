import test from "node:test";
import assert from "node:assert/strict";
import {
  VSL_VIDEO_URL, muxPlaybackId, buildVslHtml, parseVslMessage, vslErrorMessage,
} from "../src/utils/vsl.js";

test("the VSL URL is the portal's Mux asset and yields its playback id", () => {
  assert.equal(VSL_VIDEO_URL, "https://player.mux.com/AhzwG8Yfi4nNNsd2pWBSU4UzPsfrmHgmaHv6NPYr6gA");
  assert.equal(muxPlaybackId(VSL_VIDEO_URL), "AhzwG8Yfi4nNNsd2pWBSU4UzPsfrmHgmaHv6NPYr6gA");
  assert.equal(muxPlaybackId("https://stream.mux.com/abc123.m3u8"), "abc123");
  assert.equal(muxPlaybackId("https://player.vimeo.com/video/1207635619"), null);
  assert.equal(muxPlaybackId(null), null);
});

test("the player document uses mux-player with the playback id, 10 s seek and RN reporting", () => {
  const id = muxPlaybackId(VSL_VIDEO_URL);
  const html = buildVslHtml(id);
  assert.match(html, new RegExp(`<mux-player[^>]*playback-id="${id}"`));
  assert.match(html, /forward-seek-offset="10"/);
  assert.match(html, /backward-seek-offset="10"/);
  assert.match(html, /ReactNativeWebView\.postMessage/);
  assert.match(html, /@mux\/mux-player@3/);
  assert.match(html, /type:'error',reason:'timeout'/);
});

test("playback ids are validated before being put into markup", () => {
  for (const bad of ['x"><script>alert(1)</script>', "a b", "", null, undefined]) {
    assert.throws(() => buildVslHtml(bad));
  }
});

test("WebView messages are parsed defensively", () => {
  assert.deepEqual(parseVslMessage('{"type":"ready"}'), { type: "ready" });
  assert.deepEqual(parseVslMessage('{"type":"error","reason":"player"}'), { type: "error", reason: "player" });
  assert.equal(parseVslMessage("not json"), null);
  assert.equal(parseVslMessage('{"type":"other"}'), null);
  assert.equal(parseVslMessage(undefined), null);
});

test("each failure reason has a user-facing message", () => {
  for (const r of ["timeout", "script", "player", "whatever"]) {
    assert.ok(vslErrorMessage(r).length > 10);
  }
});
