/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#090b0e",
          900: "#11141a",
          850: "#161b24",
          800: "#1d232f",
          700: "#2b3445",
          600: "#3d485f",
        },
        accent: {
          lime: "#84cc16",
          limeHover: "#65a30d",
          coral: "#f43f5e",
          coralHover: "#e11d48",
          cyan: "#06b6d4",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(132, 204, 22, 0.25)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
}
