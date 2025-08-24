/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#05060B',
        surface: '#0D1018',
        'surface-raised': '#151A26',
        border: 'rgba(255,255,255,0.08)',
        ink: '#F4F5FA',
        'ink-muted': '#9AA1B8',
        'ink-faint': '#5B6178',
        pulse: {
          400: '#9C82FF',
          500: '#7C5CFF',
          600: '#6845F0',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
        },
        flame: {
          400: '#FFB020',
          500: '#FF7A1A',
        },
        success: '#34D399',
        danger: '#F87171',
      },
      borderRadius: {
        xl: '20px',
        '2xl': '28px',
      },
    },
  },
  plugins: [],
};
