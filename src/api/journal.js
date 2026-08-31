import client from "./client";

export const journalApi = {
  list: (params) =>
    client.get("/journal", { params }),

  create: (data) =>
    client.post("/journal", data),

  delete: (id) =>
    client.delete(`/journal/${id}`),

  taxonomy: () =>
    client.get("/journal/taxonomy"),

  analyticsDashboard: () =>
    client.get("/journal/analytics/dashboard"),

  // GET /journal/ai/coach-report?period_days=X — fetch cached report
  aiCoachReport: (periodDays) =>
    client.get("/journal/ai/coach-report", { params: { period_days: periodDays } }),

  // POST /journal/ai/coach-report { period_days } — generate fresh report
  generateAiCoachReport: (periodDays) =>
    client.post("/journal/ai/coach-report", { period_days: periodDays }),

  // POST /journal/{id}/chart-review with FormData (before/after image files)
  chartReview: (id, formData) =>
    client.post(`/journal/${id}/chart-review`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // POST /journal/{id}/review-feedback — the trader's own note on their AI chart review
  reviewFeedback: (id, feedback) =>
    client.post(`/journal/${id}/review-feedback`, { feedback }),

  pending: () =>
    client.get("/journal/pending"),

  // POST /journal/quick-capture (multipart) — Live Trading's capture-and-log flow.
  // FormData fields: phase ("before"|"after"), market, direction, setup, note, chart_symbol,
  // image (required), audio (optional). Returns { phase, entry, transcript, paired? }.
  quickCapture: (formData) =>
    client.post("/journal/quick-capture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // POST /journal/auto-extract (multipart: file) — AI screenshot → trade array
  autoExtract: (formData) =>
    client.post("/journal/auto-extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // POST /journal/auto-import { screenshot_path, trades[] } → { created }
  autoImport: (payload) =>
    client.post("/journal/auto-import", payload),

  // POST /journal/chart-review (standalone, NOT trade-specific)
  // FormData: before (image), after (image), context (string)
  // Returns: { verdict, before_match, after_match, before_issue, after_issue, summary, mistakes[], strengths[] }
  standaloneChartReview: (formData) =>
    client.post("/journal/chart-review", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // ── One-Click Analysis (ai-service, mounted under /api/journal/*) ──────────

  // GET /market/search?q= — symbol lookup. Only requires login (not challenge-unlocked) on the
  // backend, but this screen itself is only reachable post-unlock anyway.
  marketSearch: (q) =>
    client.get("/market/search", { params: { q } }),

  // POST /journal/oneclick-analyze { symbol, goal, analysis_type, language } -> { job_id, status }
  oneclickAnalyze: (symbol, goal, analysisType, language) =>
    client.post("/journal/oneclick-analyze", {
      symbol,
      goal,
      analysis_type: analysisType,
      language,
    }),

  // GET /journal/oneclick-analyze/{jobId} -> { job_id, status, analysis?, error_message? }
  oneclickJob: (jobId) =>
    client.get(`/journal/oneclick-analyze/${jobId}`),

  // GET /journal/analyses -> [{ analysis_id, style, symbol, language, credits_used, created_at }]
  analyses: () =>
    client.get("/journal/analyses"),

  // GET /journal/analyses/{id} -> { analysis_id, style, symbol, language, context_text, analysis, credits_used, created_at }
  analysis: (id) =>
    client.get(`/journal/analyses/${id}`),

  // GET /journal/trade-plan -> latest INTRADAY analysis, or { empty: true }.
  // { empty:false, analysis_id, instrument, language, analysis, created_at }
  tradePlan: () =>
    client.get("/journal/trade-plan"),

  // DELETE /journal/analyses/{id} — distinct from `delete()` above, which deletes a plain journal
  // entry (/journal/{id}), not a chart analysis (/journal/analyses/{id}).
  deleteAnalysis: (id) =>
    client.delete(`/journal/analyses/${id}`),

  // ── Chart Analysis (analyze-setup / analyze-intraday) ──────────────────────

  // GET /journal/analyze/quota -> { remaining, used, free_total }
  // Verified directly from CreditService.quota() — it does NOT include a `packs` field, despite
  // web's ChartAnalyzePanel.jsx assuming it does (setPacks(data.packs || [])) — a real,
  // independently-confirmed contract mismatch on web's side (see implementation report). Credit
  // packs are fetched separately via creditPacks() below, which is how the backend actually
  // exposes them.
  quota: () =>
    client.get("/journal/analyze/quota"),

  // POST /journal/analyze-setup (multipart) — single chart, immediate score/validation result.
  // Backend field name is "image" (@RequestParam MultipartFile image) — web's own frontend sends
  // "file" instead, a verified mismatch; this uses the field name the backend actually expects.
  // FormData: image (required), context (optional), language, depth ("full"|"quick").
  // Returns { id, analysis: {scores, validation, psychology, market, annotations, instrument,
  //   timeframe}, credits_remaining, credits_used }.
  analyzeSetup: (formData) =>
    client.post("/journal/analyze-setup", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // POST /journal/analyze-intraday (multipart) — 2-4 charts, async job.
  // Backend expects every file under the SAME repeated field name "images" (@RequestParam
  // List<MultipartFile> images) — web's own frontend instead sends three separately-named fields
  // (chart_4h/chart_1h/chart_3rd), a verified mismatch; this appends every file under "images" to
  // match the backend's actual, verified contract. Returns { job_id, status:"processing" }.
  analyzeIntraday: (formData) =>
    client.post("/journal/analyze-intraday", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // GET /journal/analyze-intraday/{jobId} -> { job_id, status, analysis?, error_message? }
  analyzeIntradayJob: (jobId) =>
    client.get(`/journal/analyze-intraday/${jobId}`),

  // POST /journal/analyses/{id}/refine { entry, stop, target } — re-run with confirmed levels,
  // no credit charged. Returns { analysis: {...} } (same shape as analyze-setup's `analysis`).
  refine: (id, entry, stop, target) =>
    client.post(`/journal/analyses/${id}/refine`, { entry, stop, target }),

  // ── Analysis credit packs (payment-service, /api/payments/*) ───────────────
  // Co-located here since they're used exclusively by the chart-analysis paywall, matching web's
  // own inline colocation in ChartAnalyzePanel.jsx.

  // GET /payments/credit-packs -> [{ pack_id, credits, price_usd, label, popular }]
  creditPacks: () =>
    client.get("/payments/credit-packs"),

  // POST /payments/credit-order { pack_id } -> { order_id, key_id, amount, currency, mock?, pack }
  creditOrder: (packId) =>
    client.post("/payments/credit-order", { pack_id: packId }),

  // POST /payments/credit-verify { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack_id }
  creditVerify: (payload) =>
    client.post("/payments/credit-verify", payload),
};
