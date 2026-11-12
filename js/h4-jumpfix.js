// ================= FIXES: bots stop hopping around instead of swinging · juggernaut armour · more wind charges =================
// Bots in melee range were airborne ~70% of the time (crit-jumps + strafe-jumps). Every time you knocked one mid-hop
// the combo lock stopped it swinging until it landed -> "jumping around me but not hitting". Now they mostly stay
// grounded in melee and only jump when they need to (walls, water, jump-resets, chasing you up).
const _botTickNoHop = botTick;
botTick = function (b) {
  _botTickNoHop(b);
  if (b.dead || !b.ai || !b.in || !b.in.jump || !b.onGround || b.hc || b.inWater || b.inWeb) return;
  const X = b.ai.x; if (X && BUILD_PLANS[X.plan]) return;
  const t = b.ai.t; if (!t || t.dead) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z), dy = t.y - b.y;
  if (d < 6 && dy < 0.8 && Math.random() < 0.88) b.in = { f: b.in.f, s: b.in.s, jump: false };
};
// Juggernaut: your armour lasts much longer (a piece breaks every 100 hits instead of 35)
const _startGameArmorJ = startGame;
startGame = function () { _startGameArmorJ(); if (game && game.jugg && player) player.armorEvery = 100; };
G.startGame = startGame;
// wind charges: sliders go up to 128, and you start with 128
if (!CFG._v8) { CFG.windCharges = 128; CFG._v8 = 1; saveCfg(); }
for (const sec of MENU) for (const r of sec.rows) if ((r[0] === 'windCharges' || r[0] === 'botWind') && r[2] === 'rng') r[3] = [0, 128, 1];
for (const k in KIT_MODES) { const s = KIT_MODES[k].set; if (s && s.windCharges) s.windCharges = 128; }
buildMenu();
