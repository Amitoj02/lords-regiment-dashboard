import { UNSAVED_CHANGES_PROMPT, unsavedChangesGuard } from './unsaved-changes.guard';

/**
 * The guard's contract, independent of any component: it must never prompt when
 * there is nothing to lose, must always prompt when there is, and must let the
 * user's answer decide. The route/state arguments are unused by this guard, so
 * the casts below are noise-suppression rather than a shortcut.
 */
describe('unsavedChangesGuard', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const run = (component: any): boolean =>
        unsavedChangesGuard(
            component,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            null as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            null as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            null as any,
        ) as boolean;

    it('leaves without asking when nothing is dirty', () => {
        const confirmSpy = spyOn(window, 'confirm');
        expect(run({ hasUnsavedChanges: () => false })).toBeTrue();
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('blocks the navigation when the user declines the prompt', () => {
        spyOn(window, 'confirm').and.returnValue(false);
        expect(run({ hasUnsavedChanges: () => true })).toBeFalse();
    });

    it('allows the navigation when the user accepts losing the edits', () => {
        const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
        expect(run({ hasUnsavedChanges: () => true })).toBeTrue();
        expect(confirmSpy).toHaveBeenCalledWith(UNSAVED_CHANGES_PROMPT);
    });

    it('never blocks a component that does not implement the interface', () => {
        const confirmSpy = spyOn(window, 'confirm');
        expect(run({})).toBeTrue();
        expect(confirmSpy).not.toHaveBeenCalled();
    });
});
