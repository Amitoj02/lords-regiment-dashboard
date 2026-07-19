import { diffLines, isJsonValue, prettyAuditValue } from './audit-diff.util';

describe('prettyAuditValue', () => {
    it('indents a valid JSON object with 2-space formatting (T-0219)', () => {
        expect(prettyAuditValue('{"name":"Recruit","order":1}')).toBe(
            '{\n  "name": "Recruit",\n  "order": 1\n}',
        );
    });

    it('indents a valid JSON array', () => {
        expect(prettyAuditValue('[1,2]')).toBe('[\n  1,\n  2\n]');
    });

    it('returns a plain (non-JSON) string verbatim', () => {
        expect(prettyAuditValue('Suspended for 7 days')).toBe('Suspended for 7 days');
    });

    it('falls back to the raw text for malformed near-JSON (trailing comma)', () => {
        const malformed = '{"a": 1,}';
        expect(prettyAuditValue(malformed)).toBe(malformed);
    });

    it('handles null/undefined/empty without throwing', () => {
        expect(prettyAuditValue(null)).toBe('');
        expect(prettyAuditValue(undefined)).toBe('');
        expect(prettyAuditValue('')).toBe('');
    });

    it('does not strip a bare scalar (leaves quoted strings/numbers untouched)', () => {
        expect(prettyAuditValue('"hello"')).toBe('"hello"');
        expect(prettyAuditValue('42')).toBe('42');
    });
});

describe('isJsonValue', () => {
    it('is true for objects and arrays, false for scalars/plain text/malformed', () => {
        expect(isJsonValue('{"a":1}')).toBe(true);
        expect(isJsonValue('[1,2]')).toBe(true);
        expect(isJsonValue('42')).toBe(false);
        expect(isJsonValue('a sentence')).toBe(false);
        expect(isJsonValue('{"a":1,}')).toBe(false);
        expect(isJsonValue('')).toBe(false);
        expect(isJsonValue(null)).toBe(false);
    });
});

describe('diffLines', () => {
    it('marks a single changed field red (remove) then green (add), context unchanged', () => {
        const before = '{\n  "name": "Recruit",\n  "order": 1\n}';
        const after = '{\n  "name": "Recruit",\n  "order": 2\n}';
        const diff = diffLines(before, after);

        const removed = diff.filter((l) => l.op === 'remove').map((l) => l.text);
        const added = diff.filter((l) => l.op === 'add').map((l) => l.text);
        expect(removed).toEqual(['  "order": 1']);
        expect(added).toEqual(['  "order": 2']);
        // The identical lines are preserved as context.
        expect(diff.filter((l) => l.op === 'context').map((l) => l.text)).toEqual([
            '{',
            '  "name": "Recruit",',
            '}',
        ]);
    });

    it('pairs pure additions and pure removals without off-by-one', () => {
        expect(diffLines('a\nb', 'a\nb\nc')).toEqual([
            { op: 'context', text: 'a' },
            { op: 'context', text: 'b' },
            { op: 'add', text: 'c' },
        ]);
        expect(diffLines('a\nb\nc', 'a\nc')).toEqual([
            { op: 'context', text: 'a' },
            { op: 'remove', text: 'b' },
            { op: 'context', text: 'c' },
        ]);
    });

    it('reconstructs each side exactly from context+remove (before) and context+add (after)', () => {
        const before = 'one\ntwo\nthree';
        const after = 'one\nTWO\nthree\nfour';
        const diff = diffLines(before, after);
        const rebuiltBefore = diff
            .filter((l) => l.op !== 'add')
            .map((l) => l.text)
            .join('\n');
        const rebuiltAfter = diff
            .filter((l) => l.op !== 'remove')
            .map((l) => l.text)
            .join('\n');
        expect(rebuiltBefore).toBe(before);
        expect(rebuiltAfter).toBe(after);
    });
});
