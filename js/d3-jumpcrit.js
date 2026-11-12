// ================= JUMP CRITS ALWAYS HIT FOR AT LEAST 1 HEART =================
// A crit landed while airborne (from a jump) always takes at least 1 full heart off the target
// (more than a sweep hit), even through armour or with a half-charged bar.
const _attackJumpCrit = attack;
attack = function (a, t, reach) {
  const jumpCrit = CFG.crits && !a.onGround && !a.inWater && !a.inWeb && !(a.held && a.held.k === 'mace' && a.fallDistance > 1.5);
  const hp0 = t.health + t.absorption;
  const r = _attackJumpCrit(a, t, reach);
  if (r && jumpCrit && !t.dead) {
    const dealt = hp0 - (t.health + t.absorption);
    if (dealt < 2) dealDamage(t, 2 - dealt, { att: a, kind: 'melee', bypass: true, noProt: true });
  }
  return r;
};
// protection enchant shouldn't eat the top-up either
const _dealDamageJC = dealDamage;
dealDamage = function (t, amt, src) {
  if (src && src.noProt && ARMOR[t.armor].pts > 0) amt /= 1 - Math.min(20, t.prot * 4) * 0.04;
  return _dealDamageJC(t, amt, src);
};
