import client from "./client";
import { buildOrderBody } from "../utils/consent";

// program_id defaults to the legacy 21-Day Challenge everywhere it's optional, matching web's
// useParams() default (`const { programId = "21-day-challenge" } = useParams()`, Challenge.jsx /
// Checkout.jsx) — every screen that doesn't pass one explicitly is talking about that program.
const DEFAULT_PROGRAM_ID = "21-day-challenge";

export const challengeApi = {
  // ── Program list (drawer links + global maintenance banner) ────────────────
  // res: [{ program_id, name, description, maintenance_enabled, maintenance_reason }]
  listPrograms: () => client.get("/challenge/programs"),

  // res: { program_id, name, description } — public, no auth.
  getProgramPublic: (programId) => client.get(`/challenge/programs-public/${programId}`),

  // ── Main data fetch ───────────────────────────────────────────────────────
  lessons: (programId = DEFAULT_PROGRAM_ID) =>
    client.get("/challenge/lessons", { params: { program_id: programId } }),

  // ── Item completion (generic: text / pdf / ebook / checklist / live_session / external_link) ─
  completeItem: (day, itemId, programId = DEFAULT_PROGRAM_ID) =>
    client.post(`/challenge/item/${day}/${itemId}/complete`, null, { params: { program_id: programId } }),

  // ── Quiz submission (single-answer, graded) ─────────────────────────────────
  submitQuiz: (day, itemId, answers, programId = DEFAULT_PROGRAM_ID) =>
    client.post(`/challenge/item/${day}/${itemId}/quiz`, { answers }, { params: { program_id: programId } }),

  // ── Multi-answer quiz (select-all-that-apply, graded) — req: { answers: [[idx,...], ...] } ────
  submitMultiQuiz: (day, itemId, answers, programId = DEFAULT_PROGRAM_ID) =>
    client.post(`/challenge/item/${day}/${itemId}/multi-quiz`, { answers }, { params: { program_id: programId } }),

  // ── Single choice (ungraded — any pick completes it) — req: { answer: idx } ────────────────────
  submitSingleChoice: (day, itemId, answer, programId = DEFAULT_PROGRAM_ID) =>
    client.post(`/challenge/item/${day}/${itemId}/single-choice`, { answer }, { params: { program_id: programId } }),

  // ── Submission (text + optional file paths) ────────────────────────────────
  submitText: (day, itemId, text, filePaths = [], programId = DEFAULT_PROGRAM_ID) =>
    client.post(`/challenge/item/${day}/${itemId}/submission`, {
      text,
      file_paths: filePaths,
    }, { params: { program_id: programId } }),

  // ── Milestone proof (single file path after upload) ────────────────────────
  submitMilestone: (day, itemId, proofPath, programId = DEFAULT_PROGRAM_ID) =>
    client.post(`/challenge/item/${day}/${itemId}/milestone`, {
      proof_path: proofPath,
    }, { params: { program_id: programId } }),

  // ── Doubt / Q&A ────────────────────────────────────────────────────────────
  askDoubt: (day, question, programId = DEFAULT_PROGRAM_ID) =>
    client.post("/challenge/doubt", { question, day }, { params: { program_id: programId } }),

  // ── Mux signed playback token for a lesson video (mirrors web's ensureMuxPlayerScript flow) ────
  // res: { configured, token }
  getMuxToken: (muxPlaybackId) => client.get(`/challenge/mux-token/${muxPlaybackId}`),

  // ── Payment: legacy Challenge — create/verify Razorpay order ────────────────
  // req (createOrder): { terms_accepted: "true", coupon_code? } — mirrors web payment.createChallengeOrder. The backend
  // refuses an order without terms_accepted, and buildOrderBody throws if consent was not given, so no order is
  // ever requested for a buyer who has not accepted the Terms & Conditions.
  createOrder: (couponCode, termsAccepted) => client.post("/payments/create-order", buildOrderBody({ termsAccepted, couponCode })),

  verifyPayment: (razorpay_order_id, razorpay_payment_id, razorpay_signature) =>
    client.post("/payments/verify", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),

  // res: { amount (paise), currency } — public, no auth.
  getChallengePrice: () => client.get("/payments/challenge-price"),

  // res: { valid, code, discount_type, discount_value, original_amount, discount, final_amount }
  validateCoupon: (code) => client.get("/payments/coupons/validate", { params: { code } }),

  // ── Payment: any other program — create/verify Razorpay order ──────────────
  createProgramOrder: (programId, couponCode, termsAccepted) =>
    client.post(`/payments/program/${programId}/order`, buildOrderBody({ termsAccepted, couponCode })),

  verifyProgramOrder: (programId, razorpay_order_id, razorpay_payment_id, razorpay_signature) =>
    client.post(`/payments/program/${programId}/verify`, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),

  // res: { program_id, amount_paise, currency, configured } — authed.
  getProgramPrice: (programId) => client.get(`/payments/program/${programId}/price`),
};
