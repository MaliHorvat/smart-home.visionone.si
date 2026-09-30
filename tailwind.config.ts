import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ha: {
          bg: "#f2f4f6",
          card: "#ffffff",
          text: "#212121",
          muted: "#5f6368",
          line: "#e4e7eb",
          on: "#ffc107",
          onSoft: "#fff8e1",
          primary: "#03a9f4",
          header: "#3d4d56",
          purple: "#7e57c2",
          purpleSoft: "#ede7f6",
        },
        ink: {
          950: "#212121",
          900: "#f2f4f6",
          800: "#ffffff",
          700: "#eceff1",
          600: "#cfd8dc",
        },
        sand: {
          50: "#212121",
          100: "#3c4043",
          400: "#5f6368",
          500: "#03a9f4",
        },
        glow: {
          400: "#03a9f4",
          500: "#03a9f4",
        },
      },
      fontFamily: {
        sans: ["var(--font-roboto)", "Roboto", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
