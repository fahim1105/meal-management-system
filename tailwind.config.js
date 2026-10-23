/** @type {import('tailwindcss').Config} */
/**
 * Tailwind v4 + DaisyUI v5: THIS FILE DOES NOT CONTROL COLORS.
 * Change theme colors in src/index.css (@plugin "daisyui/theme").
 * Nav / dock / logged-out hero stay hardcoded and are not themed.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
    },
  },
};
