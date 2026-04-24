/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主按钮颜色 (Primary Button)
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        // 次要按钮颜色 (Secondary Button)
        secondary: 'var(--color-secondary)',
        // 强调色 (Accent Color)
        accent: 'var(--color-accent)',
        // 背景色 (Background Colors)
        'bg-pink-light': 'var(--color-bg-pink-light)',
        'bg-purple-light': 'var(--color-bg-purple-light)',
        'bg-pink-card': 'var(--color-bg-pink-card)',
        'bg-purple-card': 'var(--color-bg-purple-card)',
        // 边框颜色 (Border Colors)
        'border-pink': 'var(--color-border-pink)',
        'border-purple': 'var(--color-border-purple)',
        'border-gray-light': 'var(--color-border-gray-light)',
        'border-gray': 'var(--color-border-gray)',
        // 文字颜色 (Text Colors)
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'text-body': 'var(--color-text-body)',
        // 其他颜色 (Other Colors)
        'purple-username': 'var(--color-purple-username)',
        'bg-comment': 'var(--color-bg-comment)',
        'bg-empty': 'var(--color-bg-empty)',
      },
    },
  },
  plugins: [],
}
