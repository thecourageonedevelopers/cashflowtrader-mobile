// Auth stack
export const AUTH_ROUTES = {
  SIGN_IN: "SignIn",
  SIGN_UP: "SignUp",
  FORGOT_PASSWORD: "ForgotPassword",
  AUTH_CALLBACK: "AuthCallback",
  ONBOARDING: "Onboarding",
  LEGAL: "Legal",
};

// App stack (root)
export const APP_ROUTES = {
  MAIN: "Main",
  TRADE_DETAIL: "TradeDetail",
  AI_COACH: "AiCoach",
  JOURNAL_NEW: "JournalNew",
  ONE_CLICK_ANALYSIS: "OneClickAnalysis",
  TRADE_PLAN: "TradePlan",
  CHART_ANALYZE: "ChartAnalyze",
  CREATE_PASSWORD: "CreatePassword",
  CHANGE_CONTACT: "ChangeContact",
  WEBINAR_DETAIL: "WebinarDetail",
  LEGAL: "Legal", // Terms & Conditions etc. — same screen the auth stack uses (screens/LegalScreen.js)
};

// Bottom tab screen names (match existing AppTabs.js)
export const TAB_ROUTES = {
  OVERVIEW: "OverviewScreen",
  CHALLENGE: "ChallengeScreen",
  MARKET: "MarketScreen",
  JOURNAL: "JournalScreen",
  SESSIONS: "SessionsScreen",
  WEBINARS: "WebinarsScreen",
  PROGRESS: "ProgressScreen",
  SUPPORT: "SupportScreen",
  PROFILE: "ProfileScreen",
};
