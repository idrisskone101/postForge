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
