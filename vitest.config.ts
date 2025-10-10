import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // 告诉 Vitest 使用 'jsdom' 环境，模拟浏览器 API
    // 这可以避免加载 SvelteKit 的服务器端代码
    environment: 'jsdom',

    // 定义哪些文件是测试文件
    include: ['src/**/*.{test,spec}.{js,ts}'],

    // 如果你的测试依赖于 $lib 别名，这一项可以帮助 Vitest 正确解析
    alias: [{ find: /^svelte$/, replacement: 'svelte/internal' }]
  }
});