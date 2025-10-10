/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  // 关键：确保 plugins 数组是空的，并且没有 daisyui 的配置块
  plugins: [], 
}