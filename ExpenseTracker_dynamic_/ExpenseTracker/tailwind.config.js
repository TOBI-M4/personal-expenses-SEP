/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf6",
          100: "#dcfce9",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
        },
        expense: {
          500: "#dc2626",
          600: "#b91c1c",
        },
      },
    },
  },
  plugins: [],
};
