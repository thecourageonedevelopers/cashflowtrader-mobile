import client from "./client";

export const challengeApi = {
  // ── Main data fetch ───────────────────────────────────────────────────────
  lessons: () => client.get("/challenge/lessons"),

  // ── Item completion (generic: text / pdf / ebook / checklist / live_session / external_link) ─
  completeItem: (day, itemId) =>
    client.post(`/challenge/item/${day}/${itemId}/complete`),

  // ── Quiz submission ────────────────────────────────────────────────────────
  submitQuiz: (day, itemId, answers) =>
    client.post(`/challenge/item/${day}/${itemId}/quiz`, { answers }),

  // ── Submission (text + optional file paths) ────────────────────────────────
  submitText: (day, itemId, text, filePaths = []) =>
    client.post(`/challenge/item/${day}/${itemId}/submission`, {
      text,
      file_paths: filePaths,
    }),

  // ── Milestone proof (single file path after upload) ────────────────────────
  submitMilestone: (day, itemId, proofPath) =>
    client.post(`/challenge/item/${day}/${itemId}/milestone`, {
      proof_path: proofPath,
    }),

  // ── Doubt / Q&A ────────────────────────────────────────────────────────────
  askDoubt: (day, question) =>
    client.post("/challenge/doubt", { question, day }),

  // ── Payment: create Razorpay order ─────────────────────────────────────────
  createOrder: () => client.post("/payments/create-order"),

  // ── Payment: verify Razorpay signature ─────────────────────────────────────
  verifyPayment: (razorpay_order_id, razorpay_payment_id, razorpay_signature) =>
    client.post("/payments/verify", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
};
