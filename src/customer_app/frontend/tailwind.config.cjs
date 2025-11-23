/** @type {import('tailwindcss').Config} */
const colorFromCssVar = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"] ,
  theme: {
    extend: {
      colors: {
        "cafe-primary": colorFromCssVar("--color-primary"),
        "cafe-accent": colorFromCssVar("--color-accent"),
        "cafe-cream": colorFromCssVar("--color-cream"),
      },
    },
  },
  plugins: [],
};
