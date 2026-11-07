# Realism update — review branch

All work is on realism-update. Do not merge or promote to production until the owner completes testing and approves.

## Scope

- A focused cabin-camera change: bounded acceleration/braking pitch, distance-based road vibration, exponential pointer damping and reduced-motion support.
- Six original GLB assets: two truck variants, three trees and a roadside rock.
- Two AI-generated base-color textures, supplied separately.
- An isolated asset viewer at /realism-assets/index.html.
- Editable generation source, prompts, measured bounds, provenance and limitations in public/realism-assets/README.md.

The generated meshes are first-pass procedural assets. They have not been substituted into the driving scene. The long trailer does not fit the existing bay/collider design and has no articulation rig. This branch is a starting point for visual review, not a completed hyperrealistic game conversion.

## Tests completed

Four camera motion tests passed, including 30/60/144 FPS equivalence. TypeScript and focused lint checks passed against the source baseline.

All six GLBs were reimported with Three.js GLTFLoader. Header/version/length, exported triangle and mesh counts, finite vertex/normal data, and truck wheel-pivot hierarchy passed. The initial viewer lacked a required SkeletonUtils module; that dependency has now been included.

Visual verification is outstanding. The Windows browser-control tool stopped because it could not determine the active URL reliably. No final visual rendering or production build is claimed.

## Test this branch

    npm ci
    node --test tests/camera-motion.cjs
    node tools/realism/validate-assets.mjs
    npx tsc --noEmit --incremental false
    npx eslint src/components/three/CameraRig.tsx src/lib/cameraMotion.ts
    npm run dev

Open / for the existing game with the camera adjustment. Open /realism-assets/index.html for the separate asset viewer. Review both truck variants from the front, side and rear; select every tree and rock. Check console/network failures, wheel pivots, normals, highlights, material balance, and proportions.

In the game, test acceleration, braking, reverse, kerb impacts, opening/closing the tablet, day/night, reduced-motion mode, tab resume and landscape-phone framing. Preserve delivery/toll behavior.

The branch keeps the original gameplay models until the new assets pass review and are aligned to the simulation. See realism-assessment.md for the road/terrain/forest milestone.

No production deployment was requested or performed. The repository's checked-in GitHub Pages workflow triggers on main pushes; this work does not push main.
