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

  pending: () =>
    client.get("/journal/pending"),

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
};
