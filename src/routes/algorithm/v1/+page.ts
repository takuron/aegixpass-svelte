import { error } from '@sveltejs/kit';
import { renderTrustedMarkdown } from '$lib/markdown';

import markdownContent from '../../../../ALGORITHM_v1.md?raw';

export function load() {
    try {
        const htmlContent = renderTrustedMarkdown(markdownContent);
        return {
            content: htmlContent,
        };
    } catch (e) {
        console.error('Failed to parse ALGORITHM_v1.md:', e);
        throw error(500, '无法解析V1算法介绍文档。');
    }
}
