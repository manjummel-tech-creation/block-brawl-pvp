// ================= SHIELDS BLOCK MACE SMASHES (even from straight above) =================
// A raised shield only covered the front, so a mace diver landing right on top of you (the usual way a smash arrives) counted as
// "behind" the shield and went straight through. Now a smash from above is blocked while your shield is up and ready if the
// diver is overhead (within 2.2 blocks sideways) or in front of you, for you and for bots. A smash that lands on a shield costs
// it durability in duels (see i0u) and the diver is knocked back as for any blocked hit.
let _blockAtt = null;
const _frontalMace = frontal;
frontal = function (t, sx, sz) {
  const a = _blockAtt;
  if (a && a.held && a.held.k === 'mace' && !a.onGround && a.y > t.y + 0.8 && Math.hypot(a.x - t.x, a.z - t.z) < 2.2) return true;   // overhead smash
  return _frontalMace(t, sx, sz);
};
const _hurtShieldMace = hurt;
hurt = function (t, amount, src) {
  _blockAtt = src && src.att || null;
  try { return _hurtShieldMace(t, amount, src); } finally { _blockAtt = null; }
};
