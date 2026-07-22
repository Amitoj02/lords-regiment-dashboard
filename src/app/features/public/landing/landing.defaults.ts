/**
 * The landing page's SHIPPED presentation (T-0238).
 *
 * Every `RegimentPresentation` field is nullable and null means "unset — render
 * the shipped default". These constants are that default, and they are exported
 * rather than inlined in the template so the admin editor can show the very same
 * strings as placeholder/preview copy. A never-configured install, an install
 * whose admin cleared a field, and an install whose API call failed all land
 * here — which is what guarantees the most-seen public surface is never blank.
 */
export const LANDING_DEFAULTS = {
    /** Hero background image. Also the preview image in the admin editor. */
    heroBannerUrl: '/assets/images/bg-1.jpg',
    charterQuote:
        'We stand not for glory alone, but for order in the line, honour on the field, ' +
        'and brotherhood in the mess. The regiment endures where the individual falls.',
    charterQuoteAttribution: 'Regiment Charter, Article I',
    /**
     * Scrim strength as a percentage, matching the shipped `.hero-overlay`
     * gradient's leading alpha (0.65). The SCSS is parameterised on this value,
     * so `heroOverlayDensity = 65` reproduces the shipped look EXACTLY and the
     * slider is continuous either side of it.
     */
    heroOverlayDensity: 65,
} as const;
