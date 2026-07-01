import client from "./client";

export const onboardingApi = {
  // Hydrate saved form data (restores partial progress on re-open)
  getProgress: () => client.get("/onboarding"),

  // Load dynamic questions configured by admin in the Forms manager
  getFormQuestions: () => client.get("/onboarding/form"),

  // Persist after each step so users can resume mid-flow
  saveProgress: (payload) => client.post("/onboarding/progress", payload),

  // Final submit — payload matches web: full_name, email, mobile, timezone,
  // profession, monthly_income, trading_experience, trading_capital,
  // trading_goal, currency, answers
  submit: (data) => client.post("/onboarding", data),
};
