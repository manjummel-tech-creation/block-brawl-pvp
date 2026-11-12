// ================= HUMAN-ERROR BOTS + BOT WIND CHARGES =================
// Bots now play like people, not aimbots:
//  - ~15% lower effective skill overall
//  - shaky aim that drifts, plus occasional flick-misses
//  - they whiff some swings even in range (and a whiff wastes their attack bar, like yours)
//  - they panic in cobwebs: flailing, jumping and spinning before they remember to cut out
//  - sloppier combos: they drop W-taps, mistime jump resets, and sometimes hesitate
// And bots now carry wind charges (escape launches, reaching high ground, blasting you away).

// ---------- skill haircut ----------
const _startGameHuman = startGame;
startGame = function () {
  _startGameHuman();
  if (!game) return;
  for (const m of mobs) if (!m.isPlayer) {
    m.skill = clamp(m.skill * 0.92, 0, 1);
    m.hum = { ax: 0, ay: 0, flick: 0, hes: 0, panic: 0, windCD: tick + 100 };
    const km = KIT_MODES[CFG.kitMode], n = (km && km.set ? km.set.botWind : CFG.botWind) | 0;
    if (n > 0) { const k = m.inv.findIndex(s => !s); if (k >= 0) m.inv[k] = { k: 'wind', n }; }
    m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
  }
};
G.startGame = startGame;
if (CFG.botWind === undefined) CFG.botWind = 4; DEF.botWind = 4;
for (const k in KIT_MODES) { const s = KIT_MODES[k].set; if (s && s.botWind === undefined) s.botWind = k === 'mace' ? 8 : k === 'smp' ? 6 : 0; }

// ---------- shaky aim ----------
const _aimAtHuman = aimAt;
aimAt = function (b, tx, ty, tz, precise) {
  const err = _aimAtHuman(b, tx, ty, tz, precise);
  const h = b.hum; if (!h) return err;
  const sk = b.skill;
  h.ax = h.ax * 0.93 + gauss() * (0.6 + (1 - sk) * 1.3);   // slow drift (degrees)
  h.ay = h.ay * 0.93 + gauss() * (0.35 + (1 - sk) * 0.8);
  if (h.flick <= 0 && Math.random() < 0.006 + 0.012 * (1 - sk)) h.flick = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10); // overshoot
  b.yaw += h.ax * 0.35 + h.flick; b.pitch = clamp(b.pitch + h.ay * 0.3, -90, 90);
  h.flick *= 0.6; if (Math.abs(h.flick) < 0.3) h.flick = 0;
  return err + Math.abs(h.ax) * 0.5;
};

// ---------- whiffs ----------
const _attackHuman = attack;
attack = function (a, t, reach) {
  if (!a.isPlayer && a.hum) {
    const miss = 0.12 + 0.18 * (1 - a.skill);
    if (Math.random() < miss) { if (!COMBAT18) a.ticksSinceSwing = 0; sfx('swing', a.x, a.y, a.z, 0.7); return false; }
  }
  return _attackHuman(a, t, reach);
};

// ---------- panic, sloppy combos, hesitation, wind charges ----------
function botThrowWind(b, pitch, yawOverride) {
  const i = b.inv.findIndex(s => s && s.k === 'wind' && s.n > 0);
  if (i < 0 || (b.windCD || 0) > 0) return false;
  const keepSel = b.sel, keepPitch = b.pitch, keepYaw = b.yaw;
  b.sel = i; b.pitch = pitch; if (yawOverride !== undefined) b.yaw = yawOverride;
  const ok = throwWind(b);
  b.sel = keepSel; setHeldVisual(b);
  if (yawOverride !== undefined) b.yaw = keepYaw;
  if (pitch > 60) b.pitch = keepPitch;
  return ok;
}
const _botTickHuman = botTick;
botTick = function (b) {
  const h = b.hum;
  if (!h || b.dead || game.countdown > 0) return _botTickHuman(b);
  // cobweb panic: flail before cutting out (worse players panic longer)
  if (b.inWeb) {
    // only sometimes (15-35% of webs, more for weaker bots), and briefly (0.3-0.8 s)
    if (!h.panic) h.panic = Math.random() < 0.15 + 0.2 * (1 - b.skill) ? 6 + ((Math.random() * 10) | 0) : -1;
    if (h.panic > 0) {
      h.panic--;
      b.in = { f: Math.random() < 0.6 ? 1 : -1, s: Math.random() < 0.5 ? 1 : -1, jump: Math.random() < 0.5 };
      b.yaw += (Math.random() - 0.5) * 50; b.pitch = clamp(b.pitch + (Math.random() - 0.5) * 30, -60, 60);
      if (Math.random() < 0.15) swing(b);
      b.sprinting = false;
      return;
    }
  } else h.panic = 0;
  // hesitation: every so often a bot freezes up for a moment
  if (h.hes > 0) { h.hes--; _botTickHuman(b); b.in = { f: 0, s: b.in.s * 0.5, jump: false }; b.sprinting = false; return; }
  if (Math.random() < 0.002 + 0.005 * (1 - b.skill)) h.hes = 5 + ((Math.random() * 10) | 0);
  _botTickHuman(b);
  // sloppy combos: drop W-taps and strafes sometimes
  if (b.ai.wtap > 0 && Math.random() < 0.2) b.ai.wtap = 0;
  if (Math.random() < 0.05) b.ai.strafeDir = -b.ai.strafeDir;
  // wind charges
  const t = b.ai.t;
  if (t && !t.dead && tick > h.windCD && !b.using && !(b.stunT > tick) && b.onGround) {
    const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz), dy = t.y - b.y, hp = b.health + b.absorption;
    const toward = Math.atan2(-dx, dz) / DEG, away = toward + 180;
    let used = false;
    if (hp < 7 && d < 4 && Math.random() < 0.08) {            // panic escape: launch away
      used = botThrowWind(b, 70, away + (Math.random() - 0.5) * 30);
      if (used) { b.vx += -Math.sin(away * DEG) * 0.3; b.vz += Math.cos(away * DEG) * 0.3; }
    } else if (dy > 2.5 && d < 6 && Math.random() < 0.06) { // reach high ground
      used = botThrowWind(b, 88);
    } else if (d > 4 && d < 10 && Math.abs(dy) < 3 && Math.random() < 0.012 + 0.02 * b.skill) { // blast you away
      used = botThrowWind(b, clamp(-Math.atan2(t.y + 0.5 - (b.y + b.eyeH), d) / DEG, -30, 30), toward + gauss() * (4 + 8 * (1 - b.skill)));
    }
    if (used) h.windCD = tick + 80 + ((Math.random() * 80) | 0);
  }
};
// jump resets: worse timing than before
const _tryJumpResetHuman = tryJumpReset;
tryJumpReset = function (e) {
  if (!e.isPlayer && e.hum && Math.random() < 0.3) { e.jumpResetDone = true; return false; }
  return _tryJumpResetHuman(e);
};
(function () {
  const rows = MENU[2].rows, i = rows.findIndex(x => x[0] === 'botPots');
  rows.splice(i + 1, 0, ['botWind', 'Bot wind charges', 'rng', [0, 16, 1]]);
})();
buildMenu();
