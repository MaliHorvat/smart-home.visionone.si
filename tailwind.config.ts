import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b12",
          900: "#0c1220",
          800: "#121a2c",
          700: "#1a2438",
          600: "#243049",
        },
        sand: {
          50: "#f7f1e6",
          100: "#efe4d0",
          400: "#d4b483",
          500: "#c9a36a",
        },
        glow: {
          400: "#7ee0c6",
          500: "#3dcaa8",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 50px -24px rgba(0, 0, 0, 0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
