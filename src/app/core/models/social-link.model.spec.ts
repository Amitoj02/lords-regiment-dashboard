import {
    SOCIAL_PLATFORMS,
    SocialPlatform,
    isValidSocialHandle,
    normalizeSocialHandle,
    socialPlatformSpec,
} from './social-link.model';

/**
 * The client half of a rule the SERVER enforces (T-0289). These specs are not
 * here to prove the handle is safe — the API revalidates everything it is sent,
 * and it is the API that builds the URL. They are here so the two copies of the
 * rule cannot drift apart silently, which is the failure mode of every mirrored
 * validator: the member is told "that looks fine", saves, and gets a 400 with a
 * message written for a different audience.
 */
describe('social-link model (T-0289)', () => {
    describe('normalizeSocialHandle', () => {
        it('trims surrounding whitespace', () => {
            expect(normalizeSocialHandle('  panda  ')).toBe('panda');
        });

        it('drops ONE leading @, because a handle is not its sigil', () => {
            expect(normalizeSocialHandle('@panda')).toBe('panda');
        });

        it('leaves a second @ alone — that is a typo, not decoration', () => {
            // Stripping greedily would turn a wrong handle into a plausible one
            // and store it, where the regex should be refusing it.
            expect(normalizeSocialHandle('@@panda')).toBe('@panda');
        });

        it('drops a trailing slash, which is what copying a URL bar leaves', () => {
            expect(normalizeSocialHandle('panda/')).toBe('panda');
        });

        it('handles a sigil and a slash at once', () => {
            expect(normalizeSocialHandle(' @panda/ ')).toBe('panda');
        });

        it('leaves an already-clean handle untouched', () => {
            expect(normalizeSocialHandle('jameson.nolt')).toBe('jameson.nolt');
        });

        it('trims ONCE, so a space after the sigil survives and is refused', () => {
            // Byte-for-byte the server's rule (src/members/social-platforms.ts).
            // A second trim would repair '@ panda' here and then hand the server
            // a handle it rejects — the exact drift these mirrored validators
            // exist to prevent.
            expect(normalizeSocialHandle('@ panda')).toBe(' panda');
            expect(isValidSocialHandle('twitch', normalizeSocialHandle('@ panda'))).toBeFalse();
        });
    });

    describe('the registry', () => {
        it('covers every platform exactly once, in a stable display order', () => {
            expect(SOCIAL_PLATFORMS.map((s) => s.platform)).toEqual([
                'twitch',
                'youtube',
                'instagram',
                'tiktok',
                'x',
                'steam',
                'medal',
            ]);
        });

        it('gives every platform a label, an example and a URL hint', () => {
            for (const spec of SOCIAL_PLATFORMS) {
                expect(spec.label).withContext(spec.platform).toBeTruthy();
                expect(spec.example).withContext(spec.platform).toBeTruthy();
                expect(spec.urlHint).withContext(spec.platform).toBeTruthy();
            }
        });

        it('accepts its own example for every platform', () => {
            // The placeholder is the one handle a member is most likely to copy;
            // an example the validator rejects is a booby trap.
            for (const spec of SOCIAL_PLATFORMS) {
                expect(isValidSocialHandle(spec.platform, spec.example))
                    .withContext(`${spec.platform}: ${spec.example}`)
                    .toBeTrue();
            }
        });

        it('answers with undefined for a platform this build does not know', () => {
            expect(socialPlatformSpec('myspace')).toBeUndefined();
            expect(isValidSocialHandle('myspace', 'panda')).toBeFalse();
        });
    });

    describe('isValidSocialHandle', () => {
        const accepted: [SocialPlatform, string][] = [
            ['twitch', 'nolt'],
            ['twitch', 'a'.repeat(25)],
            ['youtube', 'No_lt-Plays.1'],
            ['instagram', 'j'],
            ['tiktok', 'no.lt'],
            ['x', 'n'],
            ['x', 'a'.repeat(15)],
            ['steam', 'jamesonnolt'],
            ['steam', '76561198012345678'],
            ['medal', 'panda'],
        ];

        // Jasmine has no `it.each`, so the table is walked inside one spec;
        // `withContext` still names the failing row.
        it('accepts the handles each platform really issues', () => {
            for (const [platform, handle] of accepted) {
                expect(isValidSocialHandle(platform, handle))
                    .withContext(`${platform}: ${handle}`)
                    .toBeTrue();
            }
        });

        it("enforces each platform's length bounds", () => {
            expect(isValidSocialHandle('twitch', 'abc')).toBeFalse(); // min 4
            expect(isValidSocialHandle('twitch', 'a'.repeat(26))).toBeFalse();
            expect(isValidSocialHandle('x', 'a'.repeat(16))).toBeFalse();
            expect(isValidSocialHandle('tiktok', 'a')).toBeFalse(); // min 2
        });

        it('rejects the characters that would let a handle escape its URL', () => {
            // The server builds the URL, so this is defence in depth rather than
            // the only guard — but a handle containing a slash, a scheme or a
            // newline has no business being stored either.
            const hostile = [
                'a/b',
                '../evil',
                'a?b',
                'a#b',
                'https://evil.example',
                'a b',
                'a\nb',
                'a%2Fb',
                'a@b',
            ];
            for (const handle of hostile) {
                for (const spec of SOCIAL_PLATFORMS) {
                    expect(isValidSocialHandle(spec.platform, handle))
                        .withContext(`${spec.platform}: ${JSON.stringify(handle)}`)
                        .toBeFalse();
                }
            }
        });

        it('rejects an empty handle for every platform', () => {
            for (const spec of SOCIAL_PLATFORMS) {
                expect(isValidSocialHandle(spec.platform, ''))
                    .withContext(spec.platform)
                    .toBeFalse();
            }
        });

        it('accepts a 17-digit steamID64 as well as a vanity id', () => {
            expect(isValidSocialHandle('steam', '76561198012345678')).toBeTrue();
            expect(isValidSocialHandle('steam', 'jamesonnolt')).toBeTrue();
        });

        it('does not let a dot into a platform whose handles have none', () => {
            expect(isValidSocialHandle('twitch', 'nolt.plays')).toBeFalse();
            expect(isValidSocialHandle('x', 'nolt.plays')).toBeFalse();
            expect(isValidSocialHandle('instagram', 'nolt.plays')).toBeTrue();
        });
    });
});
