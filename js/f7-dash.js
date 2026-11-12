// ================= DASH / LUNGE (key R) =================
// Press the dash key to lunge forward like a spear charge (~8 blocks). Run into an enemy during the lunge and you
// hit them as hard as a charged sword swing, with a big shove. 2.5 s cooldown. Works on the ground or once in mid-air.
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'jump') + 1, 0, ['dash', 'Dash / spear lunge', 'KeyR']);
KB_DEF.dash = 'KeyR'; if (KB.dash === undefined) KB.dash = 'KeyR';
SND.dash = v => { noise(0.3, 0.45 * v, 600, 0.6, 0, 'bandpass'); beep(180, 0.25, 'sawtooth', 0.06 * v, 260); };
SND.lunge = v => { noise(0.15, 0.6 * v, 900, 0.9); beep(90, 0.2, 'sine', 0.4 * v, -40); };
let dashQ = false, dashFlashT = -1e9;
window.addEventListener('keydown', e => { if (!e.repeat && !rebinding && e.code === KB.dash && inGame()) dashQ = true; });
window.addEventListener('mousedown', e => { if (!rebinding && 'Mouse' + e.button === KB.dash && inGame()) dashQ = true; });
function startDash(p) {
  if (tick < (p.dashCD || 0) || p.dead || p.stunT > tick || p.inWeb || p.using) return;
  if (!p.onGround && p.airDashed) return;
  const y = p.yaw * DEG, fx = -Math.sin(y), fz = Math.cos(y);
  p.vx = fx * 1.05; p.vz = fz * 1.05; p.vy = Math.max(p.vy, p.onGround ? 0.12 : 0.05);
  p.dashT = 9; p.dashHit = new Set(); p.dashCD = tick + 50;
  if (!p.onGround) p.airDashed = true;
  p.sprinting = true; swing(p);
  sfx('dash', p.x, p.y, p.z); dashFlashT = performance.now();
}
const _playerControlDash = playerControl;
playerControl = function (p) {
  _playerControlDash(p);
  if (p.onGround) p.airDashed = false;
  if (dashQ) { dashQ = false; startDash(p); }
  if (p.dashT > 0) {
    p.dashT--;
    // keep the burst going against friction for the first few ticks
    if (p.dashT > 5) { const y = p.yaw * DEG; p.vx = lerp(p.vx, -Math.sin(y) * 1.05, 0.5); p.vz = lerp(p.vz, Math.cos(y) * 1.05, 0.5); }
    spawnP(p.x + (Math.random() - 0.5) * 0.4, p.y + 0.3 + Math.random(), p.z + (Math.random() - 0.5) * 0.4, -p.vx * 2, 0, -p.vz * 2, '#dfe8ff', 0.3, 0.07, 0);
    // lunge hit: anyone we run into
    for (const m of mobs) {
      if (m === p || m.dead || p.dashHit.has(m) || (m.team === p.team && !CFG.friendlyFire)) continue;
      if (Math.hypot(m.x - p.x, m.z - p.z) < 1.25 && Math.abs(m.y - p.y) < 1.6) {
        p.dashHit.add(m);
        if (hurt(m, 8, { att: p, kind: 'melee' })) {
          const s = 1 - m.kbRes; m.vx += p.vx * 0.9 * s; m.vz += p.vz * 0.9 * s; m.vy = Math.max(m.vy, 0.35 * s); m.onGround = false;
          sfx('lunge', m.x, m.y, m.z); hitMarker = 6; showTarget(m);
          burst(m.x, m.y + 1, m.z, 14, ['#ffffff', '#c8d8ff'], 2.5, 0.4, 0.07, 3);
        }
        p.vx *= 0.35; p.vz *= 0.35; p.dashT = 0; // the impact stops you
      }
    }
  }
};
const _updateCameraDash = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraDash(alpha, dt);
  const since = performance.now() - dashFlashT;
  if (since < 300 && player) { camera.fov = fovNow * (1 + 0.12 * Math.sin(since / 300 * Math.PI)); camera.updateProjectionMatrix(); }
};
const _drawHUDDash = drawHUD;
drawHUD = function (a) {
  _drawHUDDash(a);
  if (state !== 'play' || !player || player.dead) return;
  const left = (player.dashCD || 0) - tick;
  const g = hctx, cx = W / 2, y = H / 2 + 36;
  if (left > 0) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(cx - 21, y, 42, 5); g.fillStyle = '#9fc0ff'; g.fillRect(cx - 20, y + 1, 40 * (1 - left / 50), 3); }
};
const _startGameDash = startGame;
startGame = function () { _startGameDash(); if (player) { player.dashCD = 0; player.dashT = 0; } };
G.startGame = startGame;
buildMenu();
