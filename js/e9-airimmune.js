// ================= YOU CAN'T BE HIT IN THE AIR =================
// While you're airborne (jumping, falling, launched, knocked up) no enemy hit or arrow can touch you.
if (CFG.airImmune === undefined) CFG.airImmune = true; DEF.airImmune = true;
const _hurtAir = hurt;
hurt = function (t, amount, src) {
  // only when you're properly airborne (wind-charge launch, mace dive, big knock-up) — normal jumps can still be hit
  const high = !t.onGround && !t.inWater && (t.windSafe || t.y - groundBelowY(t) > 1.5);
  if (CFG.airImmune && t === player && high && src && src.att && src.att !== t && (src.kind === 'melee' || src.kind === 'arrow')) return false;
  return _hurtAir(t, amount, src);
};
(function () {
  const rows = MENU[0].rows, i = rows.findIndex(x => x[0] === 'friendlyFire');
  rows.splice(i + 1, 0, ['airImmune', "You can't be hit while high in the air (wind charge / mace dives) — normal jumps can be hit", 'tg']);
})();
buildMenu();
