// ================= SMART PvP BOT AI =================
const BOT_NAMES = ['ComboKing', 'W_Tapper', 'StrafeLord', 'CritCrusher', 'ClickMaster', 'JitterJoe', 'BlockGod', 'xX_Sweaty_Xx', 'SilentSword',
  'ButterflyBen', 'GappleGoblin', 'ReachRachel', 'BowSpammer', 'NoHitNick', 'SprintSam', 'ToxicTim', 'PotPvP_Pro', 'KnockbackKai'];
const BOT_COLS = [0x8e44ad, 0xd35400, 0x16a085, 0xc0392b, 0x2c3e50, 0xf1c40f, 0x27ae60, 0xe84393, 0x6c5ce7, 0x00b894, 0xe17055, 0x0984e3, 0x636e72, 0xfd79a8, 0x55efc4];
const HAIR = ['#3b2414', '#111111', '#d9b25a', '#7a3a12', '#c0c0c0', '#5a2a5a'];

function pickTarget(b) {
  let best = null, bs = 1e9;
  for (const m of mobs) {
    if (m === b || m.dead || m.team === b.team) continue;
    const d = Math.hypot(m.x - b.x, (m.y - b.y) * 1.5, m.z - b.z);
    let sc = d + b.skill * (m.health + m.absorption) * 0.25;
    if (m === b.ai.t) sc -= 4;               // stick with the current target
    if (m.lastAttacker === b) sc -= 1.5;     // finish what you started
    if (b.lastAttacker === m && tick - b.lastAttackT < 60) sc -= 3; // fight back
    if (sc < bs) { bs = sc; best = m; }
  }
  return best;
}
function hasLOS(b, t) {
  const ox = b.x, oy = b.y + b.eyeH, oz = b.z, dx = t.x - ox, dy = t.y + 1.4 - oy, dz = t.z - oz, d = Math.hypot(dx, dy, dz);
  const h = rayBlocks(ox, oy, oz, dx / d, dy / d, dz / d, d);
  return !h || !isSolid(h.id) || h.dist >= d - 0.3;
}
function aimAt(b, tx, ty, tz, precise) {
  const ai = b.ai, sk = b.skill;
  const ax = tx - b.x, ay = ty - (b.y + b.eyeH), az = tz - b.z;
  const wy = Math.atan2(-ax, az) / DEG, wp = -Math.atan2(ay, Math.hypot(ax, az)) / DEG;
  // human-like aim: drifting error that shrinks with skill
  ai.ex = ai.ex * 0.9 + gauss() * (1 - sk) * 2.4;
  ai.ep = ai.ep * 0.9 + gauss() * (1 - sk) * 1.4;
  const err = precise ? 0.35 : 1;
  const ty2 = wy + ai.ex * (1 + (1 - sk) * 2) * err, tp = wp + ai.ep * err;
  const maxT = 6 + 34 * sk;
  const dyaw = wrapDeg(ty2 - b.yaw), dp = tp - b.pitch;
  b.yaw += clamp(dyaw * (0.3 + 0.6 * sk), -maxT, maxT);
  b.pitch = clamp(b.pitch + clamp(dp * (0.3 + 0.6 * sk), -maxT, maxT), -90, 90);
  return Math.abs(wrapDeg(wy - b.yaw));
}
function newThreshold(b) {
  const sk = b.skill;
  if (sk > 0.55) return 0.9 + Math.random() * 0.1;
  return clamp(0.25 + sk * 1.2 + (Math.random() - 0.5) * 0.4, 0.15, 1);
}
function botTick(b) {
  const ai = b.ai, sk = b.skill, ag = b.aggro;
  let f = 0, s = 0, jump = false, wantSprint = false;
  b.sneaking = false;
  ai.n++;
  if (--ai.retarget <= 0 || !ai.t || ai.t.dead) { ai.t = pickTarget(b); ai.retarget = 15 + ((Math.random() * 20) | 0); }
  const t = ai.t;
  if (--ai.strafeT <= 0) { ai.strafeDir = Math.random() < 0.5 ? -1 : 1; ai.strafeT = 12 + ((Math.random() * (40 - 25 * sk)) | 0); }
  if (!t || game.countdown > 0) {
    if (t) aimAt(b, t.x, t.y + 1.4, t.z);
    b.in = { f: 0, s: 0, jump: false }; return;
  }
  const dx = t.x - b.x, dz = t.z - b.z, dist = Math.hypot(dx, dz), dy = t.y - b.y;
  const hp = b.health + b.absorption;
  const gIdx = b.slotOf('gapple'), bowIdx = b.slotOf('bow');
  // ---- heal decision ----
  if (ai.mode !== 'heal' && gIdx >= 0 && b.absorption <= 0 && b.regenFx <= 0 && hp < 6 + 6 * (1 - ag) + 3 * sk && Math.random() < 0.08 + 0.4 * sk) { ai.mode = 'heal'; ai.modeT = 0; }
  if (ai.mode === 'heal') {
    ai.modeT++;
    if (gIdx < 0 || ai.modeT > 150 || (b.regenFx > 0 && b.using !== 'eat')) { ai.mode = 'fight'; if (b.using === 'eat') b.using = null; }
    else if (dist < 5 + 3 * sk && ai.modeT < 45 && b.using !== 'eat') {
      // run away first
      const fy = Math.atan2(dx, -dz) / DEG;
      b.yaw += clamp(wrapDeg(fy - b.yaw) * 0.5, -30, 30); b.pitch *= 0.8;
      f = 1; wantSprint = true; s = ai.strafeDir * 0.4;
      if (b.onGround && sk > 0.5 && Math.random() < 0.08) jump = true;
    } else {
      b.select(gIdx);
      aimAt(b, t.x, t.y + 1.2, t.z);
      if (b.using !== 'eat') { b.using = 'eat'; b.useT = 0; } else b.useT++;
      if (b.useT % 4 === 0) sfx('eat', b.x, b.y, b.z, 0.7);
      if (b.useT >= 32) { eatGapple(b); ai.mode = 'fight'; }
      f = dist < 4 ? -1 : 0; s = ai.strafeDir;
    }
  } else {
    const canBow = bowIdx >= 0 && b.arrows > 0 && sk > 0.15;
    const los = (ai.n % 5 === 0) ? (ai.los = hasLOS(b, t)) : ai.los;
    const wantBow = canBow && los && dist < 45 && (dist > 14 - (1 - ag) * 3 || (dy > 2.5 && dist > 3.5) || (ai.unreach > 40));
    if (wantBow) {
      // ---------- ranged ----------
      if (b.held !== b.inv[bowIdx]) { b.select(bowIdx); ai.drawTo = sk > 0.6 ? 20 : 12 + ((Math.random() * 9) | 0); }
      const flight = Math.hypot(dist, dy) / 2.9;
      const drop = 0.05 * flight * flight * 0.55;
      const err = aimAt(b, t.x + t.vx * flight * sk, t.y + 1.2 + drop, t.z + t.vz * flight * sk, true);
      if (b.using !== 'bow') { b.using = 'bow'; b.useT = 0; } else b.useT++;
      if (b.useT === 7) setHeldVisual(b);
      if (b.useT >= ai.drawTo && err < 3 + (1 - sk) * 6) { releaseBow(b); ai.drawTo = sk > 0.6 ? 20 : 12 + ((Math.random() * 9) | 0); }
      s = sk > 0.3 ? ai.strafeDir : 0;
      f = dist > 18 ? 1 : ag < 0.4 && dist < 12 ? -0.6 : 0.3; wantSprint = f >= 0.8;
    } else {
      // ---------- melee ----------
      if (b.using === 'bow') { b.using = null; b.useT = 0; }
      if (b.sel !== ai.weaponSlot) b.select(ai.weaponSlot);
      const lead = sk * 1.5;
      const yAim = clamp(b.y + b.eyeH, t.y + 0.4, t.y + 1.6);
      aimAt(b, t.x + t.vx * lead, dist < 4 ? yAim : t.y + 1.4, t.z + t.vz * lead);
      if (--ai.stateT <= 0) { ai.state = dist > 4.5 ? 'approach' : 'wtap'; ai.stateT = 4; }
      if (dist > 4.5 && ai.state !== 'retreat') ai.state = 'approach';
      // combo-break reaction when we just took a clean hit
      if (b.hurtTime === 9 && dist <= 3.2 && Math.random() < 0.25 + 0.45 * sk) {
        const r = Math.random(), lowHp = hp < 8;
        ai.state = (r < 0.35 + 0.4 * ag && !lowHp) ? 'strafe' : 'retreat';
        ai.stateT = ai.state === 'strafe' ? 10 + ((Math.random() * 15) | 0) : 5 + ((Math.random() * (lowHp ? 20 : 8)) | 0);
      }
      const cd = cooldown(b);
      switch (ai.state) {
        case 'approach':
          f = 1; wantSprint = true;
          if (dist > 7 && sk > 0.45) s = Math.sin(ai.n * 0.18) * 0.7; // zig-zag to dodge arrows
          if (dist > 8 && sk > 0.6 && b.onGround && Math.random() < 0.06) jump = true;
          break;
        case 'wtap':
          if (ai.wtap > 0) { f = sk > 0.7 && ai.wtap > 1 ? -1 : 0; ai.wtap--; }
          else { f = 1; wantSprint = true; }
          if (sk > 0.3) s = ai.strafeDir * (0.5 + 0.5 * sk);
          if (!COMBAT18 && sk > 0.4 && cd < 0.7 && dist < 2.6) { f = -1; wantSprint = false; } // spacing while recharging
          if (dist < 1.1) f = -0.6;
          break;
        case 'strafe':
          f = 0.5; s = Math.sin(ai.n * 0.1 + b.id) > 0 ? 1 : -1;
          break;
        case 'retreat':
          f = -1; s = ai.strafeDir * 0.6;
          if (b.onGround && Math.random() < 0.1) jump = true;
          break;
      }
      // ---- attacks ----
      const hit = pickEntity(b, 3.0);
      if (hit) {
        let want;
        if (COMBAT18) {
          const cps = 4 + 9 * sk + 3 * ag + Math.sin(ai.n * 0.3) * 2;
          want = Math.random() < cps / 20;
        } else {
          want = cd >= ai.thr;
          // crit-jumps: hop, then strike on the way down
          if (sk > 0.5 && b.onGround && !ai.critJump && cd > 0.55 && cd < 0.8 && dist < 3.2 && Math.random() < sk * 0.25) { jump = true; ai.critJump = true; }
          if (ai.critJump) { wantSprint = false; if (!b.onGround) want = want && b.fallDistance > 0.05; }
        }
        if (want && ai.blockT <= 0) {
          swing(b); b.swings++;
          attack(b, hit.m, hit.dist);
          ai.thr = newThreshold(b); ai.critJump = false;
          if (Math.random() < 0.3 + 0.65 * sk) ai.wtap = 2 + ((Math.random() * 3) | 0);
          if (COMBAT18 && sk > 0.55 && Math.random() < 0.3 * sk) ai.blockT = 2 + ((Math.random() * 3) | 0);
        }
      } else if (dist < 4.2) {
        // whiffs: weaker bots swing at air (resets the cooldown in 1.9 — punishing)
        if (Math.random() < (COMBAT18 ? 0.25 : 0.06) * (1 - sk)) { swing(b); b.swings++; if (!COMBAT18) b.ticksSinceSwing = 0; }
      }
      if (b.onGround) ai.critJump = false;
      if (ai.blockT > 0 && COMBAT18) { ai.blockT--; b.using = 'block'; } else if (b.using === 'block') b.using = null;
      // can't reach the target (it's towering up / across a gap)
      ai.unreach = (dy > 2.2 && dist < 3.5) || (dist > 3 && Math.hypot(b.vx, b.vz) < 0.01) ? ai.unreach + 1 : Math.max(0, ai.unreach - 2);
    }
  }
  // ---- navigation helpers ----
  if (b.inWater) jump = true;
  if (b.hc && b.onGround && (f !== 0 || s !== 0)) jump = true;
  if (b.inWeb) jump = true;
  if (dy > 0.6 && dist < 2.5 && b.onGround && Math.random() < 0.3) jump = true;
  // edge safety: don't walk/strafe off into the void or a big drop
  if (b.onGround && b.hitStun <= 0 && (f !== 0 || s !== 0)) {
    const yr = b.yaw * DEG;
    const mx = s * Math.cos(yr) - f * Math.sin(yr), mz = f * Math.cos(yr) + s * Math.sin(yr), ml = Math.hypot(mx, mz);
    if (ml > 0.01) {
      const ux = mx / ml, uz = mz / ml, look = 0.55 + Math.hypot(b.vx, b.vz) * 5;
      if (!hasGroundBelow(b.x + ux * look, b.y, b.z + uz * look, 4) && Math.random() < 0.6 + 0.4 * sk) {
        // try the opposite strafe instead; else stop and sneak
        if (s !== 0 && hasGroundBelow(b.x - ux * look, b.y, b.z - uz * look, 4) && f === 0) s = -s;
        else { f = 0; s = 0; wantSprint = false; b.sneaking = sk > 0.4; jump = false; }
        ai.strafeDir = -ai.strafeDir;
      }
    }
  }
  b.in = { f, s, jump };
  if (wantSprint && f >= 0.8 && !b.using && !b.sneaking) b.sprinting = true;
  else if (!wantSprint) b.sprinting = false;
}
