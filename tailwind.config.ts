import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        paper: "#f6f7f4",
        ink: {
          950: "#080c0a",
          900: "#0e1512",
          800: "#17211d",
          700: "#243430",
          600: "#33453f",
        },
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          DEFAULT: "#10b981",
        },
        lime: {
          400: "#a3e635",
          500: "#84cc16",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)",
        card: "0 4px 20px -6px rgba(16,24,40,.10), 0 2px 8px -4px rgba(16,24,40,.06)",
        lift: "0 18px 40px -12px rgba(16,24,40,.22)",
        glow: "0 10px 30px -10px rgba(16,185,129,.45)",
      },
      borderRadius: {
        "2xl": "1.1rem",
        "3xl": "1.6rem",
      },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.9)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fadeUp .45s cubic-bezier(.21,1,.35,1) both",
        pop: "pop .2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
