// ================= SMARTER EATING =================
// Bots used to stop, crouch and munch a golden apple right in front of you (free kill). Now:
//  - they won't START eating while an enemy is within 6 blocks (they fight / pot / run first)
//  - if someone rushes them mid-bite (within 3.5 blocks) they cancel, pot if they can, and fight back
//  - while eating they keep backing away and strafing instead of crouching still
function nearestEnemy(b) {
  let best = null, bd = 1e9;
  for (const o of mobs) if (!o.dead && o.team !== b.team) { const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < bd) { bd = d; best = o; } }
  return { e: best, d: bd };
}
const _slotOfEat = Mob.prototype.slotOf;
Mob.prototype.slotOf = function (k) {
  if (k === 'gapple' && !this.isPlayer && this.using !== 'eat' && !this.dead && game && (tick < (this.noEatUntil || 0) || nearestEnemy(this).d < 6)) return -1;
  return _slotOfEat.call(this, k);
};
const _botTickEatSmart = botTick;
botTick = function (b) {
  _botTickEatSmart(b);
  if (b.using !== 'eat' || b.dead) return;
  const { e, d } = nearestEnemy(b);
  if (e && d < 3.5 && b.useT < 24) {
    // rushed: cancel the bite and deal with it
    b.using = null; b.useT = 0; b.noEatUntil = tick + 40;
    if (b.ai) { b.ai.mode = 'fight'; if (b.ai.weaponSlot >= 0) b.select(b.ai.weaponSlot); b.ai.t = e; }
    if (b.health < 12 && typeof throwPot === 'function') { b.pitch = 80; throwPot(b); }
    return;
  }
  // keep moving while eating: back away from the threat and strafe (no crouching)
  b.sneaking = false;
  if (e && d < 10) {
    const s = Math.sin(tick * 0.15 + b.id) > 0 ? 1 : -1;
    const toward = Math.atan2(-(e.x - b.x), e.z - b.z) / DEG;
    b.yaw += clamp(wrapDeg(toward - b.yaw), -20, 20);
    b.in = { f: -1, s, jump: false };
  }
};
