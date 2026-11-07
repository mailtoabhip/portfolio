const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../src/lib/cameraMotion.ts"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const context = { exports: {} };
vm.runInNewContext(output.outputText, context);
const { createSeatMotion, updateSeatMotion, dampFactor, roadRumble } = context.exports;

test("constant acceleration has the same response at 30, 60 and 144 FPS", () => {
  const responses = [30, 60, 144].map(fps => {
    const seat = createSeatMotion();
    updateSeatMotion(seat, 0, 1 / fps, true);
    for (let i = 1; i <= fps; i++) updateSeatMotion(seat, 4 * i / fps, 1 / fps, true);
    return seat.pitch;
  });
  assert.ok(Math.max(...responses) - Math.min(...responses) < 1e-12);
});

test("acceleration lifts gaze, braking dips it, impacts stay bounded", () => {
  for (const direction of [-1, 1]) {
    const seat = createSeatMotion();
    updateSeatMotion(seat, 0, 1 / 60, true);
    for (let i = 1; i <= 120; i++) updateSeatMotion(seat, direction * i * 10, 1 / 60, true);
    assert.equal(Math.sign(seat.pitch), direction);
    assert.ok(Math.abs(seat.pitch) <= Math.PI / 180);
  }
});

test("mount, pause, reduced motion and tab resume reset without a kick", () => {
  const seat = createSeatMotion();
  updateSeatMotion(seat, 22, 1 / 60, true);
  assert.equal(seat.pitch, 0);
  updateSeatMotion(seat, 0, 1 / 60, true);
  assert.ok(seat.pitch < 0);
  updateSeatMotion(seat, 0, 1 / 60, false);
  assert.equal(seat.pitch, 0);
  updateSeatMotion(seat, 22, 1 / 60, true);
  assert.equal(seat.pitch, 0);
  updateSeatMotion(seat, -5, 2, true);
  assert.equal(seat.pitch, 0);
});

test("road motion is bounded, spatial, reversible and still when stopped", () => {
  for (let distance = -200; distance <= 200; distance += 0.1) {
    assert.ok(Math.abs(roadRumble(distance, 100)) <= 0.006 + 1e-12);
    assert.equal(roadRumble(distance, 10), roadRumble(distance, -10));
    assert.ok(Math.abs(roadRumble(distance, 0)) === 0);
  }
  assert.equal(dampFactor(4, 0), 0);
  assert.ok(dampFactor(4, 1 / 60) > 0);
});
