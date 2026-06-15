/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#800000", // Aapka Maroon Color
        secondary: "#1A1A1A",
      }
    },
  },
  plugins: [],
  // darkMode line yahan se delete kar di gayi hai
}