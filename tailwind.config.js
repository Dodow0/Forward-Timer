/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 允许通过给 <html> 标签添加 'dark' 类来切换模式
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // 直接映射到 CSS 变量，确保设计源头唯一
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        bg: 'var(--color-bg)',
        muted: 'var(--color-muted)',
        'muted-2': 'var(--color-muted-2)',
        fg: 'var(--color-fg)',
        'fg-muted': 'var(--color-fg-muted)',
        border: 'var(--color-border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      }
    }
  },
  plugins: []
}