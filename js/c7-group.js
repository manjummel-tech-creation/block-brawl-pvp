// ================= GROUP FIGHTS (1v4+) =================
function enemiesNear(m, r) { let n = 0; for (const o of mobs) if (!o.dead && o.team !== m.team && Math.hypot(o.x - m.x, o.z - m.z) < r) n++; return n; }
// 1) Outnumbered = less knockback for you: 3 enemies near -> 75%, 4+ -> 55%
function groupKbScale() { if (!player || player.dead) return 1; const n = enemiesNear(player, 16); return n >= 4 ? 0.55 : n === 3 ? 0.75 : 1; }
const _knockbackGroup = knockback;
knockback = function (t, s, xr, zr) {
  if (t === player && !t._kbScaling) s *= groupKbScale();
  _knockbackGroup(t, s, xr, zr);
};
const _attackGroup = attack;
attack = function (a, t, reach) {
  if (t !== player) return _attackGroup(a, t, reach);
  const k = groupKbScale(), vx = t.vx, vy = t.vy, vz = t.vz;
  t._kbScaling = true;
  const r = _attackGroup(a, t, reach);
  t._kbScaling = false;
  if (r && k < 1) { t.vx = vx + (t.vx - vx) * k; t.vz = vz + (t.vz - vz) * k; if (t.vy > vy) t.vy = vy + (t.vy - vy) * k; }
  return r;
};
// 2) A bot whose totem pops in a group fight runs away from the group to recover instead of charging back in
const _dieGroup = die;
die = function (t, src) {
  const before = t.totems || 0;
  _dieGroup(t, src);
  if (t.dead || t.isPlayer || (t.totems || 0) >= before || !t.ai || !t.ai.x) return;
  const group = CFG.mode === 'teams' || enemiesNear(t, 12) >= 2;
  if (!group) return; // 1v1: keep the "second wind" counter-attack
  t.secondWindUntil = 0; if (t.baseAggro !== undefined) t.aggro = t.baseAggro;
  const X = t.ai.x;
  X.plan = 'flee'; X.planT = 10; X.fleeT = 0; X.hitRun = false; X.seek = null; X.dig = null; X.hide = null; X.tower = null;
  t.ai.mode = 'fight';
  // flee from the nearest enemy (doFlee runs directly away from the target)
  let best = null, bd = 1e9;
  for (const o of mobs) if (!o.dead && o.team !== t.team) { const d = Math.hypot(o.x - t.x, o.z - t.z); if (d < bd) { bd = d; best = o; } }
  if (best) { t.ai.t = best; X.rt = 60; }
};
