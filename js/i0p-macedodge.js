// ================= BOTS DODGE MACE DIVES (better) =================
// Anyone diving with a mace (you, or another bot) is tracked every tick: where will they land, and how long until they hit?
// A bot that is under that spot decides (by skill) to sidestep, but waits until the last second or so (a tick or two too early and the diver
// just follows) while still leaving enough time to clear the landing spot. It turns across the dive line and sprint-jumps to the side that has floor,
// holds the side-step, switches direction at the last moment (the diver aims ahead of where you are running), and if there is no safe side (or the roll says no) it raises its shield facing the diver.
// Settings -> "Bots dodge mace dives" turns it off.
if (CFG.botDodge === undefined) CFG.botDodge = true; DEF.botDodge = true;
let DIVERS = [];
const _gameTickDodge = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickDodge();
  if (tick === t0) return;
  DIVERS.length = 0;
  for (const o of mobs) if (!o.dead && !o.onGround && !o.inWater && !o.inWeb && o.held && o.held.k === 'mace' && (o.vy < -0.12 || (o.gliding && o.vy < 0.3))) DIVERS.push(o);   // diving, or gliding in to dive
};
function diveEta(o, b) {                       // ticks until the diver reaches head height of b, and where it will be then
  if (o.gliding) return 12;                    // a glider folds its wings and drops about a dozen ticks later
  let y = o.y, vy = o.vy, n = 0; const top = b.y + 1.2;
  while (y > top && n < 70) { vy = (vy - 0.08 - (CFG.heavy ? 0.022 : 0)) * 0.98; y += vy; n++; }
  return n;
}
const _botTickDodge = botTick;
botTick = function (b) {
  _botTickDodge(b);
  if (!CFG.botDodge || !DIVERS.length || b.dead || !b.ai || b.isPlayer || game.countdown > 0 || b.inWeb || b.stunT > tick || b.inWater) return;
  const D = b._dm;
  if (D && tick < D.until) { dodgeAct(b, D); return; }
  if (D && tick >= D.until) b._dm = null;
  const sk = b.skill || 0.5;
  for (const o of DIVERS) {
    if (o === b || o.team === b.team) continue;
    const h = o.y - b.y; if (h < 1.5 || h > 45) continue;
    const dx0 = b.x - o.x, dz0 = b.z - o.z, d0 = Math.hypot(dx0, dz0); if (d0 > 11) continue;
    const eta = diveEta(o, b), lx = o.x + o.vx * eta, lz = o.z + o.vz * eta;
    const miss = Math.hypot(lx - b.x, lz - b.z);
    const aimed = o.gliding || lookingAt(o, b, 35) || d0 < 3;
    if (!(miss < 3.6 || (aimed && d0 < 6))) continue;
    if (!b._dmRoll || b._dmRoll.o !== o.id || tick - b._dmRoll.t > 90) b._dmRoll = { o: o.id, t: tick, go: Math.random() < 0.5 + 0.45 * sk, late: 20 + Math.round(sk * 8) + ((Math.random() * 5) | 0), react: Math.round((1 - sk) * 5) };
    const R = b._dmRoll;
    if (eta > R.late + R.react) { b._dmWatch = o; return; }                   // not yet: keep fighting, but it has noticed
    // choose the side-step: across the line from the diver to me, towards the side that has floor
    const L = d0 > 0.3 ? d0 : 1, px = -dz0 / L, pz = dx0 / L;                     // perpendicular to the dive line
    const side = s => hasGroundBelow(b.x + px * s * 1.5, b.y, b.z + pz * s * 1.5, 3) && hasGroundBelow(b.x + px * s * 3.2, b.y, b.z + pz * s * 3.2, 3) && !isSolid(getB(b.x + px * s * 1.0, b.y + 0.5, b.z + pz * s * 1.0));
    const pref = (b.in && b.in.s) ? Math.sign(b.in.s) : (Math.random() < 0.5 ? 1 : -1);
    const s = side(pref) ? pref : side(-pref) ? -pref : 0;
    if (R.go && s) b._dm = { until: tick + 26, dx: px * s, dz: pz * s, o, shield: false, flipAt: tick + Math.max(3, Math.min(14, eta - 6 - ((Math.random() * 3) | 0))), flipped: false, side: s, px, pz };
    else if (b.shield && tick >= (b.shieldCD || 0)) b._dm = { until: tick + Math.max(6, eta + 4), dx: 0, dz: 0, o, shield: true };
    else return;
    b._dmCount = (b._dmCount || 0) + 1; dodgeAct(b, b._dm); return;
  }
};
function dodgeAct(b, D) {
  if (b.using) { b.using = null; b.useT = 0; }
  if (D.shield) {                                                              // can't get out of the way: turtle behind the shield, facing the diver
    lookAt(b, D.o.x, D.o.y, D.o.z, 60);
    b.shieldUp = true; b.shieldT = (b.shieldT || 0) + 1; b.sprinting = false; b.in = { f: 0, s: 0, jump: false }; return;
  }
  // juke: the diver steers in the air and leads its aim by where you are running, so a late switch of direction leaves it overshooting
  if (!D.flipped && tick >= D.flipAt && hasGroundBelow(b.x - D.px * D.side * 1.5, b.y, b.z - D.pz * D.side * 1.5, 3) && !isSolid(getB(b.x - D.px * D.side, b.y + 0.5, b.z - D.pz * D.side))) {
    D.flipped = true; D.dx = -D.px * D.side; D.dz = -D.pz * D.side; if (b.onGround) b.vy = 0.42;
  }
  const want = Math.atan2(-D.dx, D.dz) / DEG;
  b.yaw += clamp(wrapDeg(want - b.yaw), -70, 70);
  b.pitch *= 0.5;
  if (b.shieldUp) lowerShield(b);
  b.sprinting = true;
  b.in = { f: 1, s: 0, jump: b.onGround && D.until - tick > 6 && Math.random() < 0.8 };
}
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'botMace'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['botDodge', 'Bots dodge mace dives (side-step late, or shield up)', 'tg']); break; } }
})();
buildMenu();
