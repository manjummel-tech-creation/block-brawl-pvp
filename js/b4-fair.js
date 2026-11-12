// ================= FAIR FIGHTS: equal reach, no bot spam, no bot combo-lock on you, no visual lag =================
// 1) Reach: everyone (you and bots) hits from exactly 3.0 blocks, measured the same way (eye -> hitbox).
// 2) Bots can't spam-click: in 1.9+ they must charge to 85% before a hit counts; in 1.8 they're capped at 10 CPS.
const _attackFair = attack;
attack = function (a, t, reach) {
  if (!a.isPlayer) {
    if (!COMBAT18 && cooldown(a) < 0.85 && !(a.held && a.held.k === 'mace')) return false;
    if (COMBAT18 && tick - (a._lastAtkT || -99) < 2) return false;
    a._lastAtkT = tick;
  }
  const r = _attackFair(a, t, reach);
  if (r && t === player) { lastHitTaken = { by: a.name, reach: reach || 0, t: performance.now() }; }
  return r;
};
let lastHitTaken = null;
// 3) The combo lock only applies to bots: if a bot knocks you up you can still hit back.
const _knockbackFair = knockback;
knockback = function (t, s, xr, zr) { _knockbackFair(t, s, xr, zr); if (t === player) t.comboAir = false; };
// 4) No visual lag: draw bots (and your camera) where they really are this tick instead of one tick behind,
//    so the distance you SEE is the distance the game uses for hits.
const _updateModelsFair = updateModels;
updateModels = function (alpha) {
  _updateModelsFair(alpha);
  for (const m of mobs) {
    if (m.dead || !m.parts || m.isPlayer) continue;
    const k = Math.min(alpha, 1);
    m.parts.root.position.set(m.x + m.vx * k, m.y + (m.onGround ? 0 : m.vy * k) - (m.sneaking ? 0.12 : 0), m.z + m.vz * k);
  }
};
const _updateCameraFair = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraFair(alpha, dt);
  const p = player;
  if (!p || p.dead || state !== 'play' || thirdPerson) return;
  // shift the camera from the interpolated position to the live one (keeps head-bob / view-model intact)
  const ix = lerp(p.px, p.x, alpha), iz = lerp(p.pz, p.z, alpha), iy = lerp(p.py, p.y, alpha);
  const k = Math.min(alpha, 1);
  camera.position.x += p.x + p.vx * k - ix;
  camera.position.z += p.z + p.vz * k - iz;
  camera.position.y += p.y + (p.onGround ? 0 : p.vy * k) - iy;
};
// 5) Show the reach of the last hit you took, so you can check it
const _drawHUDFair = drawHUD;
drawHUD = function (a) {
  _drawHUDFair(a);
  if (state !== 'play' || !game || !player || !lastHitTaken) return;
  if (performance.now() - lastHitTaken.t < 2500) txt(`Hit by ${lastHitTaken.by} from ${lastHitTaken.reach.toFixed(2)} blocks`, W / 2, H - 150, 18, '#ffb0b0', 'center');
};
// bots in 1.9+ never even try to swing before 85% charge (no fake spam swings)
const _newThresholdFair = newThreshold;
newThreshold = function (b) { return Math.max(0.85, _newThresholdFair(b)); };
const _startGameFair = startGame;
startGame = function () { _startGameFair(); if (game) for (const m of mobs) if (m.ai) m.ai.thr = newThreshold(m); };
G.startGame = startGame;
