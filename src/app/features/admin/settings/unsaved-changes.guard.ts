import { CanDeactivateFn } from '@angular/router';

/**
 * Implemented by any routed component that can hold edits the user has not
 * persisted yet.
 */
export interface HasUnsavedChanges {
    /** True when leaving now would silently discard the user's typing. */
    hasUnsavedChanges(): boolean;
}

/**
 * The message shown before abandoning edits. Exported so a spec can pin it and
 * so the wording stays in one place.
 */
export const UNSAVED_CHANGES_PROMPT =
    'You have unsaved changes on this page. Leave without saving?';

/**
 * The first `CanDeactivateFn` in this codebase (T-0240). It exists because the
 * legal-document editor holds a full privacy policy in a textarea: an accidental
 * click on the sidebar used to drop the whole draft with no warning.
 *
 * Deliberately kept to a native `confirm()` — the same pattern every destructive
 * admin action here already uses (event delete, gallery delete). A bespoke modal
 * would be a nicer artefact and a worse match for the surrounding code.
 *
 * A component that does not implement {@link HasUnsavedChanges} never blocks, so
 * attaching this guard to a route is always safe.
 */
export const unsavedChangesGuard: CanDeactivateFn<Partial<HasUnsavedChanges>> = (component) => {
    if (typeof component?.hasUnsavedChanges !== 'function' || !component.hasUnsavedChanges()) {
        return true;
    }
    return confirm(UNSAVED_CHANGES_PROMPT);
};
