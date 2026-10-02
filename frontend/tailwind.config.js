/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // KidSafe brand palette
        navy: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#1e3a5f",  // primary — deep navy
          700: "#172d4a",
          800: "#112238",
          900: "#0a1628",
        },
        brand: {
          DEFAULT: "#1e3a5f",   // deep navy
          light:   "#2563eb",   // bright blue
          accent:  "#06b6d4",   // soft cyan
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};
