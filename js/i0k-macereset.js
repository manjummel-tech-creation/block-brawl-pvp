// ================= MACE CHARGE RESETS ON GROUND / COBWEB / WATER =================
// The smash is built from how far you fell. The moment anyone touches the ground, a cobweb or water the fall is over,
// so the stored height goes back to zero (before, a cobweb or a quick touch of the floor kept the old height).
function maceTouchReset(e) {
  if (!(e.onGround || e.inWeb || e.inWater)) return false;
  e.apexY = e.y; e.fallDistance = 0;
  if (e._macePh === 'dive' && !e.onGround) e._macePh = 0;      // a bot's dive is cancelled by a web / water
  return true;
}
const _physicsTickMaceReset = physicsTick;
physicsTick = function (e) {
  _physicsTickMaceReset(e);
  if (!e.dead) maceTouchReset(e);
};
const _attackMaceReset = attack;
attack = function (a, t, reach) {
  if (a.held && a.held.k === 'mace') maceTouchReset(a);
  return _attackMaceReset(a, t, reach);
};
