/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        brand: {
          DEFAULT: "var(--brand)",
          ink: "var(--brand-ink)",
        },
        warn: "var(--warn)",
        danger: "var(--danger)",
        success: "var(--success)",
        alg: {
          bfs: "var(--alg-bfs)",
          dfs: "var(--alg-dfs)",
          ucs: "var(--alg-ucs)",
          greedy: "var(--alg-greedy)",
          astar: "var(--alg-astar)",
        },
      },
      borderRadius: {
        xl: "16px",
        lg: "12px",
        md: "8px",
        sm: "6px",
        full: "999px",
      },
      fontFamily: {
        sans: ["Inter Variable", "sans-serif"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "marquee": "marquee 35s linear infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "marquee": {
          from: { transform: "translateX(0%)" },
          to: { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
}
