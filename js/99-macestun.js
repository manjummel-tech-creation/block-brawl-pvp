// ================= MACE SMASH STUNS FOR 1.5-2.5 SECONDS =================
// A smashed target can't move, jump or attack for 1-2 s (stars spin over their head).
const _attackStun = attack;
attack = function (a, t, reach) {
  if (a.stunT > tick) return false; // stunned people can't hit back
  const smash = a.held && a.held.k === 'mace' && !a.onGround && a.fallDistance > 1.5;
  const r = _attackStun(a, t, reach);
  if (r && smash && !t.dead) {
    const dur = 30 + ((Math.random() * 21) | 0); // 1.5 - 2.5 s
    t.stunT = tick + dur; t.hitStun = dur;
    if (t.using) { t.using = null; t.useT = 0; }
  }
  return r;
};
const _botTickStun = botTick;
botTick = function (b) {
  if (b.stunT > tick) {
    b.in = { f: 0, s: 0, jump: false }; b.sprinting = false; b.sneaking = false;
    if (b.using) { b.using = null; b.useT = 0; }
    if (tick % 3 === 0) { const a = tick * 0.5; spawnP(b.x + Math.cos(a) * 0.4, b.y + 2.05, b.z + Math.sin(a) * 0.4, 0, 0, 0, '#ffe066', 0.25, 0.08, 0); }
    return;
  }
  _botTickStun(b);
};
const _playerControlStun = playerControl;
playerControl = function (p) {
  if (p.stunT > tick) { clickQ = 0; placePress = usePress = false; p.in = { f: 0, s: 0, jump: false }; p.sprinting = false; return; }
  _playerControlStun(p);
};

// ================= DIVE PROTECTION =================
// While you're coming down from a fall (1+ block, moving downward), bots can't hit you,
// so nothing knocks you off course before your smash lands.
function diving(m) { return !m.onGround && !m.inWater && m.vy < 0 && m.fallDistance > 1; }
const _attackDive = attack;
attack = function (a, t, reach) {
  if (!a.isPlayer && t === player && diving(t)) return false;
  return _attackDive(a, t, reach);
};
