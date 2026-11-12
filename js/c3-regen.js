// ================= BOT REGEN NERF =================
// Bots were sitting near full health because (a) their natural regen used the fast "saturation" burst every time
// they reset, and (b) a totem gave them 45 s of Regeneration II (~18 hearts!). Now:
//  - bots only get the slow natural regen (1 HP every 4 s), and it pauses for 4 s after they take damage
//  - totems give 10 s of Regeneration II (4 hearts) instead of 45 s — for everyone
const _dealDamageRegen = dealDamage;
dealDamage = function (t, amt, src) { t.lastDmgT = tick; return _dealDamageRegen(t, amt, src); };
const _tickHealthRegen = tickHealth;
tickHealth = function (e) {
  if (!e.isPlayer && !e.dead) {
    e.saturation = 0; // no fast-regen burst for bots
    if (tick - (e.lastDmgT || -9999) < 80) {
      // in combat: only potion/apple/totem regen ticks, no natural regen
      if (e.regenFx > 0) { e.regenFx--; if (e.regenFx % 25 === 0) e.health = Math.min(20, e.health + 1); }
      return;
    }
  }
  _tickHealthRegen(e);
};
const _dieRegen = die;
die = function (t, src) {
  const before = t.totems || 0;
  _dieRegen(t, src);
  if (!t.dead && (t.totems || 0) < before) t.regenFx = 200;
};
