// src/routes/sitemap.xml/+server.ts

import type { RequestHandler } from '@sveltejs/kit';
import {SITE_URL} from "$lib/constants";

export const prerender = true;

export const GET: RequestHandler = async () => {
    // 使用 Vite 的 import.meta.glob 功能，动态获取所有 +page.svelte 文件
    const pages = import.meta.glob('/src/routes/**/+page.svelte');

    const body = render(Object.keys(pages));

    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml'
        }
    });
};

// 根据页面路径生成 XML 字符串
const render = (paths: string[]) => `<?xml version="1.0" encoding="UTF-8" ?>
<urlset
  xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
  xmlns:xhtml="https://www.w3.org/1999/xhtml"
  xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
  xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
>
  ${paths
    .map((path) => {
        // 将文件系统路径转换为 URL 路径
        const route = path
            .replace('/src/routes', '')
            .replace('/+page.svelte', '')
            .replace(/\/$/, ''); // 移除尾部的斜杠，处理首页

        // 如果是首页，路径就是空字符串，需要特殊处理
        return `
  <url>
    <loc>${SITE_URL}${route || '/'}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>${route ? '0.8' : '1.0'}</priority>
  </url>
      `;
    })
    .join('')}
</urlset>
`;