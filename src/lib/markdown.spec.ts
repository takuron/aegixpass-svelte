import { describe, expect, it } from 'vitest';
import { renderTrustedMarkdown } from './markdown';

describe('renderTrustedMarkdown', () => {
    it('keeps ordinary HTML but removes dangerous execution surfaces', () => {
        const html = renderTrustedMarkdown(
            '# Title\n\n<div class="note">ok</div>\n<script>alert(1)</script>\n<img src="https://example.com/a.png" onerror="alert(1)">'
        );

        expect(html).toContain('<h1>Title</h1>');
        expect(html).toContain('<div class="note">ok</div>');
        expect(html).toContain('<img src="https://example.com/a.png">');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('onerror=');
    });

    it('neutralizes dangerous raw HTML URL attributes', () => {
        const html = renderTrustedMarkdown('<a href="javascript:alert(1)">bad</a><img src="data:text/html,evil">');

        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('data:text/html');
    });

    it('drops unsafe link protocols', () => {
        const html = renderTrustedMarkdown('[bad](javascript:alert(1)) [good](https://example.com)');

        expect(html).toContain('bad');
        expect(html).not.toContain('javascript:');
        expect(html).toContain('href="https://example.com"');
    });
});
