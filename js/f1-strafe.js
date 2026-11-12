// ================= REAL-PLAYER STRAFING & DODGING =================
// In melee range bots now move like players: A/D strafes that switch at random moments, strafe-jumps,
// side-stepping when your crosshair is on them and your bar is charged, backing off to space while their own
// bar recharges, and zig-zagging when you draw a bow.
function lookingAt(a, b, deg) {
  const d = a.look(), vx = b.x - a.x, vy = b.y + 1 - (a.y + a.eyeH), vz = b.z - a.z, L = Math.hypot(vx, vy, vz) || 1;
  return (d[0] * vx + d[1] * vy + d[2] * vz) / L > Math.cos(deg * DEG);
}
const _botTickStrafe = botTick;
botTick = function (b) {
  _botTickStrafe(b);
  const h = b.hum, X = b.ai && b.ai.x, t = b.ai && b.ai.t;
  if (!h || b.dead || !t || t.dead || game.countdown > 0 || b.inWeb || b.stunT > tick || b.using === 'eat') return;
  if (X && X.plan !== 'fight' && X.plan !== 'kite') return;
  if (b.ai.mode === 'heal') return;
  const d = Math.hypot(t.x - b.x, t.z - b.z);
  if (d > 9) return;
  // pick / switch strafe direction at human-ish random intervals
  if (!h.sDir || --h.sT <= 0) { h.sDir = h.sDir ? -h.sDir : (Math.random() < 0.5 ? -1 : 1); h.sT = 6 + ((Math.random() * 18) | 0); }
  let s = h.sDir * (0.75 + 0.25 * Math.random());
  let f = b.in.f, jump = b.in.jump;
  const threat = lookingAt(t, b, 14) && (COMBAT18 || cooldown(t) > 0.8) && d < 4.5;
  if (threat && Math.random() < 0.25 + 0.45 * b.skill) {          // dodge: hard side-step, flip direction
    if (!h.dodged) { h.sDir = -h.sDir; h.sT = 5 + ((Math.random() * 6) | 0); h.dodged = true; }
    s = h.sDir; if (d < 2.6) f = -0.6;
  } else h.dodged = false;
  if (!COMBAT18 && cooldown(b) < 0.6 && d < 3) f = Math.min(f, -0.4);    // spacing while recharging
  if (t.using === 'bow' && d > 5) { if (--h.zz <= 0 || !h.zz) { h.sDir = -h.sDir; h.zz = 4 + ((Math.random() * 6) | 0); } s = h.sDir; }
  if (b.onGround && d > 2.5 && d < 6 && Math.random() < 0.025) jump = true; // strafe-jump
  // don't strafe off a ledge
  const yr = b.yaw * DEG, mx = s * Math.cos(yr) - f * Math.sin(yr), mz = f * Math.cos(yr) + s * Math.sin(yr), ml = Math.hypot(mx, mz);
  if (ml > 0.01 && b.onGround && !hasGroundBelow(b.x + mx / ml * 0.8, b.y, b.z + mz / ml * 0.8, 3)) { h.sDir = -h.sDir; s = -s * 0.5; }
  b.in = { f, s, jump };
  if (f < 0.8) b.sprinting = false;
};
