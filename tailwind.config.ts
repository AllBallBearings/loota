import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Trailhead Arcade palette — warm outdoor daylight + tactile game accents.
        birch: {
          50: '#FFFDF8',
          100: '#F8F5EC',
          200: '#F3EFE3',
          300: '#E8E1CE',
          400: '#D8CEB4',
        },
        pine: {
          50: '#E6F2EB',
          100: '#C5E0D0',
          500: '#354D3F',
          700: '#21382B',
          900: '#16261D',
        },
        blaze: {
          100: '#FFE4DC',
          400: '#FF7049',
          500: '#FF5428',
          600: '#CC330D',
        },
        treasure: {
          50: '#FFFBEA',
          100: '#FFF4CC',
          300: '#FFE066',
          400: '#FFD038',
          500: '#FFC21A',
          600: '#E59D00',
          700: '#C88A00',
        },
        meadow: {
          100: '#DCF7E7',
          400: '#26C26B',
          500: '#18A957',
          600: '#0F7A3E',
        },
        adventure: {
          100: '#DCEEFF',
          400: '#3BA3F6',
          500: '#1E88E5',
          600: '#135CA1',
        },
        mystery: {
          100: '#EDE7FE',
          400: '#A57BFF',
          500: '#8B5CF6',
          600: '#6232D6',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Menlo', 'Monaco', 'monospace'],
        display: ['var(--font-bricolage)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
