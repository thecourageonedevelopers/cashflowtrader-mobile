import client from "./client";

// Customer webinar endpoints — same contract as the portal's `webinars` object (src/lib/api.js).
// Responses never carry provider links: joining returns a single-use CashFlow Trader launch path.
export const webinarsApi = {
  // tab: upcoming | live | ended — res: { webinars: [view] }
  list: (tab, q) => client.get("/webinars", { params: { tab, q: q || undefined } }),
  // res: { live: [view], upcoming: [view] }
  dashboard: () => client.get("/webinars/dashboard"),
  // res: { alerts: [{ kind: LIVE_NOW|STARTING_SOON|UPCOMING, webinar_id, title, at }] }
  alerts: () => client.get("/webinars/alerts"),
  // res: { webinar: view }
  get: (id) => client.get(`/webinars/${id}`),
  register: (id) => client.post(`/webinars/${id}/registration`),
  cancelRegistration: (id) => client.delete(`/webinars/${id}/registration`),
  // res: { launch_url: "/api/webinar/launch/<ticket>", expires_at } — single use, ~1 minute
  join: (id) => client.post(`/webinars/${id}/join`),
};
