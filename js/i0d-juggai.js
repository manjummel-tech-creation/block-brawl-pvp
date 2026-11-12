// ================= CRASH GUARD · SMARTER JUGGERNAUT ARMY =================

// ---------- crash fix: never try to mine a block id that doesn't exist (world edge / unloaded cell) ----------
// ("Cannot read properties of undefined (reading 'hard')" spam)
const _tickMiningGuard = tickMining;
tickMining = function (e, hit) { if (!hit || !BL[hit.id]) return; return _tickMiningGuard(e, hit); };

// ---------- 1) the army has ranks: elites (really good), veterans, and mediocre grunts ----------
const JA = { mace: 0, bow: 0, melee: 0, told: {} };          // how YOU fight (decays over time)
const _startGameJA = startGame;
startGame = function () {
  _startGameJA();
  JA.mace = JA.bow = JA.melee = 0; JA.told = {};
  if (!JUGG || !game || !game.jugg) return;
  const army = mobs.filter(m => !m.isPlayer);
  army.forEach((b, i) => {
    const r = Math.random();
    b.rank = r < 0.22 ? 'elite' : r < 0.6 ? 'vet' : 'grunt';
    b.skill = b.rank === 'elite' ? 0.92 + Math.random() * 0.08 : b.rank === 'vet' ? 0.7 + Math.random() * 0.12 : 0.38 + Math.random() * 0.17;
    if (b.rank === 'elite') { b.shield = true; b._hider = Math.random() < 0.6; }
    if (b.rank === 'grunt') b._hider = Math.random() < 0.25;
    b.name = (b.rank === 'elite' ? '★ ' : b.rank === 'vet' ? '' : '· ') + b.name.replace(/^[★·] /, '');
    b._ja = null;
    drawTag(b);
  });
  const e = army.filter(b => b.rank === 'elite').length, v = army.filter(b => b.rank === 'vet').length;
  feed(`The army: ${e} ★ elites, ${v} veterans, ${army.length - e - v} grunts. They learn how you fight.`, '#ffb070');
};
G.startGame = startGame;

// ---------- 2) they watch how you fight ----------
const _attackJA = attack;
attack = function (a, t, reach) {
  const r = _attackJA(a, t, reach);
  if (r && a === player && JUGG && game && game.jugg) {
    if (a.held && a.held.k === 'mace' && a.fallDistance > 1.5) JA.mace += 1; else JA.melee += 0.5;
  }
  return r;
};
const _releaseBowJA = releaseBow;
releaseBow = function (e, ...rest) { const r = _releaseBowJA(e, ...rest); if (e === player && JUGG) JA.bow += 1; return r; };
const _gameTickJA = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickJA();
  if (tick === t0 || !JUGG || !game || !game.jugg) return;
  if (tick % 20 === 0) { JA.mace *= 0.985; JA.bow *= 0.985; JA.melee *= 0.985; }
  const tell = (k, msg) => { if (!JA.told[k]) { JA.told[k] = true; feed(msg, '#ffb070'); } };
  if (JA.mace > 3) tell('mace', 'The army has noticed your mace: they spread out, dodge and raise shields when you dive.');
  if (JA.bow > 6) tell('bow', 'The army has noticed your bow: they zig-zag and close in through cover.');
  if (JA.melee > 8) tell('melee', 'The army has noticed you rush in: elites fake retreats and bait you into traps.');
};

// ---------- 3) behaviour ----------
function jaDigCell(b) { return { x: Math.floor(b.x), y: Math.floor(b.y + 0.01), z: Math.floor(b.z) }; }
const _botTickJA = botTick;
botTick = function (b) {
  const S0 = b._ja;
  if (!(S0 && (S0.mode === 'dig' || S0.mode === 'lurk') && JUGG && !b.dead)) _botTickJA(b);   // while dug in, the ambush is in full control
  else { const X = b.ai && b.ai.x; if (X) { X.hide = null; X.dig = null; X.tower = null; X.seek = null; } }
  if (!JUGG || !game || !game.jugg || b.dead || !b.ai || !player || player.dead || game.countdown > 0 || !b.rank) return;
  if (b.inWeb || b.stunT > tick || b.using === 'eat' || b._macePh) { if (b._ja && b._ja.mode !== 'lurk') b._ja = null; return; }
  const P = player, dx = P.x - b.x, dz = P.z - b.z, d = Math.hypot(dx, dz), dy = P.y - b.y, sk = b.skill;
  const S = b._ja;

  // --- dig-in ambush (elites + some veterans): dig 2 down where you'll walk, lurk, then burst out and jump-crit you ---
  if (S && (S.mode === 'dig' || S.mode === 'lurk')) {
    b.in = { f: 0, s: 0, jump: false }; b.sprinting = false; b.sneaking = S.mode === 'lurk' && b.onGround && getB(Math.floor(b.x), Math.floor(b.y + 0.01) - 1, Math.floor(b.z)) !== 0;
    if (S.mode === 'dig') {
      S.t++;
      if (S.cx === undefined) { S.cx = Math.floor(b.x) + 0.5; S.cz = Math.floor(b.z) + 0.5; }
      b.x += (S.cx - b.x) * 0.6; b.z += (S.cz - b.z) * 0.6; b.vx = 0; b.vz = 0;   // stand in the middle of the hole so you actually drop in
      if (S.t % 4 === 0) swing(b);
      if (S.t % 10 === 0) {
        const c = jaDigCell(b), id = getB(c.x, c.y - 1, c.z);
        if (id && id !== 255 && BL[id] && BL[id].hard >= 0 && BL[id].hard <= 3 && id !== B.WATER) {
          setB(c.x, c.y - 1, c.z, 0); sfx('brk', c.x + 0.5, c.y - 0.5, c.z + 0.5);
          burst(c.x + 0.5, c.y - 0.5, c.z + 0.5, 14, BL[id].color, 2, 0.6, 0.08, 10);
        } else S.depth = 9;
        if (++S.depth >= 2) { S.mode = 'lurk'; S.t = 0; }
      }
    } else {
      S.t++;
      lookAt(b, P.x, P.y + 1.4, P.z, 20);
      // you came close: burst out (wind charge if they have one, otherwise a big jump) and go for the crit
      if (d < 4.2 || S.t > 500) {
        const hadWind = b.inv.some(i => i && i.k === 'wind' && i.n > 0) && typeof botThrowWind === 'function' && botThrowWind(b, 89);
        if (!hadWind) { b.vy = 0.78; b.onGround = false; }
        b._ja = { mode: 'pounce', t: 0 }; b.sneaking = false;
        const X = b.ai.x; if (X) { X.plan = 'fight'; X.planT = 60; X.hide = null; X.dig = null; X.tower = null; }
      }
    }
    return;
  }
  if (S && S.mode === 'pounce') {
    if (++S.t > 30 || b.onGround && S.t > 6) { b._ja = null; return; }
    lookAt(b, P.x, P.y + 1.1, P.z, 180); b.in = { f: d > 0.8 ? 1 : 0, s: 0, jump: false }; b.sprinting = true;
    if (b.vy < 0 && d < 3.2 && cooldown(b) > 0.8) { const h = pickEntity(b, 3); if (h && h.m === P) { swing(b); attack(b, P, h.dist); b._ja = null; } }
    return;
  }
  // --- fake retreat: turn and run, then whip round with a sprint-jump crit when you over-commit ---
  if (S && S.mode === 'feint') {
    S.t++;
    if (S.t < S.len) {
      lookAt(b, b.x - dx, b.y + 1.5, b.z - dz, 180); b.in = { f: 1, s: S.t % 16 < 8 ? 0.3 : -0.3, jump: false }; b.sprinting = true;
      if (b.shieldUp) lowerShield(b);
    } else {
      lookAt(b, P.x, P.y + 1.2, P.z, 180);
      b.in = { f: 1, s: 0, jump: d < 4 && b.onGround }; b.sprinting = true;
      if (S.t > S.len + 25) b._ja = null;
    }
    return;
  }

  const elite = b.rank === 'elite', vet = b.rank === 'vet';
  // start an ambush: you're coming their way, they're alone-ish and on diggable ground
  if ((elite || (vet && Math.random() < 0.4)) && d > 9 && d < 22 && b.onGround && tick > (b._jaCD || 0) && Math.random() < (elite ? 0.012 : 0.004)) {
    const c = jaDigCell(b), a1 = getB(c.x, c.y - 1, c.z), a2 = getB(c.x, c.y - 2, c.z), fl = getB(c.x, c.y - 3, c.z);
    if ([a1, a2].every(id => id && id !== 255 && BL[id] && BL[id].hard >= 0 && BL[id].hard <= 3 && id !== B.WATER) && isSolid(fl) && fl !== B.WATER) {
      b._ja = { mode: 'dig', t: 0, depth: 0 }; b._jaCD = tick + 600; return;
    }
  }
  // fake retreat when you chase them in close (more often if you like to rush in)
  if ((elite || vet) && d > 2.2 && d < 5.5 && Math.abs(dy) < 1.5 && tick > (b._jaFeintCD || 0) && b.onGround) {
    const chasing = (P.vx * -dx + P.vz * -dz) / (d || 1) < -0.08;      // you're moving toward them
    const p = (elite ? 0.02 : 0.008) * (1 + Math.min(2, JA.melee / 6));
    if (chasing && Math.random() < p) { b._ja = { mode: 'feint', t: 0, len: 14 + ((Math.random() * 10) | 0) }; b._jaFeintCD = tick + 240; return; }
  }
  // adapt to your mace: when you're diving at them, sidestep out from under you (elites always try, others sometimes)
  if (P.held && P.held.k === 'mace' && !P.onGround && P.vy < -0.05 && d < 4.5 && dy > 1.5 && !b.shieldUp) {
    const want = elite ? 0.9 : vet ? 0.35 + Math.min(0.4, JA.mace * 0.05) : 0.1 + Math.min(0.3, JA.mace * 0.04);
    if (!b._dodgeRoll || tick > b._dodgeRoll.until) b._dodgeRoll = { until: tick + 30, go: Math.random() < want, side: Math.random() < 0.5 ? 1 : -1 };
    if (b._dodgeRoll.go) { b.in = { f: -0.6, s: b._dodgeRoll.side, jump: false }; b.sprinting = true; }
  }
  // adapt to your mace: don't bunch up under you (one smash won't hit three of them)
  if (JA.mace > 3 && d < 6) {
    for (const o of mobs) if (o !== b && !o.dead && !o.isPlayer && Math.hypot(o.x - b.x, o.z - b.z) < 1.8) { b.in.s = (b.in.s || 0) + (((o.x - b.x) * dz - (o.z - b.z) * dx) > 0 ? -0.6 : 0.6); break; }
  }
  // adapt to your bow: zig-zag on the way in
  if (JA.bow > 4 && d > 7 && d < 30 && b.in.f > 0) { b.in.s = Math.sin(tick / (6 + sk * 4) + b.id) > 0 ? 1 : -1; if (b.onGround && (tick + b.id) % 23 === 0) b.in.jump = true; }
  // grunts are mediocre: slower to react, sometimes hesitate
  if (b.rank === 'grunt' && d < 6 && (tick + b.id * 7) % 60 < 8) { b.in = { f: 0, s: b.in.s * 0.5, jump: false }; b.sprinting = false; }
};
const _toMenuJA = toMenu;
toMenu = function () { for (const m of mobs) m._ja = null; _toMenuJA(); };
