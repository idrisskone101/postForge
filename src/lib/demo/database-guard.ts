export class DemoDatabaseGuardError extends Error {
  constructor() {
    super(
      "Demo mode refuses to run: this database holds content and was not created by the demo. " +
        "Point DATABASE_URL at a dedicated, empty demo database."
    );
    this.name = "DemoDatabaseGuardError";
  }
}

/**
 * A restore deletes every row before it writes the sample set, so it may only
 * ever touch a database the demo created (marker present) or one that is
 * still completely empty. Anything else is somebody's real workspace.
 */
export function isSafeDemoDatabase(state: { hasMarker: boolean; contentRows: number }) {
  return state.hasMarker || state.contentRows === 0;
}

/** The seed is about 150 rows and 30 KB of JSON; these leave room to edit. */
export const DEMO_SIZE_LIMITS = { rows: 1_500, storedBytes: 25 * 1024 * 1024 } as const;

/**
 * Visitors can add rows and edit JSON. Past these limits the workspace is
 * restored right away instead of waiting for the timer, so the demo database
 * cannot be grown without bound.
 */
export function isOversizedDemoWorkspace(size: { rows: number; storedBytes: number }) {
  return size.rows > DEMO_SIZE_LIMITS.rows || size.storedBytes > DEMO_SIZE_LIMITS.storedBytes;
}
