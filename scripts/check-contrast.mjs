#!/usr/bin/env node
/**
 * Design-system contrast guard (T-0270 / T-0271).
 *
 * The toast shipped `background: var(--parch-100)` with `color: var(--t-200)` —
 * a parchment card carrying the palette's LIGHT body text, about 1.1:1. Nothing
 * caught it, because "both sides are valid tokens" is exactly what a linter
 * checks and exactly what was wrong. So this walks every component stylesheet,
 * resolves both sides of each rule against `_variables.scss`, and computes the
 * real WCAG ratio.
 *
 * SCOPE, deliberately narrow: a rule is checked only when BOTH its background
 * and its effective colour resolve to a flat token or hex. Gradients,
 * `color-mix()` and transparent washes are skipped rather than guessed at —
 * a guard that guesses gets muted, and a muted guard protects nothing.
 *
 * A colour inherited from an ancestor rule IN THE SAME FILE counts: `.chip:hover`
 * changing only the background is correct as long as `.chip` set a colour.
 *
 * ESCAPE HATCH: a `// contrast-guard-ignore: <reason>` comment anywhere inside a
 * block exempts it. It exists for elements that inherit a colour but render no
 * text — a decorative pip, a rule, a swatch — where the ratio is meaningless.
 * The reason is mandatory so an exemption has to be argued, not just applied.
 *
 * Run: `npm run lint:contrast` (wired into `npm run lint`, so CI enforces it).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const VARIABLES = join(SRC, 'styles/_variables.scss');

/** WCAG 2.1 minimum for normal-size body text. */
const AA_NORMAL = 4.5;

// ── Colour maths ────────────────────────────────────────────────────────────

function parseHex(hex) {
    const h = hex.replace('#', '').trim();
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : h;
    if (!/^[0-9a-f]{6}$/i.test(full)) return null;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function relativeLuminance([r, g, b]) {
    const channel = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg, bg) {
    const [a, b] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
}

// ── Token table ─────────────────────────────────────────────────────────────

/** `--name: #hex;` pairs from the single palette file. */
function loadTokens() {
    const tokens = new Map();
    for (const line of readFileSync(VARIABLES, 'utf8').split('\n')) {
        const m = /^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(line);
        if (m) tokens.set(m[1], m[2]);
    }
    return tokens;
}

/**
 * Resolve a declaration value to an RGB triple, or null when it is not a flat
 * colour this guard is willing to reason about.
 */
function resolveColour(value, tokens) {
    const v = value.trim().replace(/\s*!important\s*$/, '');
    if (/gradient|color-mix|rgba?\(|hsla?\(|,/.test(v)) return null;
    if (v === 'inherit' || v === 'transparent' || v === 'currentColor' || v === 'none') return null;
    const varMatch = /^var\((--[\w-]+)\)$/.exec(v);
    if (varMatch) {
        const hex = tokens.get(varMatch[1]);
        return hex ? parseHex(hex) : null;
    }
    if (v.startsWith('#')) return parseHex(v);
    return null;
}

// ── A very small SCSS block walker ──────────────────────────────────────────

/**
 * Walk `{ … }` blocks, tracking for each block the declarations written
 * directly inside it plus the colour inherited from its ancestors in this file.
 * Yields `{ line, selector, background, colour }` for every block that sets a
 * background.
 */
function* blocksWithBackground(source) {
    const stack = [{ selector: 'root', colour: null }];
    let buffer = '';
    let line = 1;
    let pendingSelector = '';
    // Declarations of the block currently being read.
    let current = null;

    const flushDeclaration = (text, atLine) => {
        const m = /^\s*([\w-]+)\s*:\s*([^;]+)$/.exec(text);
        if (!m || !current) return;
        const [, prop, value] = m;
        if (prop === 'color') current.colour = { value: value.trim(), line: atLine };
        if (prop === 'background' || prop === 'background-color') {
            current.background = { value: value.trim(), line: atLine };
        }
    };

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === '\n') line++;
        if (ch === '{') {
            pendingSelector = buffer.trim().split('\n').pop().trim();
            if (current) stack.push(current);
            current = { selector: pendingSelector, line, colour: null, background: null };
            buffer = '';
        } else if (ch === '}') {
            if (current) {
                flushDeclaration(buffer, line);
                if (current.background) {
                    const inherited = [...stack].reverse().find((b) => b.colour);
                    yield {
                        line: current.background.line,
                        startLine: current.line,
                        endLine: line,
                        selector: current.selector,
                        background: current.background.value,
                        colour: (current.colour ?? inherited?.colour)?.value ?? null,
                    };
                }
            }
            current = stack.pop() ?? null;
            buffer = '';
        } else if (ch === ';') {
            flushDeclaration(buffer, line);
            buffer = '';
        } else {
            buffer += ch;
        }
    }
}

// ── Walk the tree ───────────────────────────────────────────────────────────

function scssFiles(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) scssFiles(full, out);
        else if (entry.endsWith('.scss')) out.push(full);
    }
    return out;
}

const tokens = loadTokens();
if (tokens.size === 0) {
    console.error(`contrast guard: no colour tokens found in ${VARIABLES}`);
    process.exit(2);
}

const failures = [];
let checked = 0;

for (const file of scssFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    const ignoredLines = source
        .split('\n')
        .map((text, i) => (/contrast-guard-ignore\s*:\s*\S/.test(text) ? i + 1 : 0))
        .filter(Boolean);

    for (const rule of blocksWithBackground(source)) {
        const exempt = ignoredLines.some((l) => l >= rule.startLine && l <= rule.endLine);
        if (exempt) continue;
        const bg = resolveColour(rule.background, tokens);
        const fg = rule.colour ? resolveColour(rule.colour, tokens) : null;
        if (!bg || !fg) continue;
        checked++;
        const ratio = contrastRatio(fg, bg);
        if (ratio < AA_NORMAL) {
            failures.push({
                file: relative(ROOT, file),
                line: rule.line,
                selector: rule.selector,
                background: rule.background,
                colour: rule.colour,
                ratio: ratio.toFixed(2),
            });
        }
    }
}

if (failures.length > 0) {
    console.error(`\n✗ contrast guard: ${failures.length} rule(s) below WCAG AA ${AA_NORMAL}:1\n`);
    for (const f of failures) {
        console.error(`  ${f.file}:${f.line}  ${f.selector}`);
        console.error(`    color ${f.colour} on background ${f.background} → ${f.ratio}:1\n`);
    }
    console.error('Pair the surface with a text colour from the same half of the palette.');
    process.exit(1);
}

console.log(`✓ contrast guard: ${checked} resolvable surface/text pairs, all >= ${AA_NORMAL}:1`);
