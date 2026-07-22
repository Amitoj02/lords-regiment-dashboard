/**
 * A link/unlink result: the updated catalogue row PLUS the handle for the bulk
 * Discord role re-sync it queued (lords-dashboard-backend:T-0158).
 *
 * The batch id cannot ride on the mapped entity — `mapRank`/`mapMedal` build the
 * view model, and a transport-only handle has no business on it. Returning both
 * keeps the caller's refresh and its progress poll driven by ONE request instead
 * of re-fetching to discover what just happened.
 *
 * `relinkBatchId` is null when the change queued nothing: no old role to strip,
 * or no holders with a linked Discord identity.
 */
export interface LinkDiscordResult<T> {
    entity: T;
    relinkBatchId: string | null;
}

/**
 * Lift an entity mapper into a {@link LinkDiscordResult} mapper, so ranks and
 * medals peel the transport-only batch id off identically.
 */
export function toLinkResult<A extends { relinkBatchId?: string | null }, T>(
    mapEntity: (api: A) => T,
): (api: A) => LinkDiscordResult<T> {
    return (api) => ({ entity: mapEntity(api), relinkBatchId: api.relinkBatchId ?? null });
}
