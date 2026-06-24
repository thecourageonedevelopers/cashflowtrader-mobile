// Port of web src/lib/format.js
// No DOM or browser APIs used — works identically in React Native.

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED",
  JPY: "¥",
};

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function currencySymbol(currency = "INR") {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

// options.showSign → prefix + for positive, - for negative
export function formatMoney(amount = 0, currency = "INR", options = {}) {
  const sym = currencySymbol(currency);
  const abs = Math.abs(amount);
  // en-IN gives Indian lakh/crore grouping for INR; falls back gracefully for others
  const formatted = abs.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const sign = options.showSign
    ? amount >= 0 ? "+" : "-"
    : amount < 0  ? "-" : "";
  return `${sign}${sym}${formatted}`;
}

// Returns "positive" | "negative" | "neutral" — used for color-coded P&L text.
export function moneyTone(amount = 0) {
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
}

// Returns a hex color string for use in React Native style objects.
export function moneyColor(amount = 0) {
  if (amount > 0) return "#39FF14";
  if (amount < 0) return "#f87171";
  return "#ffffff";
}

// fmt tokens: YYYY YY MMMM MMM MM M DD D HH mm ss
export function formatDate(date, fmt = "DD MMM YYYY") {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  const map = {
    YYYY: d.getFullYear(),
    YY:   String(d.getFullYear()).slice(-2),
    MMMM: MONTH_LONG[d.getMonth()],
    MMM:  MONTH_SHORT[d.getMonth()],
    MM:   pad(d.getMonth() + 1),
    M:    d.getMonth() + 1,
    DD:   pad(d.getDate()),
    D:    d.getDate(),
    HH:   pad(d.getHours()),
    mm:   pad(d.getMinutes()),
    ss:   pad(d.getSeconds()),
  };

  // Replace longest tokens first to avoid partial substitutions
  return Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .reduce((acc, token) => acc.replace(token, map[token]), fmt);
}

// Matches web src/lib/format.js — accepts a Date object, returns human-readable
// countdown string in the same format the web renders ("Starts in Xh Ym", etc.)
// Returns null when the target is in the past (caller shows "Live now").
export function formatCountdown(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;

  const totalMin  = Math.floor(diff / 60_000);
  const totalHr   = Math.floor(totalMin / 60);
  const totalDays = Math.floor(totalHr / 24);

  if (totalDays >= 2) return `Starts in ${totalDays} days`;
  if (totalDays === 1) return "Starts tomorrow";
  if (totalHr >= 1) {
    const m = totalMin - totalHr * 60;
    return `Starts in ${totalHr}h ${m}m`;
  }
  if (totalMin >= 1) return `Starts in ${totalMin}m`;
  const sec = Math.floor(diff / 1000);
  return `Starts in ${sec}s`;
}

export function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return formatDate(date, "DD MMM");
}

export function formatPercent(value = 0, decimals = 1) {
  return `${Number(value).toFixed(decimals)}%`;
}
