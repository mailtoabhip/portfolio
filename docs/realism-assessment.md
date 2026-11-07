# The Night Run: first realism milestone

## What was inspected

Repository: https://github.com/mailtoabhip/portfolio

Source baseline: acc4fe69b0506e6f01cc218cc5285d986239c9da (7 November 2026).
The package is named "the-night-run". The repository contains both the game and the portfolio; changes must stay scoped to the game.

The browser opened https://the-night-run.vercel.app and landed at https://www.abhijeetpurandare.com/ with the truck cabin running. Direct command-line DNS lookup failed, so deployment configuration was not independently verified. Confirm the intended game URL before any deployment.

The previous reference image was recovered and inspected: forest roadside banks, varied vegetation, daylight, long tree shadows, textured asphalt, and an external car camera. Preserve the truck and delivery gameplay; use the image as an environment and camera reference.

## Architecture and implications

| Area | Existing implementation | Consequence for realism |
| --- | --- | --- |
| Application | Next.js 16, React 19, React Three Fiber, Three.js, Zustand | Extend existing modules; no engine migration is needed for the first milestone. |
| Simulation | GameSim is the writer of mutable drive state and runs before scene readers. Includes throttle/brake/reverse, lanes, collisions, traffic, delivery sites, tolls and free run. | Keep these rules and controls intact during visual work. Current driving is an arcade simulation, not wheel/contact physics. |
| Road | Textured, subdivided strips; three-lane main carriageway, opposite carriageway, divider and verges. Movement uses texture scrolling. | There is already a useful road cross-section. Improve surface materials and shared route geometry incrementally. |
| Turns | curveWorld bends rendered vertices sideways as a function of distance ahead. Simulation coordinates remain straight. | Do not add visible hills or stronger curves independently of truck, traffic, sites and collision coordinates. Curvature is currently an illusion rather than a shared physical route. |
| Forest | Recycled instanced trunks, three cone canopy tiers and shrubs, with clearances near sites. | Keep instancing and site clearances; replace repeated silhouettes gradually and use stable placement. |
| Lighting | SkySystem owns day/night transitions, fog, exposure, hemisphere fill and directional sun. Quality tiers enable shadows. | Tune this system rather than adding competing lights. Audit shadow coverage and curved-world depth/shadow rendering before relying on long forest shadows. |
| Truck and camera | Procedural cabin, elevated driver seat, headlights and responsive framing. | Keep the cabin and tablet usable. A complete exterior truck is needed before adding a useful chase view. |

## Implemented first step: cabin motion

The accompanying ZIP changes only CameraRig.tsx and adds cameraMotion.ts plus tests.

- Adds a subtle response to acceleration and braking, limited to one degree.
- Changes normal road vibration from elapsed-time oscillation to distance-based oscillation, capped at 6 mm.
- Stops ordinary road vibration when distance is not advancing.
- Uses exponential damping for pointer movement.
- Bounds impact feedback separately.
- Resets the new seat response on initial mount, inactive phases and long frame gaps.
- Observes the operating system's reduced-motion preference, including changes while the page is open, for camera parallax and vibration.

Existing simulation, truck model, lane layout, delivery rules, controls, tablet framing and day/night behavior were not edited. This is visual seat motion, not a suspension or physics replacement. Existing Truck.tsx body roll is outside this patch.

## Validation

- Four Node tests passed: 30/60/144 FPS response equivalence; acceleration/braking signs and limits; pause/mount/tab-resume reset; vibration bounds, reverse and zero-speed behavior.
- Full-project TypeScript check passed.
- ESLint passed for the changed source files.
- Development server reported ready with Next.js 16.2.10.
- The production baseline was visually inspected in the browser.
- The edited local build could not be visually driven: the browser timed out connecting to localhost, and a separate local HTTP request was denied by the environment's socket permissions.
- A production build, deployment and device performance measurements were not completed. No changes were pushed or deployed.

Run in the repository after applying:

    node --test tests/camera-motion.cjs
    npx tsc --noEmit --incremental false
    npx eslint src/components/three/CameraRig.tsx src/lib/cameraMotion.ts

Before merging, visually drive forward, brake to a stop, reverse, scrape a kerb, open/close the tablet, switch day/night, and resize to a phone landscape view. Check reduced-motion mode and tab resume. Verify the horizon, dashboard and tablet remain comfortable and readable.

## Concrete next milestone: a 500 m forest delivery section

Build one opt-in route section in the existing game before converting the endless highway. Start with the current road width and delivery mechanics.

1. **Shared route coordinates.** Introduce a deterministic route sampler returning position, tangent, lateral direction and height for distance along the road. Use it for the road, terrain edges, truck, traffic and delivery/toll locations. Keep gameplay distances along the route; convert to world positions for rendering and physical queries. Do not also apply the old bend shader to this section.
2. **Road and terrain.** First prove the shared route on level ground with a gentle bend. Then add one shallow rise, continuous shoulders and terrain banks outside the drivable area. Add correctly scaled asphalt color, normal and roughness maps without changing lane boundaries or hiding markings. Use real geometry for silhouettes; avoid displacement that disagrees with the truck's contact height.
3. **Forest.** Add three licensed tree variants, shrubs and a small rock set. Use seeded placement, instancing and distance-based detail. Keep the shoulder, stopping bays, traffic sight lines and delivery approaches clear. Place trees using the same terrain height sampler; add background layers without making every distant tree cast a shadow.
4. **Lighting.** Use one coherent sun, sky fill, exposure and haze setup within SkySystem. Fit shadows to the visible driving area; verify tree shadows line up with geometry. Compare day and night with the current quality tiers, avoiding excessive ambient light and expensive full-scene shadows.
5. **Truck camera.** Keep the cabin view as default. After a full truck exterior is available, add an optional damped chase view with a stable horizon and obstruction handling. Keep camera changes independent of input and delivery state.

### Milestone acceptance

- Drive the section in both directions; the truck, traffic, road markings and delivery bay all align on the bend and rise.
- Complete one pickup and drop-off using existing controls and stopping rules; verify a toll transition if included in the section.
- No road seams, floating vegetation, terrain intrusions into lanes or visible scenery recycling near the player.
- Day/night changes remain usable; tablet and phone controls work in the cabin.
- Switching views does not reset the job or move the truck.
- Measure representative desktop and phone hardware. Start with targets of 60 FPS desktop and 30 FPS mobile; record frame times and tune quality tiers before expanding the route.
- Keep the existing route available until these checks pass.

This milestone improves appearance and spatial consistency. Tire grip, steering geometry, wheel contact, load transfer and suspension physics should follow as a separate milestone once the route has reliable contact geometry.

## What to supply next

1. **Truck asset:** one legally usable GLB/glTF delivery truck with a complete exterior, PBR materials and textures. Prefer separate wheels with centered pivots, front wheels that can steer, meter-scale dimensions, and documented forward/up axes. A detailed interior is optional because the current cabin can remain during integration. Include the source/license.
2. **Environment assets:** a small licensed set of realistic trees, shrubs, rocks and tiling asphalt/soil materials. An initial working budget is a truck around 50–100k triangles, 1–2k textures and a few tree variants with lower-detail versions; profile before increasing it.
3. **Deployment detail:** confirm whether Night Run should retain its own URL or redirect to the portfolio. No additional repository access is needed for this repository.

Assets are not required to continue the shared-route prototype: placeholder geometry is sufficient. The full truck exterior is required for a convincing chase-camera presentation.

## Applying the focused patch

The ZIP contains replacement CameraRig.tsx, new cameraMotion.ts, tests, this assessment and a unified patch. Use the patch on a new branch based on the source baseline above, or copy just those three source/test files into matching paths. Check for newer camera edits before applying. Do not replace the repository or deploy the entire inspection workspace.
