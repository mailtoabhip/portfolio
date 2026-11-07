# Refined truck and chase camera

Branch: realism-update. Keep main unchanged pending owner review.

## Behavior

- The existing cabin remains the default view.
- The refined rigid truck loads once in the background. The camera button becomes available after successful loading.
- Click the camera button or press C to switch between Cabin and Chase.
- Chase view includes an Open portfolio button because the in-cab tablet is hidden.
- Camera changes do not modify speed, road distance, delivery state or timers.
- The same truck group drives both presentations; the exterior follows lateral position, yaw and body roll.
- Wheels rotate from signed distance traveled, including reverse. Front wheels steer from the existing input.
- The exterior is fitted to the existing front/rear collision extents (2.7 m forward, 3.8 m rearward). Cargo width remains 2.2 m; mirrors remain cosmetic.
- Headlights now align with the exterior lamp positions.
- Chase view keeps a level horizon, damps lateral following, supports narrow-screen framing and respects reduced-motion preference. A night-only fill keeps the rear readable.
- If the exterior request fails or times out, the cabin stays available and the switch reports Exterior unavailable.
- Controls move to the left edge on smaller screens to avoid the central delivery card.

This integrates the rigid delivery truck only. The long tractor-trailer remains an asset preview because it does not fit the existing delivery bays or collision footprint.

## Validation completed

- TypeScript check and focused ESLint passed.
- Nine automated tests passed: existing camera-motion and asset-viewer tests, exterior/collider fit, view availability/failure handling, and delivery interaction preservation.
- The delivery test executes GameSim using isolated pickup, FASTag and drop fixtures. It checks loading, two reader payments, unloading and unchanged job/drive state across view switches. It clears random traffic and does not claim a full traffic-heavy browser delivery run.
- Production build passed using next build --webpack. The local dependency junction is rejected by Turbopack, so the alternate supported bundler was used for local verification; repository bundler configuration was not changed.
- Production browser checks passed: button and C-key camera switching, reverse input, night/day rendering, portfolio open/return, and landscape layout at 844 × 390.
- An active pickup was driven toward in the development browser, then braking and switching back to the cabin preserved the job. A development hot-reload DOM error occurred during code edits; a fresh production session completed the above checks without browser errors.

## Review

Run the project normally and open /. Test the camera while driving, parking, reversing, entering tolls and completing a delivery. Validate performance on physical phone hardware before merging. No full mobile performance benchmark or chase-camera obstacle-avoidance system is included in this first integration.

The new forest models and generated road textures remain in the asset pack. They are not substituted into the game in this change.
