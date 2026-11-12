// ================= WEB -> MACE COMBO · MORE DIFFICULTIES · NO MORE IDLE BOTS =================

// ---------- 1) cobweb you, then mace you ----------
// A bot carrying webs + mace + wind charges tries to web you at close range; once you're stuck it launches with a
// wind charge and smashes down (webbed targets are much easier to land on).
const _botTickWebMace = botTick;
botTick = function (b) {
  _botTickWebMace(b);
  if (b.dead || !b.ai || game.countdown > 0 || b.inWeb || b.stunT > tick || b.using) return;
  const t = b.ai.t; if (!t || t.dead) return;
  const hasMace = b.inv.some(i => i && i.k === 'mace'), hasWind = b.inv.some(i => i && i.k === 'wind' && i.n > 0);
  const hasWeb = b.inv.some(i => i && i.k === 'block' && i.id === B.WEB && i.n > 0);
  if (!hasMace || !hasWind) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z), dy = t.y - b.y, sk = b.skill || 0.5;
  // step 1: web them
  if (!b._macePh && hasWeb && b.onGround && t.onGround && !t.inWeb && d < 3.6 && Math.abs(dy) < 1.5 && tick > (b._wmCD || 0) && Math.random() < 0.01 + 0.025 * sk) {
    b._webGate = 0; // the planned combo skips the random web hesitation
    if (botPlace(b, Math.floor(t.x), ffloor(t.y), Math.floor(t.z), true)) { b._wmPending = tick + 30; b._wmCD = tick + 300 + ((Math.random() * 200) | 0); }
  }
  // step 2: they're stuck -> launch and smash
  if (!b._macePh && b.onGround && t.inWeb && d < 4 && (tick < (b._wmPending || 0) || Math.random() < 0.04 + 0.04 * sk)) {
    if (botThrowWind(b, 89)) { b._macePh = 'dive'; b.windCD = 10; b._maceCD = tick + 200; rollDive(b, t); b._wmPending = 0; }
  }
};

// ---------- 2) more difficulty levels ----------
(function () {
  const order = [['beginner', ['Beginner', 0.1]], ['easy', DIFFS.easy], ['normal', DIFFS.normal], ['hard', DIFFS.hard], ['insane', DIFFS.insane],
    ['pro', ['Pro', 0.9]], ['god', ['Godlike', 1.0]], ['slider', DIFFS.slider]];
  for (const k of Object.keys(DIFFS)) delete DIFFS[k];
  for (const [k, v] of order) DIFFS[k] = v;
})();
// Pro / Godlike bots make fewer human mistakes on top of the higher skill
const _startGameDiff = startGame;
startGame = function () {
  _startGameDiff();
  if (!game) return;
  const bots = mobs.filter(m => !m.isPlayer);
  bots.forEach((m, i) => {
    const r = CFG.roster[i]; if (!r) return;
    m.diffTier = r.diff;
    if (r.diff === 'pro') m.skill = Math.max(m.skill, 0.88);
    if (r.diff === 'god') m.skill = Math.max(m.skill, 0.97);
  });
};
G.startGame = startGame;
// ---------- 3) bots that stop attacking: watchdog ----------
// If a bot has been near its target for ~3 s without swinging (and isn't legitimately eating / fleeing / using a
// combo), its plan state is reset and it re-engages.
const _swingWatch = swing;
swing = function (e) { e._lastSwingT = tick; _swingWatch(e); };
const _botTickWatch = botTick;
botTick = function (b) {
  _botTickWatch(b);
  if (b.dead || !b.ai || game.countdown > 0) return;
  const t = b.ai.t, X = b.ai.x;
  if (!t || t.dead) { b._idleT = 0; return; }
  const d = Math.hypot(t.x - b.x, t.z - b.z);
  const legit = b.using === 'eat' || b.inWeb || b.stunT > tick || b._macePh || (X && (X.plan === 'flee' || X.plan === 'hide' || X.plan === 'tower') && b.health + b.absorption < 10);
  if (d < 6 && !legit && tick - (b._lastSwingT || 0) > 60) b._idleT = (b._idleT || 0) + 1; else b._idleT = 0;
  if (b._idleT > 1) {
    b._idleT = 0;
    if (X) { X.plan = 'fight'; X.planT = 40; X.seek = null; X.dig = null; X.hide = null; X.tower = null; X.fleeT = 0; X.noHideUntil = tick + 300; }
    b.ai.mode = 'fight'; b.ai.state = 'approach'; b.ai.stateT = 0; b.ai.wtap = 0; b.ai.blockT = 0;
    if (b.hum) { b.hum.hes = 0; b.hum.panic = 0; }
    b._detour = null; b._shHold = 0;
    if (b.using && b.using !== 'eat') { b.using = null; b.useT = 0; }
    if (b.ai.weaponSlot >= 0) holdSlot(b, b.ai.weaponSlot);
    b._lastSwingT = tick; // give it a moment to close in
  }
};
buildMenu();
