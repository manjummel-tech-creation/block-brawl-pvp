// ================= CRIT STREAKS + LESS TANKY BOTS =================
// Land crits back-to-back and each one hits harder: 2nd crit +25%, 3rd +50% ... up to +150% (on top of the x1.5 crit).
// The streak resets if you take damage, land a non-crit hit, or go 3 s without a crit. (Just for you.)
// Also: armour strength default lowered so fights don't drag (bots felt too tanky).
if (!CFG._v6) { CFG.armorBoost = 110; CFG._v6 = 1; saveCfg(); }
DEF.armorBoost = 110;
let critStreakPopT = -1e9;
const _attackStreak = attack;
attack = function (a, t, reach) {
  if (!a.isPlayer) return _attackStreak(a, t, reach);
  if (tick - (a.lastCritT || -999) > 60) a.critStreak = 0;
  const crit = isCrit(a, cooldown(a) > 0.9);
  a._streakMul = crit ? 1 + 0.25 * Math.min(a.critStreak || 0, 6) : 1;
  const r = _attackStreak(a, t, reach);
  a._streakMul = 1;
  if (r) {
    if (crit) { a.critStreak = (a.critStreak || 0) + 1; a.lastCritT = tick; if (a.critStreak >= 2) critStreakPopT = performance.now(); }
    else a.critStreak = 0;
  }
  return r;
};
const _dealDamageStreak = dealDamage;
dealDamage = function (t, amt, src) {
  if (src && src.att && src.att._streakMul > 1 && src.kind === 'melee') amt *= src.att._streakMul;
  if (t.isPlayer && amt > 0.2 && src && src.att) t.critStreak = 0; // getting hit breaks your streak
  return _dealDamageStreak(t, amt, src);
};
const _drawHUDStreak = drawHUD;
drawHUD = function (a) {
  _drawHUDStreak(a);
  if (state !== 'play' || !player || player.dead) return;
  const s = player.critStreak || 0;
  if (s >= 1 && tick - (player.lastCritT || -999) <= 60) {
    const next = 1 + 0.25 * Math.min(s, 6), pulse = performance.now() - critStreakPopT < 300 ? 1.25 : 1;
    txt(`CRIT STREAK x${s}  (next crit +${Math.round((next - 1) * 100)}%)`, W / 2, H / 2 - 52, 20 * pulse, s >= 4 ? '#ff7a3a' : '#ffdd55', 'center');
  }
};
