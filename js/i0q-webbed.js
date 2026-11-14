// ================= WEBBED BOTS DON'T CUT THEMSELVES OUT =================
// A bot stuck in a cobweb no longer swings at the web. It turns to face the nearest enemy, then it can:
//  - eat a golden apple to heal (if it is hurt; cancels if an enemy gets in its face)
//  - hold its shield up facing the enemy
//  - pour water on the web if it has a water bucket
//  - and after a few seconds drag itself out slowly, away from the enemy (about 2-3 s to leave a web)
// It will not hit anything while stuck (same as before) and webs it did not stand in are cut as usual.
// Not used in the Mafia mode (guards there keep their own behaviour).
const _tickMiningOwnWeb = tickMining;
tickMining = function (e, hit) {
  if (hit && hit.id === B.WEB && !e.isPlayer && e.inWeb && game && !game.mafia) return;      // never cut the web you're standing in
  return _tickMiningOwnWeb(e, hit);
};
const _botTickWebbed = botTick;
botTick = function (b) {
  if (b.dead || !b.ai || !b.inWeb || !game || game.mafia || game.countdown > 0) { if (b._wb) { b._wb = null; if (b.using === 'eat' && !b.inWeb) { /* finish normally */ } } return _botTickWebbed(b); }
  const sk = b.skill || 0.5, W = b._wb || (b._wb = { t: 0, react: 8 + ((Math.random() * 8) | 0), out: 45 + ((Math.random() * 35) | 0), eat: 0, dir: Math.random() * 6.283 });
  W.t++;
  b.sprinting = false; b.sneaking = false; b.in = { f: 0, s: 0, jump: false };
  const { e: foe, d } = nearestEnemy(b);
  const near = foe && d < 12;
  if (near) aimAt(b, foe.x, foe.y + 1.2, foe.z);
  const hp = b.health + b.absorption;
  // ---- golden apple ----
  const g = slotWhere(b, it => it.k === 'gapple' && it.n > 0);
  if (b.using === 'eat') {
    if (near && d < 2.4 && b.useT < 20) { b.using = null; b.useT = 0; W.noEat = W.t + 40; }               // rushed mid-bite: stop and guard
    else {
      holdSlot(b, g >= 0 ? g : b.sel); b.useT++;
      if (b.useT % 4 === 0) sfx('eat', b.x, b.y, b.z, 0.7);
      if (b.useT >= 32) { eatGapple(b); W.ate = (W.ate || 0) + 1; }
    }
  } else if (W.t >= W.react && (W.ate || 0) < 2 && g >= 0 && b.absorption <= 0 && b.health < 13 + 4 * sk && W.t >= (W.noEat || 0) && !(near && d < 2.4)) {
    holdSlot(b, g); b.using = 'eat'; b.useT = 0;
  }
  const eating = b.using === 'eat';
  // ---- shield ----
  if (!eating && b.shield && tick >= (b.shieldCD || 0) && near && d < 7 && W.t >= 3) {
    if (b.ai.weaponSlot >= 0 && b.sel !== b.ai.weaponSlot) holdSlot(b, b.ai.weaponSlot);
    b.shieldUp = true; b.shieldT = (b.shieldT || 0) + 1;
  } else if (b.shieldUp) lowerShield(b);
  // ---- water bucket washes the web out ----
  if (!eating && CFG.botBuild && b.ai.x) botWater(b, b.ai.x);
  // ---- drag out, away from the enemy ----
  if (!eating && W.t > W.out) {
    const ang = near ? Math.atan2(b.x - foe.x, b.z - foe.z) + (W.dir - 3.14) * 0.2 : W.dir;
    b.inWeb = false; try { move(b, Math.sin(ang) * 0.034, 0, Math.cos(ang) * 0.034); } finally { b.inWeb = true; }
  }
};
