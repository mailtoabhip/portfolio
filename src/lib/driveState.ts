/**
 * Per-frame mutable drive state, shared between three-components
 * without going through React/Zustand (no re-renders at 60fps).
 * Forest writes the eased actual speed; CameraRig reads it to
 * scale road rumble; Road scrolls its textures by it.
 */
export const drive = {
  /** Current actual speed in m/s (eased; 0 when stopped). */
  speed: 0,
  /** Total metres travelled this session. */
  dist: 0,
};
