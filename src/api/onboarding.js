import client from "./client";

export const onboardingApi = {
  // data: { full_name, email, mobile, trading_experience, biggest_challenge, monthly_goal, trader_persona }
  submit: (data) => client.post("/onboarding", data),
};
