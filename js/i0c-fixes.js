// ================= JUMP-ONLY CRITS · BOT MACE AIM · BOTS SHIELD MACE DIVES · STICKY PLAY BUTTON =================

// ---------- 1) crits only from jump crits (in the air, falling) — a full bar on the ground is no longer a crit ----------
isCrit = function (a) {
  if (!CFG.crits) return false;
  return !a.onGround && !a.inWater && !a.inWeb && !a.gliding && a.vy < 0;
};

// ---------- 2) bots keep landing mace smashes (not just the first one) ----------
// before: ~45% of dives were scripted misses, the aim led far ahead of a moving target, and they ran out of wind charges
rollDive = function (b, t) {
  const p = t.inWeb ? 0.9 : 0.65 + 0.25 * (b.skill || 0.5);
  if (Math.random() < p) b._diveMiss = null;
  else { const a = Math.random() * 6.283, r = 1.4 + Math.random() * 1.0; b._diveMiss = [Math.cos(a) * r, Math.sin(a) * r]; }
};
const _botTickMaceAim = botTick;
botTick = function (b) {
  const t = b.ai && b.ai.t;
  // close in on the dive: aim where you are, not 2 ticks of velocity ahead
  if (b._macePh === 'dive' && t && !t.dead && Math.hypot(t.x - b.x, t.z - b.z) < 3.5) {
    const vx = t.vx, vz = t.vz; t.vx *= 0.25; t.vz *= 0.25;
    try { _botTickMaceAim(b); } finally { t.vx = vx; t.vz = vz; }
  } else _botTickMaceAim(b);
  if (b.dead || !b.inv) return;
  // wind charges trickle back for mace bots (1 every 15 s, up to 3), so the combos don't stop for the rest of the match
  if (b.inv.some(i => i && i.k === 'mace') && tick % 20 === 0) {
    const w = b.inv.find(i => i && i.k === 'wind');
    if (tick >= (b._windBack || 0) && (!w || w.n < 3)) {
      b._windBack = tick + 300;
      if (w) w.n++; else { const k = b.inv.findIndex(s => !s); if (k >= 0) b.inv[k] = { k: 'wind', n: 1 }; }
    }
  }
};

// ---------- 3) bots with a shield can block a mace smash coming down on them ----------
const _botTickMaceShield = botTick;
botTick = function (b) {
  _botTickMaceShield(b);
  if (!b.shield || b.dead || !b.ai || !game || game.countdown > 0 || b.inWeb || b.stunT > tick || b.using === 'eat' || tick < (b.shieldCD || 0)) return;
  if (b._mBlockA && b._shHold > 0) {           // keep facing the diver while the shield is up
    const a = b._mBlockA; lookAt(b, a.x, a.y + 1, a.z, 90); return;
  }
  b._mBlockA = null;
  if (tick < (b._mBlockNext || 0)) return;
  for (const a of mobs) {
    if (a === b || a.dead || a.team === b.team || !a.held || a.held.k !== 'mace' || a.onGround || a.vy >= -0.05) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > 4.5 || a.y - b.y < 1.5 || maceHeight(a) < 2) continue;
    b._mBlockNext = tick + 50;                 // one roll per dive
    if (Math.random() < 0.22 + 0.25 * (b.skill || 0.5)) {
      b._mBlockA = a; b._shHold = 14; b._shT = 5; b.shieldUp = true; b.shieldT = 5;
      lookAt(b, a.x, a.y + 1, a.z, 90);
    }
    break;
  }
};
const _hurtMaceShieldMsg = hurt;
hurt = function (t, amount, src) {
  const a = src && src.att, blk = a && a.held && a.held.k === 'mace' && !t.isPlayer && t._mBlockA === a && isBlocking(t);
  const r = _hurtMaceShieldMsg(t, amount, src);
  if (blk && a === player) feed(`${t.name} blocked your mace with a shield!`, '#ffaa55');
  return r;
};

// ---------- 4) the PLAY button stays on screen while you scroll the settings ----------
(function () {
  const s = document.createElement('style');
  s.textContent = '#menu #play{position:sticky!important;bottom:14px!important;top:auto!important;left:auto!important;transform:none!important;margin:12px auto 0!important;display:block;z-index:20;box-shadow:0 0 0 4px rgba(0,0,0,.55),0 6px 18px rgba(0,0,0,.6)}';
  document.head.appendChild(s);
})();
