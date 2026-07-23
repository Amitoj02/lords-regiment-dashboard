import { Injectable } from '@angular/core';

/**
 * Sentinels used to lift code out of the source before Markdown rules run, and
 * splice it back afterwards. They are Unicode private-use characters, written as
 * escape sequences so this file stays plain ASCII and greppable.
 *
 * Two properties make them the right choice, and both are load-bearing:
 *  - an author cannot realistically type them, so a document can never collide
 *    with a placeholder;
 *  - they contain no HTML-special character, so a placeholder survives
 *    {@link MarkdownService.escape} unchanged.
 *
 * A readable placeholder would be a live bug: ` CODE0 ` collides with any
 * document that quotes that text, and a bare ` 0 ` collides with every year,
 * price and section number in the corpus.
 */
const BLOCK_SENTINEL = '\uE000';
const INLINE_SENTINEL = '\uE001';

/**
 * A deliberately small, dependency-free Markdown renderer for admin-authored
 * legal documents (lords-dashboard-backend:T-0149).
 *
 * ## Why hand-written
 * This repo carries no runtime dependencies beyond Angular, Bootstrap and RxJS,
 * and a public legal page is the last place to take on a transitive supply
 * chain. The supported subset is everything a terms/privacy/guidelines document
 * needs and nothing more.
 *
 * ## Why it is safe
 * The renderer is **escape-first**: every character of the source is HTML-escaped
 * BEFORE a single tag is emitted, and tags are only ever added afterwards from a
 * fixed vocabulary. There is no path by which author input becomes markup, so a
 * `<script>` in the source is inert text rather than a tag. That matters because
 * these documents are published on unauthenticated pages and the author is an
 * admin account, not a trusted compiler.
 *
 * The output is ALSO bound with plain `[innerHTML]`, never
 * `bypassSecurityTrustHtml`, so Angular's own sanitiser runs over the result as a
 * second, independent layer: even a bug in this file cannot yield an executing
 * script. Do not "optimise" that bypass in.
 *
 * Link hrefs are checked against a protocol allow-list on top of escaping,
 * because an escaped-but-unvalidated `javascript:` URL is still a live vector
 * inside an `href`.
 *
 * ## Supported subset
 * `#`-`####` headings, paragraphs, `**bold**`, `*italic*`, `` `code` ``, fenced
 * code blocks, `-`/`*` bullet lists, `1.` ordered lists, `>` block quotes, `---`
 * rules and `[text](url)` links. Everything else renders as text.
 */
@Injectable({ providedIn: 'root' })
export class MarkdownService {
    /** Protocols a link may use. Anything else (notably `javascript:`) is dropped. */
    private static readonly SAFE_PROTOCOLS = ['http://', 'https://', 'mailto:'];

    /**
     * Render Markdown to a safe HTML fragment.
     *
     * Returns `''` for null/blank input so callers can branch on falsiness to
     * show their shipped fallback copy — a blank legal page must never ship.
     */
    render(markdown: string | null | undefined): string {
        if (!markdown || !markdown.trim()) {
            return '';
        }

        // Normalise line endings first so every downstream rule can assume \n.
        const source = markdown.replace(/\r\n?/g, '\n');

        // Fenced code blocks come out BEFORE anything else, so their contents are
        // never parsed as Markdown; they go back in last. Without this, a `**` in
        // a code sample would emit a stray <strong> inside the sample.
        const blocks: string[] = [];
        const lifted = source.replace(/```[^\n]*\n([\s\S]*?)```/g, (_match, body: string) => {
            blocks.push(this.escape(body.replace(/\n$/, '')));
            return `${BLOCK_SENTINEL}${blocks.length - 1}${BLOCK_SENTINEL}`;
        });

        const html = lifted
            .split(/\n{2,}/)
            .map((block) => this.renderBlock(block.trim()))
            .filter((block) => block.length > 0)
            .join('\n');

        return html.replace(
            new RegExp(`${BLOCK_SENTINEL}(\\d+)${BLOCK_SENTINEL}`, 'g'),
            (_match, index: string) => `<pre><code>${blocks[Number(index)]}</code></pre>`,
        );
    }

    /** Render one blank-line-delimited block. */
    private renderBlock(block: string): string {
        if (!block) {
            return '';
        }
        // A lifted code block stands alone; leave its placeholder untouched.
        if (new RegExp(`^${BLOCK_SENTINEL}\\d+${BLOCK_SENTINEL}$`).test(block)) {
            return block;
        }
        // Horizontal rule: three or more -, * or _ alone on a line.
        if (/^([-*_])\1{2,}$/.test(block)) {
            return '<hr />';
        }
        const heading = /^(#{1,4})\s+(.*)$/.exec(block);
        if (heading) {
            const level = heading[1].length;
            return `<h${level}>${this.renderInline(heading[2])}</h${level}>`;
        }
        const lines = block.split('\n');
        if (lines.every((line) => /^>\s?/.test(line))) {
            const inner = block.replace(/^>\s?/gm, '').replace(/\n/g, ' ');
            return `<blockquote>${this.renderInline(inner)}</blockquote>`;
        }
        if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
            return this.renderList(lines, /^\s*[-*]\s+/, 'ul');
        }
        if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
            return this.renderList(lines, /^\s*\d+[.)]\s+/, 'ol');
        }
        // Anything else is a paragraph. A single newline inside one becomes a
        // <br />, which is how authors expect an address block to render.
        return `<p>${this.renderInline(block).replace(/\n/g, '<br />')}</p>`;
    }

    private renderList(lines: string[], marker: RegExp, tag: 'ul' | 'ol'): string {
        const items = lines
            .map((line) => `<li>${this.renderInline(line.replace(marker, ''))}</li>`)
            .join('');
        return `<${tag}>${items}</${tag}>`;
    }

    /**
     * Inline spans. ESCAPES FIRST, then adds markup — that ordering is the whole
     * security property of this class and must not be rearranged.
     */
    private renderInline(text: string): string {
        let out = this.escape(text);

        // Lift inline code before ANY other inline rule and splice it back at the
        // end. Emitting <code> here and hoping the emphasis rules step around it
        // does not work: `**x**` inside a code span would still match.
        const spans: string[] = [];
        out = out.replace(/`([^`]+)`/g, (_match, body: string) => {
            spans.push(body);
            return `${INLINE_SENTINEL}${spans.length - 1}${INLINE_SENTINEL}`;
        });

        // Links. The label is already escaped; the href is validated separately,
        // because escaping alone does not neutralise a `javascript:` scheme.
        out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
            const safe = this.safeHref(href);
            if (!safe) {
                return match;
            }
            const external = /^https?:\/\//i.test(safe);
            const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${safe}"${attrs}>${label}</a>`;
        });

        out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

        return out.replace(
            new RegExp(`${INLINE_SENTINEL}(\\d+)${INLINE_SENTINEL}`, 'g'),
            (_match, index: string) => `<code>${spans[Number(index)]}</code>`,
        );
    }

    /**
     * Return the href if it uses an allowed protocol or is a site-relative path,
     * else null. The escape has already turned `"` into `&quot;`, so the value
     * cannot break out of the attribute it is interpolated into.
     */
    private safeHref(href: string): string | null {
        const value = href.trim();
        // Reject protocol-relative URLs (`//host/...`): they resolve to an
        // off-site origin under the current scheme, which the single-'/'
        // absolute-path allow just below would otherwise wave through (LDA-L6).
        if (value.startsWith('//')) {
            return null;
        }
        if (value.startsWith('/') || value.startsWith('#')) {
            return value;
        }
        const lower = value.toLowerCase();
        return MarkdownService.SAFE_PROTOCOLS.some((protocol) => lower.startsWith(protocol))
            ? value
            : null;
    }

    /** Escape every character that could start markup or break out of an attribute. */
    private escape(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
