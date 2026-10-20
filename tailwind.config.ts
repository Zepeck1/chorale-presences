import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2a1a1f",
        wine: { DEFAULT: "#7a1f3d", dark: "#5c1530", soft: "#f3e3e8" },
        cream: "#faf6ef",
        gold: "#b8893b",
        ok: "#2f7d57",
        warn: "#b4541a",
        info: "#3a5f9a",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(42,26,31,.06), 0 4px 16px rgba(42,26,31,.06)",
      },
    },
  },
  plugins: [],
};

export default config;
