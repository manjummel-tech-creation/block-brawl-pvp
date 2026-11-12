// ================= LOW KNOCKBACK (SMP style: little to none) =================
// Every hit (sword, axe, sprint/charged bonus, arrows) now only pushes people a little.
// "Knockback amount" in the menu controls it (default 20% of vanilla). Wind charges / mace shockwave are unaffected.
if (!CFG._v5) { CFG.kbAmount = 20; CFG.weight = 100; CFG._v5 = 1; saveCfg(); }
DEF.kbAmount = 20; if (CFG.kbAmount === undefined) CFG.kbAmount = 20;
const kbK = () => clamp(CFG.kbAmount, 0, 100) / 100;
const _knockbackLow = knockback;
knockback = function (t, s, xr, zr) {
  if (t._kbLowScaling) return _knockbackLow(t, s, xr, zr);
  const vx = t.vx, vy = t.vy, vz = t.vz;
  _knockbackLow(t, s, xr, zr);
  const k = kbK();
  t.vx = vx + (t.vx - vx) * k; t.vz = vz + (t.vz - vz) * k;
  if (t.vy > vy) t.vy = vy + (t.vy - vy) * Math.max(k, 0.25); // keep a tiny hop so hits still read
};
const _attackLow = attack;
attack = function (a, t, reach) {
  const vx = t.vx, vy = t.vy, vz = t.vz;
  t._kbLowScaling = true;
  const r = _attackLow(a, t, reach);
  t._kbLowScaling = false;
  if (r) {
    const k = kbK();
    t.vx = vx + (t.vx - vx) * k; t.vz = vz + (t.vz - vz) * k;
    if (t.vy > vy) t.vy = vy + (t.vy - vy) * Math.max(k, 0.25);
  }
  return r;
};
(function () {
  const rows = MENU[0].rows, i = rows.findIndex(x => x[0] === 'weight');
  rows.splice(i, 0, ['kbAmount', 'Knockback amount (SMP = low)', 'rng', [0, 100, 5, '%']]);
})();
buildMenu();
