import adapter from '@sveltejs/adapter-static'; // 导入 adapter-static
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // 使用我们刚刚安装的 adapter
    adapter: adapter({
      // 默认选项。`pages` 是输出目录，`assets` 是构建资源的目录。
      pages: 'build',
      assets: 'build',
      fallback: undefined, // 对于纯静态 SPA，可以设为 '200.html' 或 'index.html'
      precompress: false,
      strict: true
    })
  }
};

export default config;
