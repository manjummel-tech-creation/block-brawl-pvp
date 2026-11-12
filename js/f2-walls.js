// ================= BOTS STEER AROUND WALLS =================
// When a wall it can't jump blocks the way to its target, a bot looks left and right along the wall for the
// nearest gap/end, walks to it, then carries on. Strafes that would hit a wall flip direction.
function solidCol(x, z, y) { return isSolid(getB(x, y + 1, z)) || (isSolid(getB(x, y, z)) && isSolid(getB(x, y + 2, z))); }
function wallAt(px, pz, dx, dz, y, len) { // blocked along the line ahead, checking both shoulders (body is 0.6 wide)
  const nx = -dz, nz = dx, L = len || 0.8;
  for (let k = 0.4; k <= L + 0.01; k += 0.4) for (const o of [0, 0.3, -0.3]) if (solidCol(px + dx * k + nx * o, pz + dz * k + nz * o, y)) return true;
  return false;
}
const DIG_PLANS = { tunnel: 1, seek: 1, bridge: 1, pillar: 1, tower: 1, hide: 1 };
const _botTickWalls = botTick;
botTick = function (b) {
  _botTickWalls(b);
  if (b.dead || !b.ai || game.countdown > 0 || b.inWeb) return;
  const X = b.ai.x; if (X && DIG_PLANS[X.plan]) { b._detour = null; return; }
  const t = b.ai.t;
  let { f, s, jump } = b.in;
  const y = ffloor(b.y), yr = b.yaw * DEG, cs = Math.cos(yr), sn = Math.sin(yr);
  // strafing into a wall -> flip
  if (Math.abs(s) > 0.05) {
    const sx = s * cs, sz = s * sn, l = Math.hypot(sx, sz);
    if (wallAt(b.x, b.z, sx / l, sz / l, y)) { s = -s; if (b.hum) b.hum.sDir = -(b.hum.sDir || 1); }
  }
  // following a detour to a gap
  if (b._detour) {
    const D = b._detour; D.t--;
    const dx = D.x - b.x, dz = D.z - b.z, d = Math.hypot(dx, dz);
    if (d < 0.6 || D.t <= 0 || !t || t.dead) b._detour = null;
    else {
      // keep looking at the target (like a player) but move toward the gap using W/A/S/D
      const ux2 = dx / d, uz2 = dz / d, r = b.yaw * DEG;
      let ff = ux2 * -Math.sin(r) + uz2 * Math.cos(r), ss = ux2 * Math.cos(r) + uz2 * Math.sin(r);
      const m = Math.max(Math.abs(ff), Math.abs(ss)) || 1; ff /= m; ss /= m;
      b.in = { f: ff, s: ss, jump: b.hc && b.onGround && Math.random() < 0.2 };
      b.sprinting = ff >= 0.8;
      return;
    }
  }
  if (!t || t.dead || f <= 0.05 || !b.onGround) { b.in = { f, s, jump }; return; }
  // is the way toward the target blocked by a wall?
  const tx = t.x - b.x, tz = t.z - b.z, td = Math.hypot(tx, tz) || 1, ux = tx / td, uz = tz / td;
  const look = Math.min(td - 0.8, 3.2);
  if (td > 1.5 && wallAt(b.x, b.z, ux, uz, y, look)) {
    // scan along the wall both ways for the nearest opening
    const nx = -uz, nz = ux; let best = null;
    for (let k = 1; k <= 10 && !best; k++) for (const side of [1, -1]) {
      const px = b.x + nx * k * side, pz = b.z + nz * k * side;
      if (solidCol(px, pz, y)) continue;                      // can't stand there
      if (!hasGroundBelow(px, b.y, pz, 3)) continue;           // don't detour off a ledge
      if (!wallAt(px, pz, ux, uz, y, look + 0.8)) { best = { x: px + nx * 0.35 * side - ux * 0.35, z: pz + nz * 0.35 * side - uz * 0.35, t: 60 }; break; } // aim just past the end, off the wall face
    }
    if (best) { b._detour = best; return; }
  }
  b.in = { f, s, jump };
};
