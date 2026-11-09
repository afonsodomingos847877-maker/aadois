/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#FFFFFF',
        tesla: {
          black: '#000000',
          card: '#111111',
          hover: '#161616',
          dark: '#1A1A1A',
          border: '#262626',
          borderSubtle: 'rgba(255, 255, 255, 0.08)',
          gray: '#808080',
          lightGray: '#E5E5E5',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      letterSpacing: {
        widest: '0.25em',
        ultra: '0.35em',
      },
    },
  },
  plugins: [],
};
