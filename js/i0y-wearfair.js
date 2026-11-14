// ================= ARMOUR WEAR: ONE HIT = ONE HIT =================
// Armour wear is counted every time damage is dealt, so the extra top-up damage on a crit or a mace smash (and any second hit
// in the same tick) counted as another hit and wore the armour twice as fast. Now each attacker wears your armour at most once per
// tick, and top-up damage never counts. Same rule for you and for bots.
const _dealDamageWear = dealDamage;
dealDamage = function (t, amt, src) {
  const h0 = t.armorHits, n0 = t.pieces ? t.pieces.filter(Boolean).length : 0;
  const r = _dealDamageWear(t, amt, src);
  if (t.pieces && src && src.att && (src.kind === 'melee' || src.kind === 'arrow') && t.armorHits !== h0) {
    const key = src.att.id + ':' + tick, brokeNow = t.pieces.filter(Boolean).length !== n0;
    if ((src.bypass || src.noProt || t._wearKey === key) && !brokeNow) t.armorHits = h0;       // top-up or second hit this tick: no extra wear
    else t._wearKey = key;
  }
  return r;
};
