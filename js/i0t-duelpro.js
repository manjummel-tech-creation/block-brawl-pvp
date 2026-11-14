// ================= DUEL BOTS: PRO MODE =================
// In Duel 1v1 the bot plays at maximum: skill 1.0, full aggression, and far fewer of the "human mistakes" the other modes use. It attacks the
// instant the bar is full, crit-jumps and W-taps nearly every swing, tracks and leads your movement, and cleanly dodges mace dives.
// It still makes SMALL mistakes (a little aim drift, the odd whiffed swing, a rare freeze, a late jump reset) and its melee reach is
// 2.7 blocks, a touch shorter than yours (3.0), so it can't poke you from the edge of range every time.
// Settings -> "Duel bots: PRO mode" (on by default). Other modes are unchanged.
if (CFG.duelPro === undefined) CFG.duelPro = true; DEF.duelPro = true;
const proBot = b => CFG.duelPro && CFG.mode === 'duel' && game && !game.mafia && b && !b.isPlayer && b.ai;
const _startGamePro = startGame;
startGame = function () {
  _startGamePro();
  if (!game || !CFG.duelPro || CFG.mode !== 'duel') return;
  for (const m of mobs) if (!m.isPlayer) { m.skill = 1; m.aggro = 1; m.ai.thr = 0.98; m._pro = true; }
};
G.startGame = startGame;
// the human-error layer (shaky aim, whiffs, botched jump resets) only runs when a bot has `hum`; PRO bots skip it most of the time,
// so they keep only SMALL errors: aim drift on ~1/3 of ticks, ~5% whiffs, ~10% botched jump resets
const noHum = (b, fn) => { const h = b.hum; b.hum = null; try { return fn(); } finally { b.hum = h; } };
const _aimAtPro = aimAt;
aimAt = function (b, tx, ty, tz, precise) { return proBot(b) && b.hum && Math.random() > 0.35 ? noHum(b, () => _aimAtPro(b, tx, ty, tz, precise)) : _aimAtPro(b, tx, ty, tz, precise); };
const _attackPro = attack;
attack = function (a, t, reach) { return proBot(a) && a.hum && Math.random() > 0.4 ? noHum(a, () => _attackPro(a, t, reach)) : _attackPro(a, t, reach); };
const _tryJumpResetPro = tryJumpReset;
tryJumpReset = function (e) { return proBot(e) && e.hum && Math.random() > 0.35 ? noHum(e, () => _tryJumpResetPro(e)) : _tryJumpResetPro(e); };
// melee reach 2.7 (mace dives and elytra drops keep theirs)
const _pickEntityPro = pickEntity;
pickEntity = function (e, reach, dir) {
  if (proBot(e) && !e._macePh && !e._elyDrop && !e._ely && reach > 2.7) reach = 2.7;
  return _pickEntityPro(e, reach, dir);
};
const _botTickPro = botTick;
botTick = function (b) {
  if (!proBot(b) || b.dead) return _botTickPro(b);
  const h = b.hum;                                                                  // (rare freezes and web panic are left in on purpose)
  b.skill = 1; b.aggro = 1;
  _botTickPro(b);
  const ai = b.ai, t = ai.t;
  ai.thr = 0.98;                                                                   // swing the moment the bar is full
  ai.stateT = Math.min(ai.stateT, 3);
  if (h && ai.wtap > 0 && Math.random() < 0.2) ai.wtap = 2;                          // (the sloppy-combo layer drops W-taps; put it back)
  if (!t || t.dead || game.countdown > 0 || b.using || b.stunT > tick || b.inWeb) return;
  const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz), dy = t.y - b.y;
  // free hits: anything in reach with a full bar gets hit right now (no waiting on the random swing roll)
  if (d < 2.9 && Math.abs(dy) < 2 && cooldown(b) >= 0.98 && !(b.held && b.held.k === 'mace' && !b.onGround) && ai.blockT <= 0 && b.held && (b.held.k === 'sword' || b.held.k === 'axe')) {
    const hit = pickEntity(b, 3.0);
    if (hit && hit.m === t) { swing(b); attack(b, t, hit.dist); ai.wtap = 2; }
  }
  // crit-jump: hop right as the bar is about to fill and land the hit on the way down
  if (b.onGround && !ai.critJump && d < 3.2 && cooldown(b) > 0.5 && cooldown(b) < 0.8 && Math.random() < 0.5 && b.held && b.held.k !== 'bow') { b.in = { f: b.in.f, s: b.in.s, jump: true }; ai.critJump = true; }
};
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'botMace'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['duelPro', 'Duel bots: PRO mode (max skill, no mistakes)', 'tg']); break; } }
})();
buildMenu();
