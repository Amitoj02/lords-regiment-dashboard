import { TestBed } from '@angular/core/testing';
import { MarkdownService } from './markdown.service';

describe('MarkdownService', () => {
    let service: MarkdownService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MarkdownService);
    });

    describe('the fallback contract', () => {
        // The public legal pages fall back to shipped copy on a falsy result.
        // A blank privacy policy is a compliance failure, so these three cases
        // must all be indistinguishable to the caller.
        it('returns empty string for null, undefined and whitespace-only input', () => {
            expect(service.render(null)).toBe('');
            expect(service.render(undefined)).toBe('');
            expect(service.render('   \n\t  ')).toBe('');
        });
    });

    describe('escapes before it emits markup', () => {
        // This is the security property of the whole class: author text can
        // never become a tag. If any of these regress, the renderer is unsafe.
        it('renders a script tag as inert text, not markup', () => {
            const html = service.render('<script>alert(1)</script>');
            expect(html).not.toContain('<script');
            expect(html).toContain('&lt;script&gt;');
        });

        it('renders an img onerror payload as inert text', () => {
            const html = service.render('<img src=x onerror="alert(1)">');
            expect(html).not.toContain('<img');
            expect(html).toContain('&lt;img');
        });

        it('escapes quotes so nothing can break out of an attribute', () => {
            expect(service.render('a "b" c')).toContain('&quot;b&quot;');
            expect(service.render("it's")).toContain('&#39;');
        });

        it('does not double-escape an ampersand entity', () => {
            expect(service.render('Tom & Jerry')).toContain('Tom &amp; Jerry');
        });
    });

    describe('link protocol allow-list', () => {
        // Escaping alone does not neutralise a javascript: scheme inside href,
        // so the protocol is checked separately.
        // The rendered output legitimately still CONTAINS the string
        // "javascript:" — as inert, escaped body text. The property that matters
        // is that it never reaches an href, so assert on the anchor, not on the
        // substring.
        it('drops a javascript: link, leaving the literal text', () => {
            const html = service.render('[click](javascript:alert(1))');
            expect(html).not.toContain('<a ');
            expect(html).not.toContain('href');
        });

        it('drops a data: link', () => {
            const html = service.render('[x](data:text/html,<script>alert(1)</script>)');
            expect(html).not.toContain('<a ');
            expect(html).not.toContain('href');
        });

        it('allows http, https and mailto', () => {
            expect(service.render('[a](https://example.com)')).toContain(
                'href="https://example.com"',
            );
            expect(service.render('[a](http://example.com)')).toContain(
                'href="http://example.com"',
            );
            expect(service.render('[a](mailto:privacy@example.com)')).toContain('mailto:');
        });

        it('allows site-relative links without opening a new tab', () => {
            const html = service.render('see [the guidelines](/guidelines)');
            expect(html).toContain('href="/guidelines"');
            expect(html).not.toContain('target="_blank"');
        });

        it('drops a protocol-relative //host link (LDA-L6)', () => {
            const html = service.render('[x](//evil.example.com/phish)');
            expect(html).not.toContain('<a ');
            expect(html).not.toContain('href');
        });

        it('opens external links in a new tab with rel=noopener noreferrer', () => {
            const html = service.render('[a](https://example.com)');
            expect(html).toContain('target="_blank"');
            expect(html).toContain('rel="noopener noreferrer"');
        });
    });

    describe('block rendering', () => {
        it('renders headings at their level', () => {
            expect(service.render('# One')).toBe('<h1>One</h1>');
            expect(service.render('#### Four')).toBe('<h4>Four</h4>');
        });

        it('renders paragraphs split on blank lines', () => {
            const html = service.render('First para.\n\nSecond para.');
            expect(html).toContain('<p>First para.</p>');
            expect(html).toContain('<p>Second para.</p>');
        });

        it('turns a single newline inside a paragraph into a line break', () => {
            expect(service.render('Line one\nLine two')).toContain('Line one<br />Line two');
        });

        it('renders bullet and ordered lists', () => {
            expect(service.render('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
            expect(service.render('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>');
        });

        it('renders blockquotes and horizontal rules', () => {
            expect(service.render('> quoted')).toBe('<blockquote>quoted</blockquote>');
            expect(service.render('---')).toBe('<hr />');
        });
    });

    describe('inline rendering', () => {
        it('renders bold, italic and inline code', () => {
            expect(service.render('**b**')).toContain('<strong>b</strong>');
            expect(service.render('*i*')).toContain('<em>i</em>');
            expect(service.render('`c`')).toContain('<code>c</code>');
        });

        // Emphasis must not be applied inside code, or a code sample containing
        // ** would silently sprout a <strong>.
        it('leaves emphasis markers literal inside inline code', () => {
            expect(service.render('`**not bold**`')).toContain('<code>**not bold**</code>');
        });

        it('leaves markup literal inside a fenced code block, and escapes it', () => {
            const html = service.render('```\n<b>**x**</b>\n```');
            expect(html).toContain('<pre><code>');
            expect(html).toContain('&lt;b&gt;**x**&lt;/b&gt;');
            expect(html).not.toContain('<strong>');
        });
    });
});
