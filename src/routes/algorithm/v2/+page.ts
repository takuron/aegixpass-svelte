import { marked } from 'marked';
import { error } from '@sveltejs/kit';

import markdownContent from '../../../../ALGORITHM_v2.md?raw';

export function load() {
    try {
        const htmlContent = marked.parse(markdownContent);
        return {
            content: htmlContent,
        };
    } catch (e) {
        console.error('Failed to parse ALGORITHM_v2.md:', e);
        throw error(500, '无法解析V2算法介绍文档。');
    }
}
