// ================= SHIELDS BLOCK MACE SMASHES (even from straight above) =================
// A raised shield only covered the front, so a mace diver landing right on top of you (the usual way a smash arrives) counted as
// "behind" the shield and went straight through. Now a smash from above is blocked while your shield is up and ready if the
// diver is overhead (within 2.2 blocks sideways) or in front of you, for you and for bots. A smash that lands on a shield costs
// it 2 durability in duels (see i0u) and the diver is knocked back as for any blocked hit.
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

// ---- a BLOCKED smash is spent: one dive = one hit on the shield, never a smash through it ----
// (Bots swing every tick of a dive while in reach. Each blocked swing cost the shield durability, so one dive broke the shield
//  in 8 ticks, and the next swing then landed the full smash. Now the first blocked swing ends the smash: the diver's fall height
//  is wiped, it can't smash again for 1.5 s, and its dive is over.)
const _attackShieldMace = attack;
attack = function (a, t, reach) {
  const mace = a.held && a.held.k === 'mace';
  if (mace && tick < (a._maceBlockT || 0)) return false;                         // spent: no more swings from this dive
  const b0 = t.blocks || 0, air = !a.onGround;
  const r = _attackShieldMace(a, t, reach);
  if (!r && mace && air && (t.blocks || 0) > b0) {
    a._maceBlockT = tick + 30; a.fallDistance = 0; a.apexY = a.y;
    if (a._macePh) a._macePh = 'done';
    if (a._elyDrop) a._elyDrop = false;
  }
  return r;
};
