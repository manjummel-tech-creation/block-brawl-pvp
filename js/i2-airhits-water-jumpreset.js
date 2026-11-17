// ================= NO HITS WHILE KNOCKED INTO THE AIR (MACE EXCEPTED) =================
// If an opponent's hit knocks you up, you can't land a sword/axe/fist hit until you touch the ground again,
// so you can't fight back mid-combo from the air. Normal jumps (crit hits) still work, and the mace always works.
const _attackGroundOnly = attack;
attack = function (a, t, reach) {
  if (a._kbAirT && !a.onGround && !(a.held && a.held.k === 'mace')) return false;
  const r = _attackGroundOnly(a, t, reach);
  if (r && t && !t.dead && t._jrHitT !== tick) t._kbAirT = tick;   // knocked back (and no jump reset): mark them until they land
  return r;
};
const _gameTickKbAir = gameTick;
gameTick = function () {
  _gameTickKbAir();
  for (const m of mobs) if (m._kbAirT && (m.dead || m.inWater || (m.onGround && tick - m._kbAirT > 3))) m._kbAirT = 0;
};

// ================= BOTS CAN'T SPAM WATER BUCKETS =================
// Every way a bot pours water (web clean-up, fall clutch, head-web fix...) shares one cooldown:
// after pouring, a bot must wait 10 s before it can pour water again.
const BOT_WATER_CD = 200;                                    // ticks (20 per second)
let _waterBot = null;
const _botTickWaterSpam = botTick;
botTick = function (b) { _waterBot = b; try { return _botTickWaterSpam(b); } finally { _waterBot = null; } };
const _placeWaterSpam = placeWater;
placeWater = function (x, y, z) {
  const b = _waterBot;
  if (b && tick < (b._waterSpamCD || 0)) return false;
  const r = _placeWaterSpam(x, y, z);
  if (r && b) b._waterSpamCD = tick + BOT_WATER_CD;
  return r;
};
// ================= JUMP RESETS THAT ACTUALLY WORK =================
// Before, you had to press jump in a 0.1 s window AFTER the hit, which was almost impossible.
// Now a jump reset counts if you jump up to 3 ticks BEFORE the hit (like real MC: jump as they swing)
// or up to 4 ticks AFTER it. A jump reset cuts the hit's knockback and does NOT count as being
// knocked into the air, so you can still hit back.
const _doJumpJR = doJump;
doJump = function (e) { _doJumpJR(e); e._jumpTick = tick; };
const _knockbackJR = knockback;
knockback = function (t, s, xr, zr) {
  const early = !t.onGround && !t.inWater && !t.inWeb && tick - (t._jumpTick ?? -99) <= 3;
  const vy0 = t.vy;
  _knockbackJR(t, s, xr, zr);
  if (early && !t.dead) {
    t.vx *= 0.6; t.vz *= 0.6; t.vy = Math.max(t.vy, vy0);
    t.jumpResetDone = true; t._jrHitT = tick; t._kbAirT = 0;
    if (t === player) jumpResetT = performance.now();
  }
};
const _tryJumpResetJR = tryJumpReset;
tryJumpReset = function (e) {
  const kt = e.kbTick, late = kt !== undefined && tick - kt > 2 && tick - kt <= 4;
  if (late) e.kbTick = tick - 2;                            // widen the after-hit window to 4 ticks
  const r = _tryJumpResetJR(e);
  if (late) e.kbTick = kt;
  if (r) { e._kbAirT = 0; e._jrHitT = tick; }
  return r;
};

