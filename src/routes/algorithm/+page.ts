import { marked } from 'marked';
import { error } from '@sveltejs/kit';

// Vite's "?raw" import handles turning the file into a string at build time.
// This is safe to use in a universal load function.
import markdownContent from '../../../ALGORITHM.md?raw';

export function load() {
    try {
        const htmlContent = marked.parse(markdownContent);
        // The load function returns the final HTML content as a prop
        return {
            content: htmlContent,
        };
    } catch (e) {
        console.error('Failed to parse ALGORITHM.md:', e);
        // If parsing fails for some reason, show a proper error page.
        throw error(500, '无法解析算法介绍文档。');
    }
}