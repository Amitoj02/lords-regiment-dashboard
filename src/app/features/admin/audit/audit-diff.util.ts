/**
 * Pure helpers for the audit detail dialog's Before/After view (T-0219..T-0221).
 * Kept framework-free and side-effect-free so they can be unit-tested directly and
 * never throw on the malformed/partial values that land in an audit ledger.
 */

/** One line of a git-style diff. */
export type DiffOp = 'context' | 'add' | 'remove';
export interface DiffLine {
    op: DiffOp;
    text: string;
}

/** True when a trimmed value looks like a JSON object/array we can parse. */
export function isJsonValue(value: string | null | undefined): boolean {
    const trimmed = value?.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
        return false;
    }
    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
}

/**
 * Pretty-print a Before/After value when it is a JSON object/array (T-0219):
 * re-serialize with 2-space indentation. Anything that is not parseable JSON — a
 * plain sentence, a bare scalar, or malformed near-JSON (e.g. a trailing comma) —
 * is returned verbatim, so non-JSON values render exactly as they were stored and
 * a parse error can never throw.
 */
export function prettyAuditValue(value: string | null | undefined): string {
    const raw = value ?? '';
    const trimmed = raw.trim();
    // Only reformat objects/arrays — pretty-printing a bare scalar would just strip
    // quotes / add nothing, and a plain string is not ours to rewrite.
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
        return raw;
    }
    try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
        return raw;
    }
}

/**
 * A git-style line-level diff between two multi-line strings (T-0220), computed
 * with the classic longest-common-subsequence so unchanged lines stay `context`,
 * lines only in `before` are `remove`, and lines only in `after` are `add`. The
 * table is O(n·m) over the line counts — negligible for the small Before/After
 * states an audit entry carries.
 */
export function diffLines(before: string, after: string): DiffLine[] {
    const a = before.split('\n');
    const b = after.split('\n');
    const m = a.length;
    const n = b.length;

    // lcs[i][j] = length of the LCS of a[i..] and b[j..].
    const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            lcs[i][j] =
                a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }

    const out: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) {
            out.push({ op: 'context', text: a[i] });
            i++;
            j++;
        } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            out.push({ op: 'remove', text: a[i] });
            i++;
        } else {
            out.push({ op: 'add', text: b[j] });
            j++;
        }
    }
    while (i < m) {
        out.push({ op: 'remove', text: a[i] });
        i++;
    }
    while (j < n) {
        out.push({ op: 'add', text: b[j] });
        j++;
    }
    return out;
}
