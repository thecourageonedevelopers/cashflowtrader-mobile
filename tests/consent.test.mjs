// Run with: npm test   (node's built-in runner, no extra dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONSENT_WARNING, hasAccepted, buildOrderBody } from "../src/utils/consent.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("only an explicit true counts as consent", () => {
  assert.equal(hasAccepted(true), true);
  for (const v of [false, undefined, null, "true", 1, "yes", {}, []]) assert.equal(hasAccepted(v), false, String(v));
});

test("an order body cannot be built without consent", () => {
  for (const v of [false, undefined, null, "true", 1]) {
    assert.throws(() => buildOrderBody({ termsAccepted: v }), /terms_not_accepted/);
  }
  assert.throws(() => buildOrderBody(), /terms_not_accepted/);
  assert.throws(() => buildOrderBody({ couponCode: "SAVE10" }), /terms_not_accepted/);
});

test("with consent the body carries terms_accepted: \"true\" exactly like the web, plus an optional coupon", () => {
  assert.deepEqual(buildOrderBody({ termsAccepted: true }), { terms_accepted: "true" });
  assert.deepEqual(buildOrderBody({ termsAccepted: true, couponCode: "  SAVE10 " }), { terms_accepted: "true", coupon_code: "SAVE10" });
  for (const c of ["", "   ", undefined, null, 5]) assert.deepEqual(buildOrderBody({ termsAccepted: true, couponCode: c }), { terms_accepted: "true" });
});

test("the warning text is the one the product specifies", () => {
  assert.equal(CONSENT_WARNING, "You must read and accept the Terms & Conditions to move to the next step.");
});

// ── static guards: no purchase path may skip the consent gate ──────────────────────────────────────────
test("both order-creating API calls go through buildOrderBody (so they throw without consent)", () => {
  const api = read("src/api/challenge.js");
  assert.match(api, /createOrder:\s*\(couponCode, termsAccepted\)\s*=>\s*client\.post\("\/payments\/create-order", buildOrderBody\(\{ termsAccepted, couponCode \}\)\)/);
  assert.match(api, /createProgramOrder:\s*\(programId, couponCode, termsAccepted\)\s*=>\s*\n?\s*client\.post\(`\/payments\/program\/\$\{programId\}\/order`, buildOrderBody\(\{ termsAccepted, couponCode \}\)\)/);
  // no other order-creation POST exists in the mobile API layer
  const orderPosts = api.match(/client\.post\([^)]*\/(create-order|order)[`"']/g) || [];
  assert.equal(orderPosts.length, 2);
});

test("every screen that creates an order is unchecked by default, gates on consent, and shows the checkbox", () => {
  for (const file of ["components/challenge/ChallengeLanding.js", "components/challenge/GenericProgramUnlock.js"]) {
    const src = read(file);
    assert.match(src, /useState\(false\)/, `${file}: consent must default to false`);
    assert.match(src, /const \[agreedToTerms, setAgreedToTerms\] = useState\(false\)/, file);
    assert.match(src, /if \(!hasAccepted\(agreedToTerms\)\)/, `${file}: handler must gate on consent`);
    assert.match(src, /<ConsentCheckbox/, file);
    assert.match(src, /agreedToTerms\)\.then/, `${file}: the consent value must be passed to the order call`);
    // the gate must come BEFORE the order is requested
    assert.ok(src.indexOf("hasAccepted(agreedToTerms)") < src.indexOf("createOrder(") || src.indexOf("hasAccepted(agreedToTerms)") < src.indexOf("createProgramOrder("), file);
    assert.doesNotMatch(src, /useState\(true\)[^;]*[Tt]erms/, `${file}: never pre-check the terms`);
  }
});

test("the old 'Watch' call-to-action, lock microcopy and the footer payment trigger are gone from the landing", () => {
  const src = read("components/challenge/ChallengeLanding.js");
  assert.doesNotMatch(src, /Watch The 4-Minute Introduction/);
  assert.doesNotMatch(src, /Unlock Day One After Watching/);
  assert.doesNotMatch(src, /Your transformation starts with one decision/);
  // exactly one control triggers payment, and it is the Join CTA
  assert.equal((src.match(/onPress=\{handleUnlock\}/g) || []).length, 1);
  assert.match(src, /Join 21 Days Challenge/);
  assert.match(src, /Transform Your Trading\. Transform Your Life\./);
});

test("landing copy matches the web page", () => {
  const src = read("components/challenge/ChallengeLanding.js");
  for (const t of [
    "21-Day Trading Transformation", "To Become A ", "Profitable Trader", "Take Action Now – ", "Start Your 21 Days Challenge",
    "21 days to more confidence, clarity, and consistent monthly income from the markets.",
  ]) assert.ok(src.includes(t), t);
  const benefits = [...src.matchAll(/a: "([^"]+)",\s+b: "([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(benefits, ["Clear Strategy", "Consistent Results", "Less Stress More Freedom", "Steady Income"]);
});

test("the Terms screen is reachable from the signed-in app", () => {
  assert.match(read("src/constants/routes.js"), /LEGAL: "Legal"/);
  const stack = read("src/navigation/AppStack.js");
  assert.match(stack, /name=\{APP_ROUTES\.LEGAL\}/);
  assert.match(stack, /component=\{LegalScreen\}/);
});
