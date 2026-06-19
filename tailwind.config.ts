import type { Config } from 'tailwindcss'

export default {
  content: [
    './playground/**/*.{vue,js,ts}',
    './src/components/**/*.vue',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
