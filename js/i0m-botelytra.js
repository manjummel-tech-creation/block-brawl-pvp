// ================= BOTS ELYTRA-MACE (normal PvP only, never in Mafia) =================
// A bot that has a mace also wears an elytra and carries a few rockets. Every so often it rockets straight up,
// glides over to a spot above its target, folds the wings and drops with the mace out (the normal bot dive then
// steers and smashes). Only the final drop counts for the smash, the climb does not. Bot settings -> "Bots elytra-mace".
if (CFG.botElytra === undefined) CFG.botElytra = true; DEF.botElytra = true;
const BOT_ELY = { rockets: 4, dropH: 6.5, maxH: 7 };     // maxH: the most height a bot's elytra drop can count for the smash
const _hasElytraBot = hasElytra;
hasElytra = function (m) { return !!m._botEly || _hasElytraBot(m); };
const _startGameBotEly = startGame;
startGame = function () {
  _startGameBotEly();
  if (!game) return;
  for (const m of mobs) { m._botEly = false; m._ely = null; }
  if (game.mafia || !CFG.botElytra) return;
  for (const m of mobs) if (!m.isPlayer && m.ai && m.inv.some(i => i && i.k === 'mace')) {
    m._botEly = true; m._elyRk = BOT_ELY.rockets; m._elyCD = tick + 160 + ((Math.random() * 300) | 0);
    if (typeof addWings === 'function') addWings(m);
  }
};
G.startGame = startGame;
function elySkyClear(x, y, z, n) { for (let i = 2; i <= n; i++) if (isSolid(getB(x, y + i, z))) return false; return true; }
function elyBoost(b) { b._elyRk--; b.boostUntil = tick + 22; b.boostT0 = tick; b.gliding = true; b.glideT = 0; sfx('rocket', b.x, b.y, b.z); }
function elyEnd(b) { b._ely = null; b.gliding = false; b.boostUntil = 0; if (b.ai && b.ai.weaponSlot >= 0) holdSlot(b, b.ai.weaponSlot); }
function botElyFly(b) {
  const E = b._ely, t = b.ai && b.ai.t, age = tick - E.t0;
  if (!t || t.dead || b.inWater || b.inWeb || age > 240 || (b.onGround && age > 6) || b.stunT > tick) return elyEnd(b);
  if (b.using) { b.using = null; b.useT = 0; }
  if (b.shieldUp) lowerShield(b);
  const mi = b.inv.findIndex(i => i && i.k === 'mace'); if (mi >= 0 && b.sel !== mi) holdSlot(b, mi);
  b.in = { f: 0, s: 0, jump: false }; b.sprinting = false;
  const px = t.x + t.vx * 5, pz = t.z + t.vz * 5, dx = px - b.x, dz = pz - b.z, d = Math.hypot(dx, dz), h = b.y - t.y;
  const yawTo = Math.atan2(-dx, dz) / DEG, turn = max => { b.yaw += clamp(wrapDeg(yawTo - b.yaw), -max, max); };
  if (E.ph === 'climb') {
    turn(12); b.pitch += clamp(-76 - b.pitch, -15, 15);
    const stalled = age > 6 && b.vy <= 0.02;                              // hit a ceiling
    if (b.y >= E.top - 3 || tick >= b.boostUntil || stalled) {
      if (!stalled && b.y < E.top - 6 && b._elyRk > 0 && !E.re) { E.re = 1; elyBoost(b); }
      else { E.ph = 'over'; b.boostUntil = 0; b.vy = Math.min(b.vy, 0.25); }
    }
    return;
  }
  // glide to a point a few blocks above them, then fold the wings and drop
  const sp = Math.hypot(b.vx, b.vz);
  const pitchTo = clamp(Math.atan2(h - BOT_ELY.dropH, Math.max(d, 0.5)) / DEG, -22, 55);
  turn(14); b.pitch += clamp(pitchTo - b.pitch, -8, 8);
  if (d < 1.4 + sp * 3) {
    b.gliding = false; b.boostUntil = 0; b.vx *= 0.3; b.vz *= 0.3; b.vy = Math.min(b.vy, -0.1);
    b.apexY = b.y; b.fallDistance = 0;                                      // only the drop counts
    b._ely = null; b._elyDrop = true;
    if (h > 3 && typeof rollDive === 'function') { b._macePh = 'dive'; rollDive(b, t); }
    else if (b.ai.weaponSlot >= 0) holdSlot(b, b.ai.weaponSlot);
    return;
  }
  if (h < 2.5 && d > 6) {                                                   // came in too low: one more rocket, or give up
    if (b._elyRk > 0 && !E.re2) { E.re2 = 1; E.ph = 'climb'; E.top = t.y + 11; E.re = 1; elyBoost(b); b.pitch = -60; }
    else elyEnd(b);
  }
}
const _botTickEly = botTick;
botTick = function (b) {
  if (!b._botEly || !game || game.mafia) return _botTickEly(b);
  if (b.dead) { b._ely = null; b._elyRk = BOT_ELY.rockets; b.gliding = false; return _botTickEly(b); }
  if (b._ely) return botElyFly(b);
  if (b._elyDrop && (b.onGround || b.inWater || b.inWeb)) b._elyDrop = false;
  _botTickEly(b);
  const t = b.ai && b.ai.t; if (!t || t.dead || game.countdown > 0) return;
  // the drop is fast (over a block per tick): swing as soon as they are in reach instead of waiting for a perfect aim
  if (b._elyDrop && b._macePh === 'dive' && !b._diveMiss && b.vy < 0 && !b.onGround && b.y > t.y + 0.8 && b.held && b.held.k === 'mace') {
    const ex = t.x - b.x, ey = t.y + 0.9 - (b.y + b.eyeH), ez = t.z - b.z, ed = Math.hypot(ex, ey, ez);
    if (ed <= 3.3) {
      b.yaw = Math.atan2(-ex, ez) / DEG; b.pitch = clamp(-Math.atan2(ey, Math.hypot(ex, ez)) / DEG, -90, 90);
      swing(b); if (attack(b, t, Math.min(ed, 3))) { b._macePh = 'done'; b._elyDrop = false; }
    }
  }
  if (!b.onGround || b.inWeb || b.inWater || b.stunT > tick || b.using || b._macePh || b._elyRk <= 0 || tick < (b._elyCD || 0)) return;
  if (b.health + b.absorption < 9) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z), sk = b.skill || 0.5;
  if (d < 2 || d > 30 || Math.abs(t.y - b.y) > 8) return;
  if (Math.random() > 0.012 + 0.02 * sk) return;
  if (!elySkyClear(b.x, b.y, b.z, 16) || !elySkyClear(t.x, t.y, t.z, 9)) { b._elyCD = tick + 60; return; }
  // launch
  b._elyCD = tick + 400 + ((Math.random() * 400) | 0);
  b._ely = { ph: 'climb', t0: tick, top: Math.max(b.y, t.y) + 9.5 + sk * 2 };
  if (b.shieldUp) lowerShield(b);
  b.y += 0.6; b.vy = 0.3; b.onGround = false; b.pitch = -76; b.yaw = Math.atan2(-(t.x - b.x), t.z - b.z) / DEG;
  elyBoost(b);
};
// a bot's elytra drop never counts more than maxH blocks (so it hurts a lot but is not a one-shot from full health)
const _attackBotEly = attack;
attack = function (a, t, reach) {
  if (a._elyDrop && a.held && a.held.k === 'mace') {
    if (a.apexY !== undefined) a.apexY = Math.min(a.apexY, t.y + BOT_ELY.maxH);
    a.fallDistance = Math.min(a.fallDistance, BOT_ELY.maxH);
  }
  return _attackBotEly(a, t, reach);
};
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'botMace'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['botElytra', 'Bots elytra-mace (rocket up, glide over you, drop and smash)', 'tg']); break; } }
})();
buildMenu();
