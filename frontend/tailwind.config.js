const colors = require('tailwindcss/colors');

module.exports = {
  purge: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: false,
  theme: {
    extend: {
      // Tailwind 2-compatible semantic aliases used by the existing UI.
      slate: colors.gray,
      amber: colors.yellow,
      emerald: colors.green,
      rose: colors.red,
      violet: colors.indigo,
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
