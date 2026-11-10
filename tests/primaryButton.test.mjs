// Run with: npm test   (node's built-in runner, no extra dependencies)
// Guards the auth call-to-action: the label must never disappear, and every state must stay readable.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const src = read("components/auth/PrimaryButton.js");

// WCAG relative-luminance contrast
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, alpha, bg) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha))); // fg at `alpha` over bg

test("enabled: black label on the neon button is far above the 4.5:1 minimum", () => {
  assert.match(src, /backgroundColor: PRIMARY/);
  assert.match(src, /label: \{[^}]*color: "#000"/s);
  assert.ok(contrast(hex("#000000"), hex("#39FF14")) > 12);
});

test("disabled: the muted label stays readable on the muted background", () => {
  assert.match(src, /backgroundColor: "#1d2a1a"/);
  assert.match(src, /labelMuted: \{ color: "rgba\(255,255,255,0\.5\)" \}/);
  const bg = hex("#1d2a1a");
  const label = over([255, 255, 255], 0.5, bg);
  assert.ok(contrast(label, bg) >= 4.5, "muted label contrast " + contrast(label, bg).toFixed(1));
});

test("disabled is visibly different from enabled (not just an opacity change)", () => {
  assert.match(src, /btnMuted: \{/);
  assert.doesNotMatch(src, /btnDisabled/);
});

test("the label is rendered in EVERY state: loading shows a spinner BESIDE it, never instead of it", () => {
  // exactly one <Text> label, outside any loading ternary
  assert.equal((src.match(/<Text\b/g) || []).length, 1);
  assert.doesNotMatch(src, /loading \? \(\s*<ActivityIndicator/);
  assert.match(src, /\{loading && <ActivityIndicator/);
  assert.match(src, /const text = loading && loadingLabel \? loadingLabel : children;/);
});

test("the label uses ExtraBold (800), the next weight above the previous Bold (700); size and line height unchanged", () => {
  assert.match(src, /fontFamily: DISPLAY\.extraBold,\s+fontSize: 16,\s+lineHeight: 20,/);
  assert.doesNotMatch(src, /fontFamily: DISPLAY\.bold/);
  assert.doesNotMatch(src, /fontWeight/); // custom fonts must not also ask for a synthetic weight
});

test("the label cannot wrap, clip, or float off-centre", () => {
  for (const re of [/numberOfLines=\{1\}/, /adjustsFontSizeToFit/, /minimumFontScale=\{0\.8\}/, /maxFontSizeMultiplier=\{1\.2\}/,
    /includeFontPadding: false/, /textAlignVertical: "center"/, /textAlign: "center"/, /minHeight: 48/, /fontSize: 16/, /lineHeight: 20/]) {
    assert.match(src, re, String(re));
  }
});

test("a busy button announces itself to screen readers and cannot be pressed while loading or disabled", () => {
  assert.match(src, /accessibilityState=\{\{ disabled: inactive, busy: loading \}\}/);
  assert.match(src, /disabled=\{inactive\}/);
  assert.match(src, /const inactive = loading \|\| disabled;/);
});

test("the auth screens still pass the same handlers and loading flags (logic untouched)", () => {
  const signIn = read("screens/auth/SignInScreen.js");
  assert.match(signIn, /<PrimaryButton onPress=\{handleSignIn\} loading=\{loading\} disabled=\{loading\} loadingLabel="Signing in…">/);
  const signUp = read("screens/auth/SignUpScreen.js");
  assert.match(signUp, /onPress=\{handleSignUp\}\s+loading=\{loading\}\s+disabled=\{loading\}\s+loadingLabel="Creating account…"/);
});
