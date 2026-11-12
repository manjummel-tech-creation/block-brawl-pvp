// ================= BOTS DON'T STOP FIGHTING =================
// Diagnosed: low bots in "flee" got pinned against walls with the enemy right on them and never hit back.
// Now: cornered, or being hit while running, or chased down -> they turn and fight (and won't re-flee for 5 s).
// Also: any bot that's being hit by someone within 4 blocks and hasn't swung in 2 s fights back, whatever it was doing.
function nearestFoe(b) { let e = null, d = 1e9; for (const o of mobs) if (!o.dead && o.team !== b.team) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < d) { d = dd; e = o; } } return { e, d }; }
function forceFight(b, e) {
  const X = b.ai.x;
  if (X) { X.plan = 'fight'; X.planT = 60; X.seek = null; X.dig = null; X.hide = null; X.tower = null; X.fleeT = 0; X.hitRun = false; X.noFleeUntil = tick + 100; X.noHideUntil = tick + 300; }
  b.ai.mode = 'fight'; b.ai.state = 'approach'; b.ai.stateT = 0; b.ai.t = e; b.ai.retarget = 40;
  b._detour = null;
  if (b.using && b.using !== 'eat') { b.using = null; b.useT = 0; }
  if (b.ai.weaponSlot >= 0) holdSlot(b, b.ai.weaponSlot);
}
const _choosePlanNoStop = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanNoStop(b, t, X);
  if ((p === 'flee' || p === 'hide' || p === 'tower') && tick < (X.noFleeUntil || 0)) { X.hide = null; X.tower = null; return 'fight'; }
  return p;
};
const _botTickNoStop = botTick;
botTick = function (b) {
  _botTickNoStop(b);
  if (b.dead || !b.ai || game.countdown > 0 || b.stunT > tick || b.inWeb) return;
  const X = b.ai.x, { e, d } = nearestFoe(b); if (!e) return;
  const beingHit = tick - (b.lastAttackT || -999) < 20 && b.lastAttacker && !b.lastAttacker.dead && b.lastAttacker.team !== b.team;
  if (X && X.plan === 'flee' && d < 3.2 && (b.hc || (X.fleeT || 0) > 40 || beingHit)) { forceFight(b, beingHit ? b.lastAttacker : e); return; }
  if (beingHit && d < 4 && tick - (b._lastSwingT || 0) > 40 && b.using !== 'eat' && !b._macePh) forceFight(b, b.lastAttacker);
};
