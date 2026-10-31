"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useNightRun } from "@/lib/store";
import { input } from "@/lib/controls";
import { drive } from "@/lib/driveState";
import { curveUniform, advanceCurve } from "@/lib/curveWorld";
import {
  sim,
  useGame,
  toast,
  saveBest,
  commands,
  activeSite,
  bumpWorld,
  beep,
  TIME_LIMIT,
  PICKUP_AHEAD,
  TOLL1_AFTER_PICKUP,
  TOLL_GAP,
  DROP_AFTER_TOLL2,
  NEXT_PICKUP_AFTER_DROP,
  LOAD_TIME,
  TOP_SPEED,
  REVERSE_TOP,
  FASTAG_READ_SPEED,
  FASTAG_READ_DIST,
  TRUCK_HALF_W,
  TRUCK_FRONT,
  TRUCK_REAR,
  CAB_OFFSET_X,
  LANES,
  ISLAND_START,
  ISLAND_END,
  LANE_BAND,
  LANE_FUNNEL,
  BAY_W,
  BAY_L,
  BAY_X,
  LAYBY_LEFT,
  LAYBY_BEFORE,
  LAYBY_AFTER,
  VEHICLES,
  VEHICLE_TYPES,
  type Car,
  type Plaza,
  type VehicleType,
} from "@/lib/game";

/**
 * The game's single simulation step. Mounted FIRST inside the Canvas
 * so its useFrame runs before Truck / Forest / Road / props, which
 * only read `drive` and `sim`.
 *
 * Owns: truck speed (incl. reverse), lateral position and limits
 * (road edges, lay-bys, toll islands), car traffic and queues, toll
 * barriers + FASTag, and the pickup → deliver job.
 */

const LAT_SPEED = 5.2; // m/s sideways at speed
const DRIFT = 0.55; // bend push toward the outside of a curve
const LOOK_INTO_BEND = 38;
const ROAD_GROUP_MIN = -4.1; // camera x limits on the open road
const ROAD_GROUP_MAX = 3.9;
const CAR_X_MIN = -5.6; // cars may be shoved onto the shoulder, never past the kerb
const CAR_X_MAX = 4.4;
const TAPER = 16; // lay-by entry / exit taper length

const OPP_LANES = [9.7, 13.2];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const nearestLane = (x: number) => {
  let best = 0;
  for (let i = 1; i < LANES.length; i++) if (Math.abs(LANES[i] - x) < Math.abs(LANES[best] - x)) best = i;
  return best;
};

function makeCar(type: VehicleType, s: number, laneX: number, dir: 1 | -1, v?: number): Car {
  const spec = VEHICLES[type];
  const vmax = rand(spec.vmin, spec.vmax);
  return {
    id: sim.nextCarId++,
    type,
    s,
    x: laneX,
    laneX,
    v: v ?? vmax,
    vmax,
    vx: 0,
    knock: 0,
    dir,
    wait: 0,
    queued: false,
  };
}

function trafficType(): VehicleType {
  // Mostly cars, some autos/tempos, the odd lorry.
  const r = Math.random();
  if (r < 0.22) return "hatch";
  if (r < 0.42) return "sedan";
  if (r < 0.6) return "suv";
  if (r < 0.74) return "auto";
  if (r < 0.88) return "tempo";
  return "lorry";
}

function makePlaza(s: number, index: number): Plaza {
  const fastLane = Math.floor(Math.random() * 3);
  const p: Plaza = {
    s,
    index,
    fastLane,
    paid: false,
    barriers: LANES.map(() => ({ open: 0, want: false, holder: null, closeAfterS: 0 })),
  };
  // Queues in the two cash lanes.
  for (let li = 0; li < 3; li++) {
    if (li === fastLane) continue;
    const n = 2 + Math.floor(Math.random() * 3);
    let back = s - 0.8;
    for (let k = 0; k < n; k++) {
      const type = pick(VEHICLE_TYPES.filter((t) => t !== "lorry" || k > 0));
      const L = VEHICLES[type].L;
      const car = makeCar(type, back - L / 2, LANES[li], 1, 0);
      car.queued = true;
      sim.cars.push(car);
      back -= L + 2.4;
    }
  }
  return p;
}

function laneFree(laneX: number, sFrom: number, sTo: number, except?: Car) {
  for (const c of sim.cars) {
    if (c === except || c.dir !== 1) continue;
    if (Math.abs(c.x - laneX) < 2.2 && c.s + VEHICLES[c.type].L / 2 > sFrom && c.s - VEHICLES[c.type].L / 2 < sTo) return false;
  }
  const cab = drive.x + CAB_OFFSET_X;
  if (Math.abs(cab - laneX) < 2.4 && drive.dist + TRUCK_FRONT > sFrom && drive.dist - TRUCK_REAR < sTo) return false;
  return true;
}

function inTollZone(s: number, margin = 0) {
  for (const p of sim.plazas) if (s > p.s - ISLAND_START - margin && s < p.s + ISLAND_END + margin) return p;
  return null;
}

function markWorldChanged() {
  bumpWorld();
}

function startPickup() {
  sim.sites = sim.sites.filter((s) => s.kind !== "pickup");
  sim.sites.push({ kind: "pickup", s: drive.dist + PICKUP_AHEAD });
  sim.job = "toPickup";
  sim.load = 0;
  markWorldChanged();
}

function clearRun() {
  sim.plazas = [];
  sim.sites = [];
  sim.cars = sim.cars.filter((c) => !c.queued);
  sim.load = 0;
  markWorldChanged();
}

function startDelivery(pickupS: number) {
  sim.job = "delivering";
  sim.timeLeft = TIME_LIMIT;
  sim.load = 0;
  const t1 = pickupS + TOLL1_AFTER_PICKUP;
  const t2 = t1 + TOLL_GAP;
  sim.plazas = [makePlaza(t1, 1), makePlaza(t2, 2)];
  sim.sites.push({ kind: "drop", s: t2 + DROP_AFTER_TOLL2 });
  useGame.setState({ tollsPaid: 0 });
  toast(`Loaded! Deliver in ${TIME_LIMIT} seconds`, "good", 2600);
  markWorldChanged();
}

function finishDelivery() {
  sim.streak += 1;
  sim.savedTotal += sim.timeLeft;
  saveBest(sim.streak);
  useGame.setState((g) => ({ lastSaved: sim.timeLeft, delivered: g.delivered + 1 }));
  beep(880, 0.12);
  window.setTimeout(() => beep(1320, 0.16), 130);
  // Next job straight away (the old drop shop stays until it's behind us).
  sim.sites = sim.sites.filter((s) => s.kind !== "pickup");
  sim.sites.push({ kind: "pickup", s: drive.dist + NEXT_PICKUP_AFTER_DROP });
  sim.job = "toPickup";
  sim.load = 0;
  markWorldChanged();
}

export default function GameSim() {
  const hudAcc = useRef(0);
  const bumpToastAt = useRef(0);
  const warned = useRef(new Set<number>());

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const now = state.clock.elapsedTime;
    const { phase, speed: ambientMul } = useNightRun.getState();
    const cruising = phase === "cruising";

    // ---------- HUD commands ----------
    const cmd = commands.pending;
    commands.pending = null;
    if (cmd === "start" && (sim.job === "idle" || sim.job === "late")) {
      if (sim.job === "late") clearRun();
      sim.streak = sim.job === "late" ? 0 : sim.streak;
      startPickup();
    } else if (cmd === "stop" && (sim.job === "toPickup" || sim.job === "loading")) {
      sim.sites = sim.sites.filter((s) => s.kind !== "pickup");
      sim.job = "idle";
      sim.load = 0;
      markWorldChanged();
    } else if (cmd === "retry" && sim.job === "late") {
      clearRun();
      sim.streak = 0;
      startPickup();
    } else if (cmd === "quit") {
      clearRun();
      sim.streak = 0;
      sim.job = "idle";
    }

    // ---------- Truck longitudinal ----------
    let v = drive.speed;
    const jobActive = sim.job !== "idle" && sim.job !== "late";
    if (cruising) {
      if (input.throttle > 0) {
        if (v < -0.05) v = Math.min(0, v + 14 * dt);
        else v += (TOP_SPEED * ambientMul - v) * Math.min(1, dt * 0.75);
      } else if (input.brake > 0) {
        if (v > 0.05) v = Math.max(0, v - 14 * dt);
        else if (input.reverse > 0) v = Math.max(-REVERSE_TOP, v - 5 * dt);
        else if (v < -0.05) v = Math.min(0, v + 14 * dt);
        else v = 0;
      } else {
        const drag = 2.5 * dt;
        v = Math.abs(v) <= drag ? 0 : v - Math.sign(v) * drag;
      }
    } else {
      // Tablet open / intro: gentle ambient roll on the open road,
      // full stop while a delivery is running (the clock is paused too).
      const target = (phase === "reading" || phase === "returning") && !jobActive ? 9 * ambientMul : 0;
      v += (target - v) * Math.min(1, dt * 0.9);
    }

    // ---------- Truck lateral ----------
    const bend = curveUniform.value;
    let x = drive.x;
    let lat = 0;
    if (cruising) {
      const k = Math.min(Math.abs(v) / 6, 1);
      lat = input.steer * LAT_SPEED * k;
      if (v > 0) lat += -bend * v * v * DRIFT;
    }
    x += lat * dt;
    let dist = drive.dist + v * dt;

    // Lateral limits: open road, lay-by tapers.
    let xMin = ROAD_GROUP_MIN;
    const xMax = ROAD_GROUP_MAX;
    for (const site of sim.sites) {
      const a = site.s - LAYBY_BEFORE;
      const b = site.s + LAYBY_AFTER;
      const sFront = dist + TRUCK_FRONT;
      const sRear = dist - TRUCK_REAR;
      if (sFront > a && sRear < b) {
        // Deepest the truck can sit given where its front/rear are.
        const enter = Math.min(1, Math.max(0, (sRear - a) / TAPER));
        const exit = Math.min(1, Math.max(0, (b - sFront) / TAPER));
        const depth = Math.min(enter, exit);
        const laybyMin = LAYBY_LEFT + TRUCK_HALF_W + 0.1 - CAB_OFFSET_X;
        xMin = Math.min(xMin, ROAD_GROUP_MIN + (laybyMin - ROAD_GROUP_MIN) * depth);
      }
    }
    let scraping = false;
    if (x < xMin) {
      if (lat < 0 || drive.x <= xMin + 0.01) scraping = true;
      x = xMin;
    }
    if (x > xMax) {
      if (lat > 0) scraping = true;
      x = xMax;
    }

    // Toll islands + barriers.
    for (const p of sim.plazas) {
      const islandA = p.s - ISLAND_START;
      const islandB = p.s + ISLAND_END;
      const frontPrev = drive.dist + TRUCK_FRONT;
      const front = dist + TRUCK_FRONT;
      const rear = dist - TRUCK_REAR;
      const cab = x + CAB_OFFSET_X;
      const li = nearestLane(cab);
      const off = cab - LANES[li];
      if (front > islandA && rear < islandB) {
        if (frontPrev <= islandA && Math.abs(off) > LANE_FUNNEL) {
          // Nosed into the island head.
          dist = islandA - TRUCK_FRONT - 0.05;
          if (v > 2) hit(now, "Hit the toll island!");
          v = Math.min(0, -v * 0.1);
        } else if (Math.abs(off) > LANE_BAND) {
          x = LANES[li] + Math.sign(off) * LANE_BAND - CAB_OFFSET_X;
          if (Math.abs(off) > LANE_BAND + 0.05) scraping = true;
        }
      }
      // Barrier for this lane.
      const b = p.barriers[li];
      if (b.open < 0.9 && frontPrev <= p.s && dist + TRUCK_FRONT > p.s) {
        dist = p.s - TRUCK_FRONT - 0.05;
        if (v > 2) hit(now, "Wait for the barrier to lift!");
        v = Math.min(0, -v * 0.1);
      }
      // FASTag read.
      const toBarrier = p.s - (dist + TRUCK_FRONT);
      if (toBarrier > -1 && toBarrier < FASTAG_READ_DIST && b.holder === null && Math.abs(off) <= LANE_BAND + 0.05) {
        const carAhead = sim.cars.some(
          (c) => c.dir === 1 && Math.abs(c.x - LANES[li]) < 1.2 && c.s > dist && c.s - VEHICLES[c.type].L / 2 < p.s
        );
        if (!carAhead && Math.abs(v) <= FASTAG_READ_SPEED) {
          b.holder = "truck";
          b.want = true;
          b.closeAfterS = p.s + 1;
          if (!p.paid) {
            p.paid = true;
            useGame.setState((g) => ({ tollsPaid: g.tollsPaid + 1 }));
            toast("FASTag ✓  ₹85 paid", "good");
            beep(1560, 0.09);
            window.setTimeout(() => beep(1560, 0.09), 120);
          }
        }
      }
      if (toBarrier > 0 && toBarrier < 90 && v > FASTAG_READ_SPEED + 3 && !warned.current.has(p.s)) {
        warned.current.add(p.s);
        toast("Toll ahead · slow to 30 km/h for FASTag", "warn", 2600);
      }
    }

    // ---------- Truck ↔ car collisions ----------
    const cab = x + CAB_OFFSET_X;
    for (const c of sim.cars) {
      if (c.dir !== 1) continue;
      const spec = VEHICLES[c.type];
      const dx = c.x - cab;
      const latPen = spec.W / 2 + TRUCK_HALF_W - Math.abs(dx);
      if (latPen <= 0) continue;
      const ahead = c.s > dist;
      const longPen = ahead ? dist + TRUCK_FRONT - (c.s - spec.L / 2) : c.s + spec.L / 2 - (dist - TRUCK_REAR);
      if (longPen <= 0) continue;
      const locked = !!inTollZone(c.s) || c.queued;
      if (latPen < longPen && latPen < 0.9) {
        // Side swipe: shove sideways.
        const dir = dx >= 0 ? 1 : -1;
        if (!locked) {
          c.x += dir * latPen;
          c.vx = dir * 3.5;
          c.knock = 0.9;
        } else {
          x -= dir * latPen;
        }
        v *= 0.92;
        if (Math.abs(v) > 3) hit(now, "Scraped a car!");
      } else if (ahead) {
        const before = v;
        if (!locked) {
          c.s += longPen + 0.05;
          c.v = Math.max(c.v, before * 0.85);
          const dir = Math.abs(dx) > 0.1 ? Math.sign(dx) : Math.random() < 0.5 ? -1 : 1;
          c.vx = dir * 4.5;
          c.knock = 1.2;
          v = before * 0.55;
        } else {
          dist -= longPen + 0.02;
          v = Math.min(0, -before * 0.1);
        }
        if (before > 3) hit(now, "Bump!");
      } else {
        // Reversed into something.
        if (!locked) {
          c.s -= longPen + 0.05;
          c.vx = (dx >= 0 ? 1 : -1) * 3;
          c.knock = 1;
        } else {
          dist += longPen + 0.02;
        }
        v = Math.max(0, -v * 0.1);
        hit(now, "Bump!");
      }
    }

    // Commit truck state.
    drive.dz = dist - drive.dist;
    drive.dist = dist;
    drive.speed = v;
    drive.x = x;
    const yaw = -(lat - (v > 0 ? -bend * v * v * DRIFT : 0)) * 0.05 * Math.sign(v || 1) - bend * LOOK_INTO_BEND;
    drive.yaw += (yaw - drive.yaw) * Math.min(1, dt * 4);
    sim.scraping = scraping && Math.abs(v) > 0.5;
    if (sim.scraping) {
      // Rubbing the kerb bleeds speed until you steer off it.
      drive.speed = v - v * Math.min(1, 1.8 * dt);
      if (now - bumpToastAt.current > 2.5 && Math.abs(v) > 6) {
        bumpToastAt.current = now;
        toast("Scraping the edge!", "warn", 1400);
      }
    }
    sim.bump = Math.max(0, sim.bump - dt);
    advanceCurve(drive.dz > 0 ? drive.dz : 0);

    function hit(t: number, msg: string) {
      sim.bump = 0.45;
      beep(110, 0.18, "square");
      if (t - bumpToastAt.current > 1.2) {
        bumpToastAt.current = t;
        toast(msg, "warn", 1500);
      }
    }

    // ---------- Traffic ----------
    // Traffic freezes with the clock while the tablet is open mid-job.
    if (cruising || ((phase === "reading" || phase === "returning") && !jobActive)) updateTraffic(dt);

    // ---------- Barriers ----------
    for (const p of sim.plazas) {
      for (const b of p.barriers) {
        if (b.holder === "truck") {
          if (drive.dist - TRUCK_REAR > b.closeAfterS) {
            b.holder = null;
            b.want = false;
          }
        } else if (typeof b.holder === "number") {
          const car = sim.cars.find((c) => c.id === b.holder);
          if (!car || car.s - VEHICLES[car.type].L / 2 > b.closeAfterS) {
            b.holder = null;
            b.want = false;
          }
        }
        const target = b.want ? 1 : 0;
        b.open += Math.sign(target - b.open) * Math.min(Math.abs(target - b.open), dt * 1.8);
      }
    }

    // ---------- Job ----------
    const site = activeSite();
    let inBay = false;
    let nearBay = false;
    if (site) {
      const cabX = drive.x + CAB_OFFSET_X;
      inBay =
        cabX - TRUCK_HALF_W >= BAY_X - BAY_W / 2 - 0.15 &&
        cabX + TRUCK_HALF_W <= BAY_X + BAY_W / 2 + 0.15 &&
        drive.dist - TRUCK_REAR >= site.s - BAY_L / 2 - 0.35 &&
        drive.dist + TRUCK_FRONT <= site.s + BAY_L / 2 + 0.35;
      nearBay = Math.abs(site.s - drive.dist) < 70;
    }
    const stopped = Math.abs(drive.speed) < 0.35;
    if (cruising) {
      if (sim.job === "toPickup" && inBay && stopped) sim.job = "loading";
      if (sim.job === "loading") {
        if (!(inBay && stopped)) {
          sim.job = "toPickup";
          sim.load = 0;
        } else {
          sim.load += dt / LOAD_TIME;
          if (sim.load >= 1 && site) startDelivery(site.s);
        }
      }
      if (sim.job === "delivering") {
        sim.timeLeft -= dt;
        if (inBay && stopped) sim.job = "unloading";
        if (sim.timeLeft <= 0) {
          sim.timeLeft = 0;
          sim.job = "late";
          saveBest(sim.streak);
          beep(196, 0.35, "sawtooth");
        }
      }
      if (sim.job === "unloading") {
        if (!(inBay && stopped)) {
          sim.job = "delivering";
          sim.load = 0;
        } else {
          sim.load += dt / LOAD_TIME;
          if (sim.load >= 1) finishDelivery();
        }
      }
    }
    sim.inBay = inBay;
    sim.nearBay = nearBay;

    // ---------- Cleanup ----------
    const before = sim.plazas.length + sim.sites.length;
    sim.plazas = sim.plazas.filter((p) => p.s > drive.dist - 160);
    const target = activeSite();
    sim.sites = sim.sites.filter((s) => s === target || s.s > drive.dist - 160);
    if (sim.plazas.length + sim.sites.length !== before) markWorldChanged();

    // ---------- HUD snapshot (~10 Hz) ----------
    hudAcc.current += rawDelta;
    if (hudAcc.current > 0.1) {
      hudAcc.current = 0;
      useGame.setState({
        job: sim.job,
        timeLeft: sim.timeLeft,
        distToTarget: target ? Math.max(0, Math.round(target.s - drive.dist)) : -1,
        load: sim.load,
        inBay,
        nearBay,
        streak: sim.streak,
      });
    }
  });

  return null;
}

// ---------------------------------------------------------------
function updateTraffic(dt: number) {
  const dist = drive.dist;
  const cab = drive.x + CAB_OFFSET_X;

  // Spawn
  {
    const same = sim.cars.filter((c) => c.dir === 1 && !c.queued && c.s > dist - 20).length;
    if (same < 6 && Math.random() < dt * 1.5) {
      const s = dist + rand(250, 330);
      if (!inTollZone(s, 60)) {
        let lanes = [0, 1, 2];
        for (const p of sim.plazas) if (p.s > s && p.s - s < 400) lanes = lanes.filter((l) => l !== p.fastLane);
        const li = pick(lanes);
        if (laneFree(LANES[li], s - 25, s + 25)) sim.cars.push(makeCar(trafficType(), s, LANES[li], 1));
      }
    }
    const opp = sim.cars.filter((c) => c.dir === -1).length;
    if (opp < 3 && Math.random() < dt * 0.6) {
      const s = dist + rand(300, 360);
      const lx = pick(OPP_LANES);
      if (!sim.cars.some((c) => c.dir === -1 && c.x === lx && Math.abs(c.s - s) < 30)) {
        sim.cars.push(makeCar(pick(VEHICLE_TYPES), s, lx, -1));
      }
    }
  }

  for (const c of sim.cars) {
    const spec = VEHICLES[c.type];
    if (c.dir === -1) {
      c.s -= c.v * dt;
      continue;
    }
    // Leader: car, truck, or a closed barrier.
    let gap = Infinity;
    let leaderV = c.vmax;
    for (const o of sim.cars) {
      if (o === c || o.dir !== 1 || o.s <= c.s) continue;
      const os = VEHICLES[o.type];
      if (Math.abs(o.x - c.x) > (os.W + spec.W) / 2 + 0.3) continue;
      const g = o.s - os.L / 2 - (c.s + spec.L / 2);
      if (g < gap) {
        gap = g;
        leaderV = o.v;
      }
    }
    if (Math.abs(cab - c.x) < spec.W / 2 + TRUCK_HALF_W + 0.3 && dist - TRUCK_REAR > c.s) {
      const g = dist - TRUCK_REAR - (c.s + spec.L / 2);
      if (g < gap) {
        gap = g;
        leaderV = Math.max(0, drive.speed);
      }
    }
    const li = nearestLane(c.x);
    let atBarrier: { p: Plaza; li: number; g: number } | null = null;
    for (const p of sim.plazas) {
      if (c.s > p.s || p.s - c.s > 220) continue;
      const b = p.barriers[li];
      const g = p.s - 0.6 - (c.s + spec.L / 2);
      if (b.open < 0.95 || b.holder !== c.id) {
        if (g < gap) {
          gap = g;
          leaderV = 0;
        }
        if (g < 1.4) atBarrier = { p, li, g };
      }
    }
    // Toll service: pay, barrier lifts, go.
    if (atBarrier && c.v < 0.6) {
      const b = atBarrier.p.barriers[atBarrier.li];
      if (b.holder === null) {
        c.wait += dt;
        const service = atBarrier.li === atBarrier.p.fastLane ? 0.5 : 1.8;
        if (c.wait > service) {
          b.holder = c.id;
          b.want = true;
          b.closeAfterS = atBarrier.p.s + 1;
          c.wait = 0;
        }
      }
    }

    // Lane change around slow leaders (not near tolls).
    if (c.knock <= 0 && !c.queued && gap < 22 && leaderV < c.v - 2 && !inTollZone(c.s, 200) && Math.random() < dt * 2) {
      const opts = [li - 1, li + 1].filter((l) => l >= 0 && l < 3);
      for (const l of opts.sort(() => Math.random() - 0.5)) {
        if (laneFree(LANES[l], c.s - 14, c.s + 26, c)) {
          c.laneX = LANES[l];
          break;
        }
      }
    }

    // Speed control (simple follow model).
    const target = gap === Infinity ? c.vmax : Math.max(0, Math.min(c.vmax, leaderV + (gap - 5) * 0.7));
    if (gap < 0.8) c.v = Math.min(c.v, Math.max(0, leaderV));
    if (target > c.v) c.v += Math.min(3.2 * dt, target - c.v);
    else c.v -= Math.min(10 * dt, c.v - target);
    if (c.v > 0.5) c.queued = false;

    // Lateral.
    if (c.knock > 0) {
      c.knock -= dt;
      c.x += c.vx * dt;
      c.vx *= 1 - Math.min(1, 3 * dt);
      if (c.knock <= 0) c.laneX = LANES[nearestLane(c.x)];
    } else {
      const d = c.laneX - c.x;
      c.x += Math.sign(d) * Math.min(Math.abs(d), 2 * dt);
    }
    if (inTollZone(c.s)) c.x = LANES[li];
    c.x = Math.min(CAR_X_MAX, Math.max(CAR_X_MIN, c.x));
    c.s += c.v * dt;
  }

  sim.cars = sim.cars.filter((c) =>
    c.dir === 1 ? c.s > dist - 60 && c.s < dist + 480 : c.s > dist - 40
  );
}

// Dev-only handle for automated play-tests (never in production builds).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __nightrun: unknown }).__nightrun = { sim, drive };
}
