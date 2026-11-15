// ================= WEBBED BOTS DON'T CUT THEMSELVES OUT =================
// Last-resort failsafe only: still stuck after 15 s (nothing else worked) = the webs around him are cut. Otherwise webs are NEVER removed for him.
// A bot stuck in a cobweb no longer swings at the web. It turns to face the nearest enemy, then it can:
//  - eat a golden apple to heal (if it is hurt; cancels if an enemy gets in its face)
//  - hold its shield up facing the enemy
//  - pour water on the web if it has a water bucket (a HEAD web is watered out as soon as it reacts)
//  - a head web it can't get out of within 3 s is cut out with the sword
//  - and after about a second it starts dragging itself out, away from the enemy (roughly 2 s to leave a web), doing the rest while it moves
// It will not hit anything while stuck (same as before) and webs it did not stand in are cut as usual.
// Not used in the Mafia mode (guards there keep their own behaviour).
const _tickMiningOwnWeb = tickMining;
tickMining = function (e, hit) {
  if (hit && hit.id === B.WEB && !e.isPlayer && e.inWeb && game && !game.mafia) return;      // never cut the web you're standing in
  return _tickMiningOwnWeb(e, hit);
};
const _botTickWebbed = botTick;
botTick = function (b) {
  if (b.dead || !b.ai || !b.inWeb || !game || game.mafia || game.countdown > 0) { if (b._wb) { b._wb = null; b._webFreeT = tick; } return _botTickWebbed(b); }
    const sk = b.skill || 0.5, W = b._wb || (b._wb = { t: 0, react: 5 + ((Math.random() * 6) | 0), out: 16 + ((Math.random() * 14) | 0), eat: 0, dir: Math.random() * 6.283, born: tick });
  W.t++;
  if (tick - W.born > 300) {                                            // last-resort failsafe: nobody stays webbed for 15 s, whatever else is going on
    const bx = b.box(); for (let y = Math.floor(b.y + 0.01); y <= Math.floor(b.y + 0.01) + 1; y++) for (let x = Math.floor(bx[0]); x <= Math.floor(bx[3] - 0.001); x++) for (let z = Math.floor(bx[2]); z <= Math.floor(bx[5] - 0.001); z++) if (getB(x, y, z) === B.WEB) setB(x, y, z, 0);
    b.inWeb = false; b._wb = null; b._webFreeT = tick; return _botTickWebbed(b);
  }
  b.sprinting = false; b.sneaking = false; b.in = { f: 0, s: 0, jump: false };
  const { e: foe, d } = nearestEnemy(b);
  const near = foe && d < 12;
  if (near) aimAt(b, foe.x, foe.y + 1.2, foe.z);
  const hp = b.health + b.absorption;
  // ---- golden apple ----
  const g = slotWhere(b, it => it.k === 'gapple' && it.n > 0);
  if (b.using === 'eat' && g < 0) { b.using = null; b.useT = 0; }
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
  // ---- head web: water it out if there is a bucket; if it is still stuck after 3 s, cut it out with the sword ----
  const sp = webSpots(b);
  if (sp.head) {
    const box = b.box(), hy = Math.floor(b.y + 0.01) + 1, full = slotWhere(b, it => it.k === 'bucket' && it.full);
    if (full >= 0 && W.t >= W.react && tick >= (W.wCD || 0) && !eating) {
      for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001); x++) for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001); z++) {
        if (getB(x, hy, z) !== B.WEB) continue;
        b.pitch = -80;                                                            // looks up at the web on its head
        if (placeWater(x, hy, z)) { holdSlot(b, full); b.inv[full].full = false; setHeldVisual(b); swing(b); if (b.ai.x) b.ai.x.water = { x, y: hy, z, at: tick + 18 }; W.wCD = tick + 30; return; }
      }
    }
    if (W.t > 60) {                                                                // 3 s and still stuck: cut it
      let cell = null;
      for (const yy of [hy, hy - 1]) for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001) && !cell; x++) for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001) && !cell; z++) if (getB(x, yy, z) === B.WEB) cell = { x, y: yy, z, id: B.WEB };
      if (cell) {
        if (b.using) { b.using = null; b.useT = 0; }
        const swd = slotWhere(b, it => it.k === 'sword'); if (swd >= 0 && b.sel !== swd) holdSlot(b, swd);
        lookAt(b, cell.x + 0.5, cell.y + 0.5, cell.z + 0.5, 60);
        if (tick % 4 === 0) swing(b);
        _tickMiningWebRules(b, cell);                                               // (skips the "can't cut your own head web" rule)
        return;
      }
    }
  }
  // ---- shield ----
  if (!eating && b.shield && tick >= (b.shieldCD || 0) && near && d < 7 && W.t >= 3) {
    if (b.ai.weaponSlot >= 0 && b.sel !== b.ai.weaponSlot) holdSlot(b, b.ai.weaponSlot);
    b.shieldUp = true; b.shieldT = (b.shieldT || 0) + 1;
  } else if (b.shieldUp) lowerShield(b);
  // ---- water bucket washes the web out ----
  if (!eating && CFG.botBuild && b.ai.x) botWater(b, b.ai.x);
  // ---- drag out, away from the enemy ----
  if (W.t > W.out) {                                // keeps crawling out even while it eats or holds the shield up
    const ang = near ? Math.atan2(b.x - foe.x, b.z - foe.z) + (W.dir - 3.14) * 0.2 : W.dir;
    b.inWeb = false; try { move(b, Math.sin(ang) * 0.05, 0, Math.cos(ang) * 0.05); } finally { b.inWeb = true; }
  }
};
