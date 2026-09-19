/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#3654D8",
        done: "#2E9E6B",
        danger: "#C4432F",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        sans: ["Work Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
