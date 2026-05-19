import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-prompt)", "Prompt", "sans-serif"],
        mono: ["var(--font-prompt)", "Prompt", "sans-serif"],
      },
      colors: {
        'brand-red': '#ff2301',
        'iron-gold': '#D4AF37',
        'iron-gray': '#4B5563',
        'iron-dark': '#1F2937',
        primary: {
          50: '#fff1f0',
          100: '#ffe1de',
          200: '#ffc7c1',
          300: '#ffa196',
          400: '#ff7161',
          500: '#ff2301',
          600: '#e61f01',
          700: '#bf1a01',
          800: '#991501',
          900: '#7d1101',
          950: '#450a01',
        },
      },
    },
  },
  plugins: [],
};
export default config;
