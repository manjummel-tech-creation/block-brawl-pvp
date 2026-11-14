// ================= EACH WEAPON HAS ITS OWN ATTACK COOLDOWN =================
// Swinging the axe used to empty the shared attack bar, so swapping to the sword right after was slow. Now sword, axe, mace and
// bare hand each keep their own charge: axe hit -> swap -> sword hit straight away if the sword's bar was already full
// (and the axe's bar keeps recharging while you hold the sword). Same rule for bots.
const cdKind = e => (e.held ? e.held.k : 'hand');
function syncCd(e) {
  const k = cdKind(e);
  if (e._cdKind === undefined) { e._cdKind = k; e._cdStore = {}; return; }
  if (e._cdKind === k) return;
  e._cdStore[e._cdKind] = { v: e.ticksSinceSwing, t: tick };                // park the old weapon's charge
  const s = e._cdStore[k];
  e.ticksSinceSwing = s ? s.v + (tick - s.t) : 1000;                        // restore the new weapon's charge (it kept recharging)
  e._cdKind = k;
}
const _cooldownWeapon = cooldown;
cooldown = function (e) { syncCd(e); return _cooldownWeapon(e); };
const _attackWeaponCd = attack;
attack = function (a, t, reach) { syncCd(a); return _attackWeaponCd(a, t, reach); };
const _startGameWeaponCd = startGame;
startGame = function () { _startGameWeaponCd(); for (const m of mobs) { m._cdKind = undefined; m._cdStore = {}; } };
G.startGame = startGame;
