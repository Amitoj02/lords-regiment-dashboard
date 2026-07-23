/**
 * The sign-in page's SHIPPED presentation (T-0239). See
 * `landing.defaults.ts` — same contract, different surface.
 */
export const LOGIN_DEFAULTS = {
    loginBannerUrl: '/assets/images/bg-2.jpg',
    loginQuote: 'Your identity on the field is your word. Discord is your word made manifest.',
    loginQuoteAttribution: 'Major Diego Vasquez',
    /**
     * Matches the shipped `.login-left-overlay` gradient's leading alpha (0.82),
     * so `loginOverlayDensity = 82` is pixel-identical to the shipped panel.
     */
    loginOverlayDensity: 82,
} as const;
