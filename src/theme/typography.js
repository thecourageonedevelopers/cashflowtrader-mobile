/**
 * Typography system — mirrors the React Web font stack exactly.
 *
 * Web uses three font families, each with a distinct semantic role:
 *
 *   .font-display  → Cabinet Grotesk  (Fontshare)  — headings, names, button text
 *   .font-mono     → JetBrains Mono   (Google)     — ALL numbers, stats, chip labels, tracking text
 *   .font-body     → Outfit           (Google)     — paragraphs, descriptions, messages
 *
 * Cabinet Grotesk is NOT on Google Fonts — font files are bundled in assets/fonts/
 * downloaded from Fontshare (https://www.fontshare.com/fonts/cabinet-grotesk).
 * Outfit and JetBrains Mono use @expo-google-fonts packages.
 *
 * Weight mapping from web CSS imports:
 *   Cabinet Grotesk:  400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold)
 *   Outfit:           300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold)
 *   JetBrains Mono:   400 (Regular), 500 (Medium), 700 (Bold)
 *
 * Note: Web uses `font-black` (Tailwind weight 900) on Cabinet Grotesk and JetBrains Mono.
 * Since neither font ships a 900 weight in the web CSS import, 900 falls back to the
 * next loaded weight — 800 for CG (→ extraBold) and 700 for JBM (→ bold).
 */

// ── Cabinet Grotesk ─────────────────────────────────────────────────────────
// CSS: .font-display { font-family: "Cabinet Grotesk", "Outfit", sans-serif; letter-spacing: -0.025em; }
export const DISPLAY = {
  regular:   "CabinetGrotesk-Regular",    // 400 — sub-labels, "/100" suffixes
  medium:    "CabinetGrotesk-Medium",     // 500 — secondary button text (web: font-semibold → falls back to 500)
  bold:      "CabinetGrotesk-Bold",       // 700 — button text, section titles, session titles
  extraBold: "CabinetGrotesk-ExtraBold",  // 800 — hero text, names, card headings (web: font-black)
};

// ── JetBrains Mono ───────────────────────────────────────────────────────────
// CSS: .font-mono { font-family: "JetBrains Mono", monospace; }
// Also used explicitly in .chip { font-family: "JetBrains Mono" }
export const MONO = {
  regular: "JetBrainsMono_400Regular",  // labels with tracking, timestamps, small uppercase text
  medium:  "JetBrainsMono_500Medium",   // slightly emphasized mono
  bold:    "JetBrainsMono_700Bold",     // numbers, KPIs, big stats (web: font-black → falls back to 700)
};

// ── Outfit ───────────────────────────────────────────────────────────────────
// CSS: .font-body { font-family: "Outfit", system-ui, sans-serif; }
// Also: body { font-family: "Outfit", system-ui, sans-serif; }
export const BODY = {
  light:    "Outfit_300Light",    // light paragraphs
  regular:  "Outfit_400Regular",  // body text, descriptions, messages
  medium:   "Outfit_500Medium",   // emphasized body (web: font-body font-medium)
  semiBold: "Outfit_600SemiBold", // secondary labels, slightly emphasized text
};

// ── Font asset map for App.js useFonts() ────────────────────────────────────
// Spread this object into the useFonts call in App.js.
// Cabinet Grotesk requires local assets; Outfit and JetBrains Mono come from
// @expo-google-fonts packages imported separately in App.js.
export const CABINET_GROTESK_FONTS = {
  "CabinetGrotesk-Regular":   require("../../assets/fonts/CabinetGrotesk-Regular.ttf"),
  "CabinetGrotesk-Medium":    require("../../assets/fonts/CabinetGrotesk-Medium.ttf"),
  "CabinetGrotesk-Bold":      require("../../assets/fonts/CabinetGrotesk-Bold.ttf"),
  "CabinetGrotesk-ExtraBold": require("../../assets/fonts/CabinetGrotesk-ExtraBold.ttf"),
};
