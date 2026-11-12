// ================= CHARACTER ANIMATION (from the user's BlockyCharacter joint code) =================
// Skeleton already matches: torso 8x12x4 @ pivot 18, head 8x8x8 @ 24, arms 4x12x4 @ (±6, 22), legs 4x12x4 @ (±2, 12).
// This applies the sine-pendulum walk (arms & legs swing opposite, 0.6 rad) and the idle breathing animation.
// Physics stays the Minecraft-accurate engine (applyPhysics in the pasted code is a simplified version of it).
const _updateModelsAnim = updateModels;
updateModels = function (alpha) {
  _updateModelsAnim(alpha);
  const time = performance.now() / 1000;
  for (const m of mobs) {
    const pr = m.parts; if (!pr || m.dead) continue;
    const isMoving = Math.abs(m.vx) > 0.01 || Math.abs(m.vz) > 0.01;
    const sk = pr.skel || (pr.skel = { amp: 0 });
    sk.amp = lerp(sk.amp, isMoving ? Math.min(1, Math.hypot(m.vx, m.vz) * 5) : 0, 0.2);
    const swing = Math.sin(m.limb * 0.6662);          // phase follows distance walked, so feet don't slide
    const armBusy = m.swingT > 0 || m.using;           // keep attack / bow / eat / block poses
    if (sk.amp > 0.02) {
      pr.legL.rotation.x = swing * 0.6 * sk.amp;
      pr.legR.rotation.x = -swing * 0.6 * sk.amp;
      if (!armBusy) pr.armR.rotation.x = swing * 0.6 * sk.amp;
      if (!m.shieldUp) pr.armL.rotation.x = -swing * 0.6 * sk.amp;
    } else {
      // idle breathing
      pr.legL.rotation.x = 0; pr.legR.rotation.x = 0;
      const b = Math.sin(time * 2 + m.id) * 0.05;
      if (!armBusy) { pr.armR.rotation.x = -b; pr.armR.rotation.z = -0.03 - Math.abs(b) * 0.5; }
      if (!m.shieldUp) { pr.armL.rotation.x = b; pr.armL.rotation.z = 0.03 + Math.abs(b) * 0.5; }
    }
    if (pr.shieldPivot) pr.shieldPivot.rotation.x = -pr.armL.rotation.x;
  }
};
