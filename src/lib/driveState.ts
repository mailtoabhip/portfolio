/**
 * Per-frame mutable drive state, shared between three-components
 * without going through React/Zustand (no re-renders at 60fps).
 * Forest writes the eased actual speed; CameraRig reads it to
 * scale road rumble.
 */
export const drive = {
  /** Current actual speed in m/s (eased; 0 when stopped). */
  speed: 0,
  /** Distance (m) to the active drop point; -1 = none active. */
  nextStopDist: -1,
  /** Label of the active drop point ("" = none). */
  nextStopLabel: "",
};
