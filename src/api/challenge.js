import client from "./client";

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
  // req (createOrder): { coupon_code? } — optional, mirrors web payment.createChallengeOrder
  createOrder: (couponCode) => client.post("/payments/create-order", couponCode ? { coupon_code: couponCode } : undefined),

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
  createProgramOrder: (programId, couponCode) =>
    client.post(`/payments/program/${programId}/order`, couponCode ? { coupon_code: couponCode } : undefined),

  verifyProgramOrder: (programId, razorpay_order_id, razorpay_payment_id, razorpay_signature) =>
    client.post(`/payments/program/${programId}/verify`, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),

  // res: { program_id, amount_paise, currency, configured } — authed.
  getProgramPrice: (programId) => client.get(`/payments/program/${programId}/price`),
};
