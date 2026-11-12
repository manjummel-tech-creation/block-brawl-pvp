// ================= MACE TYPE: STUN or BOUNCE =================
// Stun mace:   smash stuns the target for 2.5 - 3.5 s, you stop on top of them.
// Bounce mace: smash launches you back up (like Wind Burst) so you can chain smashes; no stun, no fall damage from the bounce.
if (CFG.maceMode === undefined) CFG.maceMode = 'stun'; DEF.maceMode = 'stun';
const _attackMaceMode = attack;
attack = function (a, t, reach) {
  const smash = a.held && a.held.k === 'mace' && !a.onGround && a.fallDistance > 1.5;
  const fall = a.fallDistance;
  // how straight down were we coming? 1 = vertical dive, ~0 = flat / sideways approach
  const sp = Math.hypot(a.vx, a.vy, a.vz) || 1, steep = clamp(-a.vy / sp, 0, 1);
  const offX = t.x - a.x, offZ = t.z - a.z, off = Math.hypot(offX, offZ);
  const r = _attackMaceMode(a, t, reach);
  if (!r || !smash || t.dead) return r;
  if (CFG.maceMode === 'bounce') {
    t.stunT = 0; t.hitStun = 3;
    // straight-down smash = full bounce (~11-16 blocks); hitting from an angle bounces you much lower
    const angleK = 0.35 + 0.65 * steep * steep * clamp(1 - (off - 0.6) / 2, 0.4, 1);
    a.vy = clamp(1.5 + fall * 0.04, 1.6, 2.0) * angleK; a.onGround = false;
    a.vx *= 0.3; a.vz *= 0.3; // kill sideways drift so you come back down near them
    a.windSafe = true; a.windSafeT = tick; // the bounce itself never causes fall damage
    burst(a.x, a.y, a.z, 16, ['#ffffff', '#dff0ff', '#9ec8f0'], 3, 0.4, 0.07, 0, -1);
    sfx('wind', a.x, a.y, a.z, 0.7);
  } else {
    const dur = 50 + ((Math.random() * 21) | 0); // 2.5 - 3.5 s
    t.stunT = tick + dur; t.hitStun = dur;
  }
  return r;
};
const _itemNameMace = itemName;
itemName = function (it) {
  if (it && it.k === 'mace') return CFG.maceMode === 'bounce' ? 'Bounce Mace (smash = launch back up)' : 'Stun Mace (smash = 3 s stun)';
  return _itemNameMace(it);
};
(function () {
  const rows = MENU[1].rows, i = rows.findIndex(x => x[0] === 'mace');
  rows.splice(i + 1, 0, ['maceMode', 'Mace type', 'ch', [['stun', 'Stun mace (long stun)'], ['bounce', 'Bounce mace (launch back up)']]]);
})();
buildMenu();
