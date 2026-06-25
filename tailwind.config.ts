import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cobalt: '#1A6FFF',
        gold: '#F5B731',
      },
    },
  },
  plugins: [],
}

export default config
