// ================= SHORTER MACE STUN =================
// Smash stun is now short (default 1 s instead of 2.5-3.5 s). Adjustable in the menu under the mace options.
if (CFG.maceStun === undefined) CFG.maceStun = 1; DEF.maceStun = 1;
const _attackShortStun = attack;
attack = function (a, t, reach) {
  const smash = a.held && a.held.k === 'mace' && !a.onGround && a.fallDistance > 1.5;
  const r = _attackShortStun(a, t, reach);
  if (r && smash && !t.dead && t.stunT > tick) {
    const max = Math.round(CFG.maceStun * 20);
    if (t.stunT > tick + max) { t.stunT = tick + max; t.hitStun = Math.min(t.hitStun || 0, max); }
  }
  return r;
};
(function () {
  const rows = MENU[1].rows, i = rows.findIndex(x => x[0] === 'maceMode');
  rows.splice(i + 1, 0, ['maceStun', 'Mace stun length (seconds)', 'rng', [0, 3.5, 0.25]]);
})();
buildMenu();
