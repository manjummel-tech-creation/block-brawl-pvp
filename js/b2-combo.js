// ================= COMBO LOCK =================
// Someone who has been knocked into the air by a hit can't hit back until they land.
// (Jumping yourself for a crit is fine — this only applies to being launched by knockback.)
const _knockbackCombo = knockback;
knockback = function (t, strength, xr, zr) {
  _knockbackCombo(t, strength, xr, zr);
  if (!t.inWater) { t.comboAir = true; t.comboAirT = tick; }
};
const _attackCombo = attack;
attack = function (a, t, reach) {
  if (a.comboAir && !a.onGround) {
    if (a === player || t === player) sfx('swing', a.x, a.y, a.z, 0.6);
    return false;
  }
  return _attackCombo(a, t, reach);
};
const _gameTickCombo = gameTick;
gameTick = function () {
  _gameTickCombo();
  for (const m of mobs) if (m.comboAir && (m.onGround || m.inWater || m.dead) && tick > (m.comboAirT || 0)) m.comboAir = false;
};
// HUD hint when you're the one locked in the air
const _drawHUDCombo = drawHUD;
drawHUD = function (a) {
  _drawHUDCombo(a);
  if (state === 'play' && player && !player.dead && player.comboAir && !player.onGround) txt('In the air — land to hit back!', W / 2, H / 2 + 112, 18, '#ff9a9a', 'center');
};
