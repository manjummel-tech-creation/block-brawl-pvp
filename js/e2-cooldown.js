// ================= NO SPAM-CLICKING (1.9+ mode) =================
// Sword takes exactly 0.625 s (12.5 game ticks, vanilla attack speed 1.6) to recharge.
// Clicks before the bar is full are ignored completely — no hit, no swing, and they don't reset the bar.
// Same rule for bots (they used to be allowed to swing at 85%).
const _weaponStatsVanilla = weaponStats;
weaponStats = function (e) { const s = _weaponStatsVanilla(e); return { dmg: s.dmg, speed: s.speed / 1.25, sharp: s.sharp }; }; // undo the earlier 25% speed-up
const _playerControlCD = playerControl;
playerControl = function (p) {
  if (!COMBAT18 && clickQ > 0 && cooldown(p) < 1 && !(p.held && p.held.k === 'mace')) clickQ = 0; // mace: no cooldown lock
  _playerControlCD(p);
};
const _attackCD = attack;
attack = function (a, t, reach) {
  if (!COMBAT18 && !a.isPlayer && cooldown(a) < 1 && !(a.held && a.held.k === 'mace')) return false; // mace smashes aren't bar-gated
  return _attackCD(a, t, reach);
};
const _newThresholdCD = newThreshold;
newThreshold = function (b) { return COMBAT18 ? _newThresholdCD(b) : 1; };
const _startGameCD = startGame;
startGame = function () { _startGameCD(); if (game) for (const m of mobs) if (m.ai) m.ai.thr = newThreshold(m); };
G.startGame = startGame;
