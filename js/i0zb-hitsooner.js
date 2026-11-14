// ================= HIT SOONER: FASTER SWORD RECHARGE FOR YOU =================
// Your sword attack bar refills faster, so you can land the next hit sooner and chain combos:
//   Normal 0.63 s (12.5 ticks) / Faster 0.48 s (x1.3) / Fastest 0.39 s (x1.6). Damage still scales with how full the bar is.
// A click made up to 3 ticks BEFORE the bar is full is remembered and fires the moment it is ready (before, early clicks were thrown
// away, so a slightly early click cost you a whole extra swing). And a swing at nothing with a full bar costs half the charge, not all.
// Only YOU (bots keep the normal recharge). Settings -> "Your sword recharge".
if (CFG.hitSpeed === undefined) CFG.hitSpeed = '1.3'; DEF.hitSpeed = '1.3';
const _weaponStatsHit = weaponStats;
weaponStats = function (e) {
  const s = _weaponStatsHit(e), k = parseFloat(CFG.hitSpeed) || 1;
  if (e.isPlayer && k !== 1 && e.held && e.held.k === 'sword') s.speed *= k;
  return s;
};
const _attackHit = attack;
attack = function (a, t, reach) { if (a.isPlayer) a._atkTick = tick; return _attackHit(a, t, reach); };
const _playerControlHit = playerControl;
playerControl = function (p) {
  // click buffer
  const meleeLocked = !COMBAT18 && p.held && p.held.k !== 'mace' && !p.dead;
  if (meleeLocked && p._buf && tick + 1 - p._buf > 4) p._buf = 0;
  if (meleeLocked && clickQ > 0 && cooldown(p) < 1) {
    const total = 20 / weaponStats(p).speed, ticksLeft = Math.ceil(total - 0.5 - p.ticksSinceSwing);
    if (ticksLeft <= 3 && p.held && (p.held.k === 'sword' || p.held.k === 'axe')) p._buf = tick + 1;                   // remember this click (+1 so tick 0 isn't 'empty')
  } else if (meleeLocked && p._buf && cooldown(p) >= 1 && clickQ === 0) { clickQ = 1; p._buf = 0; }                    // ...and fire it as soon as the bar is full
  const before = p.ticksSinceSwing, clicked = clickQ > 0, t0 = p._atkTick;
  _playerControlHit(p);
  // a click that hit nothing (no attack() call) used to reset the whole bar; now it only costs half of what was charged
  if (!COMBAT18 && clicked && p._atkTick === t0 && p.ticksSinceSwing === 0 && before > 0 && p.held && p.held.k === 'sword') {
    const total = 20 / weaponStats(p).speed;
    p.ticksSinceSwing = Math.floor(Math.min(before, total) / 2);
  }
};
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'shield'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['hitSpeed', 'Your sword recharge (hit sooner)', 'ch', [['1', 'Normal'], ['1.3', 'Faster'], ['1.6', 'Fastest']]]); break; } }
})();
buildMenu();
