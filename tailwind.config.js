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
        // 主按钮颜色 (Primary Button) - 粉色系
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        // 次要按钮颜色 (Secondary Button) - 浅粉色
        secondary: 'var(--color-secondary)',
        // 强调色 (Accent Color) - 玫瑰红
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
        // 其他颜色 (Other Colors)
        'bg-comment': 'var(--color-bg-comment)',
        'bg-empty': 'var(--color-bg-empty)',
      },
    },
  },
  plugins: [],
}