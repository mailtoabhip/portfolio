# Forest county — first free-roam region

Review branch: realism-update. Do not merge or deploy main without the owner's approval.

## Play

Open /open-world, or choose Open world from the highway view. Delivery highway returns to the original game.

- W / Up: accelerate.
- S / Down: brake, then reverse.
- A D / Left Right: continuous steering.
- Space: handbrake.
- E: load or unload when parked in the destination circle.
- R: recover the truck to the starting road.
- On-screen controls support pointer/touch driving. Releasing Drive or Reverse brakes.
- Night drive / Daylight changes lighting without moving the truck.

## What changed

The original scrolling highway and delivery simulator remain at /. The new mode uses real persistent X/Z coordinates and heading, bicycle steering with speed-dependent steering limits, signed reverse, terrain contact and fixed physics substeps. It does not use the highway's vertex-bend or scenery-recycling illusion.

The first region is approximately 1.14 km across, with a connected three-by-three road grid, intersections, roadside terrain, depot yards and a forest outpost. You can leave the road, turn around and revisit the same locations. The map boundary stops the truck and asks you to turn back; it does not wrap or teleport you.

The supplied asset pack is now used in the new mode:

- Refined rigid truck, animated wheels and working headlight beams.
- Generated photographic asphalt base-color texture, world-scaled road UVs, gravel shoulders, painted center and edge lines.
- Pine, fir and birch GLBs for nearby trees. Pine/fir trunks use the generated bark texture.
- Shared instanced meshes, distance-based detailed-tree selection and simpler clustered distant crowns.
- Instanced rock GLB, natural terrain banks, depots and roadside lamps.

Buildings, trunks, rocks and map edges block the truck. Road and depot surfaces remain level; the truck pitches and rolls with off-road height samples. The follow camera keeps a level horizon and shortens its boom around buildings.

The minimap shows roads, your heading, the depot and outpost. Start delivery sets a pickup at the depot; park inside the circle and load, then choose any route to the outpost and unload. The original timed highway delivery/toll rules are separate and remain available.

## Navigation fix

FaviconCycler previously removed framework-owned icon elements every animation tick. React then failed with removeChild errors during route changes or hot reload. The effect now updates icon URLs without removing React-owned nodes and restores attributes on cleanup. Only its own extra link is removed. A regression test covers this ownership rule.

## Checks

Fifteen automated checks cover the existing camera/viewer integration, delivery/toll interactions, new persistent motion and 60/120 FPS equivalence, continuous U-turns, reverse, handbrake, collisions, boundaries, long-frame clamping, road height, free-roam delivery interactions and favicon-node ownership.

TypeScript, focused ESLint and the production webpack build were run. Browser checks exercise free steering, depot approach, day/night, touch acceleration and responsive layouts. Final route-to-route checks are recorded in the chat.

## Current scope

This is a first bounded free-roam region, not a complete GTA-scale city. There is no NPC road traffic or pedestrian simulation in this mode, no vehicle entry/exit, and no save system across page reloads. The new mode currently uses the exterior follow camera; cabin/chase selection remains available in the original highway game.

Detailed tree selection is capped (18 desktop, 9 coarse-pointer devices). Distant trees use simplified crowns. Physical-phone performance profiling and more complete art direction remain review work before merging.

Useful next expansions: road-network traffic, more terrain and districts, world-space cabin view, map/job saving, and richer delivery sites. Keep these changes on realism-update.
