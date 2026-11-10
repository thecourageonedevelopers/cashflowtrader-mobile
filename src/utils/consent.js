// Terms & Conditions consent for every payment-collecting screen.
//
// The backend (PaymentService#createOrder) independently rejects order creation with
// 400 "You must accept the Terms & Conditions to continue" unless the body carries terms_accepted — the web
// sends terms_accepted: "true" (ChallengeLanding.jsx / Checkout.jsx). The mobile app used to send neither, so
// without this a purchase from the app is refused by the current backend.
//
// Kept free of React / axios so the guarantees can be unit-tested with `node --test`.

export const CONSENT_WARNING = "You must read and accept the Terms & Conditions to move to the next step.";

/** Only an explicit `true` is consent. Truthy-but-not-true values ("true", 1, {}) must never count. */
export function hasAccepted(accepted) {
  return accepted === true;
}

/**
 * Request body for creating a payment order. Throws if consent has not been given, so no code path can
 * create an order (and a Razorpay checkout) for a buyer who has not accepted the terms.
 * `terms_accepted` is the string "true", exactly what the web sends; the backend accepts a boolean or that string.
 */
export function buildOrderBody({ termsAccepted, couponCode } = {}) {
  if (!hasAccepted(termsAccepted)) throw new Error("terms_not_accepted");
  const body = { terms_accepted: "true" };
  const code = typeof couponCode === "string" ? couponCode.trim() : "";
  if (code) body.coupon_code = code;
  return body;
}
