// ================= CLASSIC BLOCK-GAME ANIMATION PASS =================
// Third person: head turns on its own (body follows), big distance-driven leg/arm swing, idle arm sway,
// attack swing with a body twist, a proper sneak pose, held-item use poses kept.
// First person: view bobbing with camera roll, stronger hand bob. Toggle: Settings -> "View bobbing".
if (CFG.viewBob === undefined) CFG.viewBob = true; DEF.viewBob = true;
let _mcAnimLast = performance.now();
const _updateModelsMCAnim = updateModels;
updateModels = function (alpha) {
  _updateModelsMCAnim(alpha);
  const now = performance.now(), dt = Math.min(0.1, (now - _mcAnimLast) / 1000); _mcAnimLast = now;
  if ((typeof killcam !== 'undefined' && killcam) || (typeof RP !== 'undefined' && RP)) return;   // replays pose the models themselves
  const age = now / 50;                                   // "ticks" for the idle sway
  for (const m of mobs) {
    const pr = m.parts; if (!pr || m.dead) { if (pr && pr.body) { pr.body.rotation.y = 0; pr.body.position.z = 0; } continue; }
    const yaw = m.isPlayer && !m.remote ? m.yaw : m.pyaw + wrapDeg(m.yaw - m.pyaw) * alpha;
    const speed = Math.hypot(m.vx, m.vz), moving = speed > 0.03;

    // ---- 1) body follows the head: turn your head freely up to 50 deg, the body catches up when you move or swing ----
    if (m._bodyYaw === undefined) m._bodyYaw = yaw;
    let diff = wrapDeg(yaw - m._bodyYaw);
    if (moving || m.swingT > 0 || m.using || m.gliding) m._bodyYaw += diff * Math.min(1, dt * 14);
    else if (Math.abs(diff) > 50) m._bodyYaw += diff - Math.sign(diff) * 50;
    diff = clamp(wrapDeg(yaw - m._bodyYaw), -75, 75);
    pr.root.rotation.y = -m._bodyYaw * DEG;
    pr.head.rotation.order = 'YXZ';
    pr.head.rotation.y = -diff * DEG;

    // ---- 2) walk cycle: legs swing wide, arms swing opposite (phase follows distance walked) ----
    const amp = m.limbAmp, ph = m.limb * 0.6662;
    const armBusy = m.swingT > 0 || m.using, sneak = m.sneaking && !m.gliding;
    const legSw = Math.cos(ph) * 1.4 * amp * (sneak ? 0.6 : 1), armSw = Math.cos(ph + Math.PI) * 1.0 * amp;
    pr.legR.rotation.x = legSw; pr.legL.rotation.x = -legSw;
    pr.legR.rotation.y = 0; pr.legL.rotation.y = 0;
    if (!armBusy) { pr.armR.rotation.x = armSw; pr.armR.rotation.z = 0; pr.armR.rotation.y = 0; }
    if (!m.shieldUp && m.using !== 'bow') { pr.armL.rotation.x = -armSw; pr.armL.rotation.z = 0; }

    // ---- 3) idle sway: arms breathe in and out a little, always ----
    const sz = Math.cos(age * 0.09 + m.id) * 0.05 + 0.05, sx = Math.sin(age * 0.067 + m.id) * 0.05;
    if (!armBusy) { pr.armR.rotation.z -= sz; pr.armR.rotation.x += sx; }
    if (!m.shieldUp && m.using !== 'bow') { pr.armL.rotation.z += sz; pr.armL.rotation.x -= sx; }

    // ---- 4) attack swing: only the arm swings ----
    let twist = 0;
    if (m.swingT > 0 && !m.using) {
      const p = clamp(1 - (m.swingT - alpha) / 6, 0, 1);
      twist = 0;   // arm-only swing: the torso, head and legs stay still
      const f = 1 - Math.pow(1 - p, 4), a = Math.sin(f * Math.PI), b = Math.sin(p * Math.PI) * -(pr.head.rotation.x - 0.7) * 0.75;
      pr.armR.rotation.x = armSw * 0.3 - (a * 1.2 + b);
      pr.armR.rotation.y = twist * 2;
      pr.armR.rotation.z = Math.sin(p * Math.PI) * -0.4;
      if (!m.shieldUp) pr.armL.rotation.x += twist;       // off arm rocks back with the twist
    }
    pr.body.rotation.y = twist;
    pr.head.rotation.y -= twist; pr.legR.rotation.y = -twist; pr.legL.rotation.y = -twist;

    // ---- 5) sneak: torso leans, arms hang forward, legs stay planted ----
    if (sneak) {
      pr.body.rotation.x = 0.5; pr.body.position.z = -5 * PX;
      pr.head.rotation.x -= 0.15;                         // (base pose already lifts the head 0.35)
      pr.legR.rotation.x -= 0.5; pr.legL.rotation.x -= 0.5;
      if (!armBusy) pr.armR.rotation.x -= 0.1;
      if (!m.shieldUp) pr.armL.rotation.x -= 0.1;
    } else pr.body.position.z = 0;

    // ---- 6) elytra: the body lies flat along the flight, arms and legs trail ----
    m._glideRot = lerp(m._glideRot || 0, m.gliding ? 1.3 + clamp(m.pitch, -60, 60) * DEG * 0.6 : 0, Math.min(1, dt * 10));
    if (m._glideRot > 0.02) {
      const g = m._glideRot, k = Math.min(1, g);
      pr.body.rotation.x += g; pr.head.rotation.x -= g * 0.75;
      pr.legR.rotation.x *= 1 - k; pr.legL.rotation.x *= 1 - k;
      if (!armBusy) { pr.armR.rotation.x *= 1 - k; pr.armR.rotation.z = -0.12 * k; }
      pr.armL.rotation.x *= 1 - k; pr.armL.rotation.z = 0.12 * k;
    }

    if (pr.shieldPivot) pr.shieldPivot.rotation.x = -pr.armL.rotation.x;
  }
};

// ---------- first person: view bobbing (camera sways and rolls with your steps) ----------
const _updateCameraMCAnim = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraMCAnim(alpha, dt);
  const p = player;
  if (!CFG.viewBob || state !== 'play' || !p || p.dead || thirdPerson || (typeof killcam !== 'undefined' && killcam) || (typeof RP !== 'undefined' && RP) || (game && game.spec && p.dead)) return;
  if (!p.onGround || p.gliding) { p._bobAmt = lerp(p._bobAmt || 0, 0, 0.2); } else p._bobAmt = lerp(p._bobAmt || 0, p.limbAmp, 0.2);
  const a = p._bobAmt || 0; if (a < 0.01) return;
  const ph = p.limb * 0.6662 * 0.5;
  camera.rotation.z += Math.sin(ph) * a * 0.035;                    // roll side to side
  camera.rotation.x -= Math.abs(Math.cos(ph - 0.2) * a) * 0.03;     // tiny dip on each step
  const yawR = p.yaw * DEG, sway = Math.sin(ph) * a * 0.045;
  camera.position.x += Math.cos(yawR) * sway; camera.position.z += Math.sin(yawR) * sway;
  // the hand bobs more than the old version
  const o = vmItem.visible ? vmItem : vmArm;
  o.position.x += Math.sin(ph) * a * 0.035; o.position.y -= Math.abs(Math.cos(ph)) * a * 0.03;
};
(function () {
  const rows = MENU[2].rows, i = rows.findIndex(x => x[0] === 'fov');
  rows.splice(i + 1, 0, ['viewBob', 'View bobbing (camera sways as you walk)', 'tg']);
})();
buildMenu();

// ================= HEAVIER CHARACTERS =================
// Jumps reach the same height, but you come down faster (less floaty), and landings have weight:
// the camera dips, the body sinks for a moment, and there's a thud that scales with how hard you landed.
// Toggle: Settings -> "Heavy characters".
if (CFG.heavy === undefined) CFG.heavy = true; DEF.heavy = true;
const _physicsTickHeavy = physicsTick;
physicsTick = function (e) {
  const was = e.onGround, vy0 = e.vy;
  _physicsTickHeavy(e);
  if (!CFG.heavy || e.dead) return;
  // extra pull only on the way down (never while gliding, swimming, webbed or stunned mid-combo launch)
  if (!e.onGround && e.vy < 0 && !e.gliding && !e.inWater && !e.inWeb) e.vy -= 0.022;
  if (!was && e.onGround && vy0 < -0.25 && !e.inWater) {
    e._landT = tick; e._landK = clamp((-vy0 - 0.2) * 1.5, 0.2, 1);
    if (e._landK > 0.35) sfx('step', e.x, e.y, e.z, 0.6 + e._landK);
  }
};
const _updateCameraHeavy = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraHeavy(alpha, dt);
  const p = player;
  if (!CFG.heavy || state !== 'play' || !p || p.dead || thirdPerson || p._landT === undefined || (typeof killcam !== 'undefined' && killcam) || (typeof RP !== 'undefined' && RP)) return;
  const t = (tick - p._landT + alpha) / 7; if (t < 0 || t >= 1) return;
  const dip = Math.sin(t * Math.PI) * (1 - t * 0.5) * 0.16 * p._landK;
  camera.position.y -= dip; camera.rotation.x -= dip * 0.25;
  const o = vmItem.visible ? vmItem : vmArm; o.position.y -= dip * 0.5;
};
const _updateModelsHeavy = updateModels;
updateModels = function (alpha) {
  _updateModelsHeavy(alpha);
  for (const m of mobs) {
    const pr = m.parts; if (!pr || !pr.body) continue;
    let dip = 0;
    if (CFG.heavy && !m.dead && m._landT !== undefined) { const t = (tick - m._landT + alpha) / 7; if (t >= 0 && t < 1) dip = Math.sin(t * Math.PI) * 0.1 * m._landK; }
    pr.body.position.y = -dip;
    if (dip > 0) { pr.legR.rotation.x += dip * 2.5; pr.legL.rotation.x -= dip * 2.5; }   // legs splay a little as they absorb the landing
  }
};
(function () {
  const rows = MENU[2].rows, i = rows.findIndex(x => x[0] === 'viewBob');
  rows.splice(i + 1, 0, ['heavy', 'Heavy characters (fall faster, landings have weight)', 'tg']);
})();
buildMenu();
