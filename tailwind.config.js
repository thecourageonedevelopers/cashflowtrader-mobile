/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./navigation/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#22c55e",
        background: "#050505",
        surface: "#0a0a0a",
        "surface-border": "#1b1b1b",
        "input-bg": "#080808",
        "input-border": "#222222",
        muted: "#888888",
        "muted-dark": "#666666",
        "muted-label": "#777777",
      },
    },
  },
  plugins: [],
};
