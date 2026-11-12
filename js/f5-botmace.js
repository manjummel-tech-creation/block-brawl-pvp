// ================= BOTS USE MACES =================
// Bots with a mace (and wind charges) do the real combo: get close, wind-charge straight up, swap to the mace on
// the way down, steer onto you and smash. They also smash opportunistically when dropping onto you from height.
// A bot's smash on YOU stuns you for at most 1.2 s (bots' stun on bots / yours on them is unchanged).
if (CFG.botMace === undefined) CFG.botMace = true; DEF.botMace = true;
for (const k in KIT_MODES) { const s = KIT_MODES[k].set; if (s) s.botMace = k === 'mace' || k === 'smp'; }
const _startGameBotMace = startGame;
startGame = function () {
  _startGameBotMace();
  if (!game) return;
  const km = KIT_MODES[CFG.kitMode], give = km && km.set ? km.set.botMace : CFG.botMace;
  if (!give) return;
  for (const m of mobs) if (!m.isPlayer && !m.inv.some(i => i && i.k === 'mace')) {
    const k = m.inv.findIndex(s => !s); if (k < 0) continue;
    m.inv[k] = { k: 'mace' };
    if (!m.inv.some(i => i && i.k === 'wind')) { const w = m.inv.findIndex(s => !s); if (w >= 0) m.inv[w] = { k: 'wind', n: 4 }; }
    m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
  }
};
G.startGame = startGame;
const _botTickMace = botTick;
botTick = function (b) {
  _botTickMace(b);
  if (b.dead || !b.ai || game.countdown > 0 || b.inWeb || b.stunT > tick || b.using === 'eat') { if (b._macePh && b.onGround) b._macePh = 0; return; }
  const mi = b.inv.findIndex(i => i && i.k === 'mace'); if (mi < 0) return;
  const t = b.ai.t; if (!t || t.dead) { b._macePh = 0; return; }
  const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz), dy = t.y - b.y, sk = b.skill || 0.5;
  const hp = b.health + b.absorption;
  // ---- start a wind-charge -> mace combo ----
  if (!b._macePh && b.onGround && hp >= 8 && d > 1.5 && d < 4.5 && Math.abs(dy) < 2 && tick > (b._maceCD || 0) &&
      b.inv.some(i => i && i.k === 'wind' && i.n > 0) && Math.random() < 0.015 + 0.03 * sk) {
    if (botThrowWind(b, 89)) { b._macePh = 'dive'; b._maceCD = tick + 240 + ((Math.random() * 240) | 0); b.windCD = 10; rollDive(b, t); }
  }
  // ---- opportunistic: already falling from height onto someone ----
  if (!b._macePh && !b.onGround && b.vy < -0.1 && maceHeight(b) > 3 && d < 5 && dy < -1.5) { b._macePh = 'dive'; rollDive(b, t); }
  if (b._macePh === 'done' && b.onGround) { b._macePh = 0; if (b.ai.weaponSlot >= 0) holdSlot(b, b.ai.weaponSlot); }
  if (b._macePh !== 'dive') return;
  if (b.onGround && b.vy <= 0) { // landed: back to the sword
    b._macePh = 0;
    if (b.ai.weaponSlot >= 0 && b.sel !== b.ai.weaponSlot) holdSlot(b, b.ai.weaponSlot);
    return;
  }
  // in the air: mace out, steer onto them, smash on the way down
  if (b.sel !== mi) holdSlot(b, mi);
  if (b.using) { b.using = null; b.useT = 0; }
  if (b.shieldUp) lowerShield(b);
  const mo = b._diveMiss || [0, 0]; // a botched dive steers off-target and never connects
  aimAt(b, t.x + t.vx * 2 + mo[0], t.y + 1, t.z + t.vz * 2 + mo[1], true);
  b.in = { f: d > 0.6 ? 1 : 0, s: 0, jump: false }; b.sprinting = d > 1.5;
  if (b.vy < 0 && maceHeight(b) > 1.5) {
    const hit = pickEntity(b, 3);
    if (hit && hit.m === t && !b._diveMiss) { swing(b); if (attack(b, t, hit.dist)) b._macePh = 'done'; }
    else if (b._diveMiss && Math.hypot(t.x - b.x, t.z - b.z) < 2.5 && b.swingT <= 0) { swing(b); sfx('swing', b.x, b.y, b.z, 0.8); }
  }
};
// cap a bot's smash-stun on you
const _attackBotMaceStun = attack;
attack = function (a, t, reach) {
  const r = _attackBotMaceStun(a, t, reach);
  if (r && t === player && !a.isPlayer && a.held && a.held.k === 'mace' && t.stunT > tick + 24) { t.stunT = tick + 24; t.hitStun = Math.min(t.hitStun, 24); }
  return r;
};
(function () {
  const rows = MENU[2].rows, i = rows.findIndex(x => x[0] === 'botWind');
  rows.splice(i + 1, 0, ['botMace', 'Bots get a mace (wind charge + smash combos)', 'tg']);
})();
buildMenu();

// decide up front whether this dive will connect (not every mace hit lands). Webbed targets are easy to hit.
function rollDive(b, t) {
  const p = t.inWeb ? 0.8 : 0.4 + 0.3 * (b.skill || 0.5);
  if (Math.random() < p) b._diveMiss = null;
  else { const a = Math.random() * 6.283, r = 1.6 + Math.random() * 1.2; b._diveMiss = [Math.cos(a) * r, Math.sin(a) * r]; }
}
