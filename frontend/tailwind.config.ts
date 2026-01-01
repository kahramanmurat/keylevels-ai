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
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}
export default config
