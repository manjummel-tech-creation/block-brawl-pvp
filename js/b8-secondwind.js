// ================= TOTEM "SECOND WIND" FOR BOTS =================
// After a totem pop bots used to panic: they'd sit in flee / hide / tower mode for ages (their health looked low
// even though they had golden hearts and Regeneration II). Now a popped bot gets 8 s of "second wind":
// it drops whatever it was doing, fights at full aggression, pots straight away if it's still low,
// and doesn't run off to heal until the 8 s are over.
const _dieSecondWind = die;
die = function (t, src) {
  const before = t.totems || 0;
  _dieSecondWind(t, src);
  if (t.dead || t.isPlayer || (t.totems || 0) >= before || !t.ai) return;
  const ai = t.ai, X = ai.x;
  t.secondWindUntil = tick + 160;
  t.baseAggro = t.baseAggro === undefined ? t.aggro : t.baseAggro;
  t.aggro = Math.min(1, t.baseAggro + 0.4);
  ai.mode = 'fight'; ai.state = 'approach'; ai.stateT = 0;
  if (X) { X.plan = 'fight'; X.planT = 0; X.seek = null; X.dig = null; X.hide = null; X.tower = null; X.fleeT = 0; X.hitRun = false; }
  if (t.using) { t.using = null; t.useT = 0; }
  if (ai.weaponSlot >= 0) t.select(ai.weaponSlot);
  t.potCD = 0; // allowed to pot right away
  // hit back at whoever popped it
  const killer = src.att || t.lastAttacker;
  if (killer && !killer.dead && killer.team !== t.team) { ai.t = killer; ai.retarget = 60; if (X) X.rt = 60; }
};
const _choosePlanSecondWind = choosePlan;
choosePlan = function (b, t, X) {
  if ((b.secondWindUntil || 0) > tick) { X.seek = null; X.dig = null; X.hide = null; X.tower = null; return 'fight'; }
  return _choosePlanSecondWind(b, t, X);
};
const _botTickSecondWind = botTick;
botTick = function (b) {
  if ((b.secondWindUntil || 0) > tick) {
    if (b.ai.mode === 'heal' && b.slotOf('gapple') < 0) b.ai.mode = 'fight';
    if (b.ai.x && b.ai.x.plan !== 'fight') { b.ai.x.plan = 'fight'; b.ai.x.planT = 5; }
  } else if (b.secondWindUntil && b.baseAggro !== undefined) { b.aggro = b.baseAggro; b.secondWindUntil = 0; }
  _botTickSecondWind(b);
};
const _respawnSecondWind = respawn;
respawn = function (m) { _respawnSecondWind(m); if (m.baseAggro !== undefined) m.aggro = m.baseAggro; m.secondWindUntil = 0; };
