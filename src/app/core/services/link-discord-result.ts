/**
 * A link/unlink result: the updated catalogue row PLUS the handle for the bulk
 * Discord role re-sync it queued (lords-dashboard-backend:T-0158) and any
 * advisory the API attached to the link (lords-dashboard-backend:T-0189).
 *
 * Neither can ride on the mapped entity — `mapRank`/`mapMedal` build the view
 * model, and transport-only fields have no business on it. Returning them
 * alongside keeps the caller's refresh and its progress poll driven by ONE
 * request instead of re-fetching to discover what just happened.
 *
 * `relinkBatchId` is null when the change queued nothing: no old role to strip,
 * or no holders with a linked Discord identity.
 *
 * `warning` is null unless the role just linked carries privileged Discord
 * permissions. It is NOT an error — the link succeeded — so the caller shows it
 * and carries on. A backend that does not send the field yet degrades to null,
 * i.e. silence rather than a broken screen.
 */
export interface LinkDiscordResult<T> {
    entity: T;
    relinkBatchId: string | null;
    warning: string | null;
}

/**
 * Lift an entity mapper into a {@link LinkDiscordResult} mapper, so ranks and
 * medals peel the transport-only fields off identically.
 */
export function toLinkResult<
    A extends { relinkBatchId?: string | null; discordRoleWarning?: string | null },
    T,
>(mapEntity: (api: A) => T): (api: A) => LinkDiscordResult<T> {
    return (api) => ({
        entity: mapEntity(api),
        relinkBatchId: api.relinkBatchId ?? null,
        warning: api.discordRoleWarning ?? null,
    });
}
