/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"] ,
  theme: {
    extend: {
      colors: {
        "cafe-primary": "#4B2E2B",
        "cafe-accent": "#F7A76C",
        "cafe-cream": "#FFF7ED",
      },
    },
  },
  plugins: [],
};
