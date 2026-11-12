// ================= TOTEM POP: EXTRA HEARTS + SHORT IMMUNITY (combos keep building) =================
// Popping a totem now gives 6 golden hearts (8 s) and 1.5 s of immunity. Hits during the immunity do no damage,
// but your crit streak keeps counting them — so when the immunity ends, your multiplied crits come in hot.
const _dieImmune = die;
die = function (t, src) {
  const before = t.totems || 0;
  _dieImmune(t, src);
  if (!t.dead && (t.totems || 0) < before) {
    t.absorption = 12; t.totemAbsUntil = tick + 160;
    t.totemImmuneUntil = tick + 30;
    drawTag(t);
  }
};
const _hurtImmune = hurt;
hurt = function (t, amount, src) {
  if ((t.totemImmuneUntil || 0) > tick && src && src.kind !== 'void') {
    if (src.att) src.att._hitImmune = true;
    if (tick % 2 === 0) burst(t.x, t.y + 1, t.z, 6, ['#f2c624', '#fff6a0'], 1.5, 0.3, 0.06, 0);
    return false;
  }
  return _hurtImmune(t, amount, src);
};
const _attackImmune = attack;
attack = function (a, t, reach) {
  const crit = a.isPlayer && isCrit(a, cooldown(a) > 0.9);
  a._hitImmune = false;
  const r = _attackImmune(a, t, reach);
  if (!r && a._hitImmune && crit) { // swing landed on an immune target: streak still grows
    if (tick - (a.lastCritT || -999) > 60) a.critStreak = 0;
    a.critStreak = (a.critStreak || 0) + 1; a.lastCritT = tick; critStreakPopT = performance.now();
    a.ticksSinceSwing = 0; sfx('crit', t.x, t.y, t.z, 0.5);
  }
  a._hitImmune = false;
  return r;
};
// golden glow while immune
const _updateModelsImmune = updateModels;
updateModels = function (alpha) {
  _updateModelsImmune(alpha);
  for (const m of mobs) if (m.parts && (m.totemImmuneUntil || 0) > tick) for (const mt of m.mats) if (mt.emissive) mt.emissive.setHex(0x6a5200);
};
const _drawHUDImmune = drawHUD;
drawHUD = function (a) {
  _drawHUDImmune(a);
  if (state === 'play' && player && (player.totemImmuneUntil || 0) > tick) txt(`IMMUNE ${(((player.totemImmuneUntil - tick) / 20)).toFixed(1)}s`, W / 2, H / 2 - 180, 26, '#f2c624', 'center');
};
// immunity also blocks direct damage top-ups (jump-crit minimum, mace smash total) that skip hurt()
const _dealDamageImmune = dealDamage;
dealDamage = function (t, amt, src) {
  if ((t.totemImmuneUntil || 0) > tick && !(src && src.kind === 'void')) return;
  return _dealDamageImmune(t, amt, src);
};
