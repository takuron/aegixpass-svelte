import { Marked } from 'marked';
import type { RendererObject, Tokens } from 'marked';

const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);
const dangerousTagPattern = /<\/?(?:script|iframe|object|embed|base|form|input|button|textarea|select|option|meta|link|style|svg|math)\b[^>]*>/gi;
const eventHandlerAttributePattern = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const dangerousUrlAttributePattern = /(\s+(?:href|src|xlink:href|formaction|action)\s*=\s*)(["']?)\s*(?:javascript|data|vbscript):[^"'\s>]*/gi;

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function sanitizeHref(href: string): string | null {
    try {
        const url = new URL(href, 'https://aegixpass.takuron.com');
        if (!allowedProtocols.has(url.protocol)) {
            return null;
        }
        return href;
    } catch {
        return null;
    }
}

function sanitizeTrustedHtml(html: string): string {
    return html
        .replace(dangerousTagPattern, '')
        .replace(eventHandlerAttributePattern, '')
        .replace(dangerousUrlAttributePattern, '$1$2#');
}

const renderer: RendererObject<string, string> = {
    html({ text }: Tokens.HTML | Tokens.Tag): string {
        return sanitizeTrustedHtml(text);
    },
    link(this, { href, title, tokens }: Tokens.Link): string {
        const safeHref = sanitizeHref(href);
        const text = this.parser.parseInline(tokens);
        if (!safeHref) {
            return text;
        }

        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(safeHref)}"${titleAttr} rel="noopener noreferrer">${text}</a>`;
    },
    image({ href, title, text }: Tokens.Image): string {
        const safeHref = sanitizeHref(href);
        if (!safeHref) {
            return escapeHtml(text);
        }

        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(safeHref)}" alt="${escapeHtml(text)}"${titleAttr}>`;
    }
};

const safeMarked = new Marked({
    async: false,
    gfm: true,
    renderer
});

export function renderTrustedMarkdown(markdownContent: string): string {
    return sanitizeTrustedHtml(safeMarked.parse(markdownContent) as string);
}
