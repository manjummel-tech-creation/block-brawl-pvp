// ================= WIND CHARGE = NO FALL DAMAGE · BOTS DON'T TOWER AFTER PEOPLE IN THE AIR =================
// Anyone launched by a wind charge takes no fall damage until they've landed.
const _windBurstSafe = windBurst;
windBurst = function (x, y, z, owner) {
  _windBurstSafe(x, y, z, owner);
  for (const m of mobs) {
    if (m.dead) continue;
    if (Math.hypot(m.x - x, m.y + 0.9 - y, m.z - z) <= 2.5) { m.windSafe = true; m.windSafeT = tick; }
  }
};
const _hurtSafe = hurt;
hurt = function (t, amount, src) {
  if (src && src.kind === 'fall' && t.windSafe) return false;
  return _hurtSafe(t, amount, src);
};
const _gameTickSafe = gameTick;
gameTick = function () {
  _gameTickSafe();
  for (const m of mobs) if (m.windSafe && (m.onGround || m.inWater) && tick > m.windSafeT + 2) m.windSafe = false;
};
// Bots only build up / tunnel up toward someone who is actually standing somewhere,
// not someone flying through the sky (wind charge, knockback, jumping).
const _choosePlanSky = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanSky(b, t, X);
  if (t && (p === 'pillar' || p === 'seek') && !t.onGround && !t.inWater && t.y > b.y + 1) { X.seek = null; return 'fight'; }
  return p;
};
const _botTickSky = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x, t = b.ai && b.ai.t;
  if (X && t && !t.dead && (X.plan === 'pillar' || X.plan === 'seek') && !t.onGround && !t.inWater && t.y > b.y + 1) { X.plan = 'fight'; X.seek = null; X.planT = 10; }
  _botTickSky(b);
};
