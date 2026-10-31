/**
 * Highway cross-section, in world X (metres). The camera sits at
 * x = 0 in the truck group; the cab is centred at group x = -0.5, so
 * the middle lane's centre is at -0.5 when the truck starts.
 *
 *   verge | main carriageway (3 lanes) | divider | opposite road | verge
 *
 * Texture layouts in public/textures/ were generated to these exact
 * metres (see the comment in Road.tsx), so lines land where these
 * numbers say they do.
 */
export const MAIN_LEFT = -6.65;
export const MAIN_WIDTH = 12; // shoulder .75 + edge .15 + 3 × 3.5 + yellow .15 + .45
export const MAIN_RIGHT = MAIN_LEFT + MAIN_WIDTH; // 5.35

export const MEDIAN_WIDTH = 2;
export const MEDIAN_LEFT = MAIN_RIGHT;
export const MEDIAN_RIGHT = MEDIAN_LEFT + MEDIAN_WIDTH; // 7.35
export const KERB_HEIGHT = 0.3;

export const OPP_WIDTH = 8.5;
export const OPP_LEFT = MEDIAN_RIGHT;
export const OPP_RIGHT = OPP_LEFT + OPP_WIDTH; // 15.85

export const VERGE_WIDTH = 6;
export const VERGE_L_LEFT = MAIN_LEFT - VERGE_WIDTH; // -12.65
export const VERGE_R_RIGHT = OPP_RIGHT + VERGE_WIDTH; // 21.85

/** Lane centres (cab centre) and the truck group's lateral limits. */
export const LANE_CENTRES = [-4.0, -0.5, 3.0];
export const TRUCK_X_MIN = -3.6;
export const TRUCK_X_MAX = 3.6;

/** Length of one texture tile along the road (all road strips). */
export const TILE_LEN = 18;
