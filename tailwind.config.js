/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "court-blue": "#1D5FA8",
        "court-green": "#2E7D4F",
        "ball-yellow": "#D4E157",
        charcoal: "#1C1E22",
        "warm-white": "#FAFAF8",
        "line-white": "#FFFFFF",
      },
    },
  },
  plugins: [],
};