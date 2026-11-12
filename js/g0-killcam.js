// ================= KILL-CAM (the victim's point of view) =================
// The last 5 s of every fight are recorded. When you kill a bot, the game pauses and replays those seconds
// through the bot's eyes, so you can see what it saw. Press any key / click to skip. Toggle in the menu.
if (CFG.killcam === undefined) CFG.killcam = true; DEF.killcam = true;
const KC_LEN = 100;                       // ticks kept (5 s)
let kcBuf = [], killcam = null, kcEndShow = false;
function kcSnap() {
  kcBuf.push({ t: tick, m: mobs.map(m => [m.x, m.y, m.z, m.yaw, m.pitch, m.swingT, m.hurtTime, m.dead ? 1 : 0, m.eyeH]) });
  if (kcBuf.length > KC_LEN + 5) kcBuf.shift();
}
const _gameTickKC = gameTick;
gameTick = function () {
  if (killcam) return;                    // world frozen during the replay
  const t0 = tick;
  _gameTickKC();
  if (tick !== t0) kcSnap();
};
const _dieKC = die;
die = function (t, src) {
  _dieKC(t, src);
  if (!t.dead || !CFG.killcam || t.isPlayer) return;
  const killer = src && src.att;
  if (killer !== player && !(t.lastAttacker === player && tick - t.lastAttackT < 60)) return;
  kcSnap();
  const idx = mobs.indexOf(t); if (idx < 0 || kcBuf.length < 10) return;
  killcam = { idx, victim: t, frames: kcBuf.slice(-KC_LEN), start: performance.now() + 350 };
  // keep the mouse captured during the kill-cam so the game never drops into the pause menu
};
function kcFrame() {
  const F = killcam.frames, el = Math.max(0, performance.now() - killcam.start) / 1000;
  const f = el / 0.05, i = Math.min(F.length - 1, Math.floor(f)), j = Math.min(F.length - 1, i + 1), a = Math.min(1, f - i);
  return { A: F[i], Bf: F[j], a, done: f >= F.length + 12, prog: Math.min(1, f / F.length) };
}
function kcEnd() {
  if (!killcam) return;
  killcam = null; kcBuf = [];
  if (kcEndShow) { kcEndShow = false; $('#end').classList.remove('hidden'); }
  else if (state === 'play' && game && !game.over) lockMouse();
}
window.addEventListener('keydown', e => { if (killcam && performance.now() - killcam.start > 300) { e.preventDefault(); kcEnd(); } }, true);
window.addEventListener('mousedown', () => { if (killcam && performance.now() - killcam.start > 300) kcEnd(); }, true);
// don't pause-menu during the replay
const _pauseKC = pauseGame;
pauseGame = function () { if (killcam) return; _pauseKC(); };
const _updateModelsKC = updateModels;
updateModels = function (alpha) {
  _updateModelsKC(alpha);
  if (!killcam) return;
  const { A, Bf, a } = kcFrame();
  mobs.forEach((m, k) => {
    const pr = m.parts; if (!pr || !A.m[k]) return;
    const p = A.m[k], q = (Bf.m[k] || p);
    const dead = p[7] && q[7];
    pr.root.visible = k !== killcam.idx && !dead;
    pr.root.rotation.z = 0;
    pr.root.position.set(lerp(p[0], q[0], a), lerp(p[1], q[1], a), lerp(p[2], q[2], a));
    pr.root.rotation.y = -(p[3] + wrapDeg(q[3] - p[3]) * a) * DEG;
    pr.head.rotation.x = clamp(lerp(p[4], q[4], a), -80, 80) * DEG;
    if (p[5] > 0) { const s = clamp(1 - (p[5] - a) / 6, 0, 1), s1 = Math.sin(Math.sqrt(s) * Math.PI); pr.armR.rotation.x = -1.2 - s1 * 0.9 + s * 1.2; }
    for (const mt of m.mats) if (mt.emissive) mt.emissive.setHex(p[6] > 0 ? 0x880000 : 0);
    if (pr.tag) pr.tag.visible = k !== killcam.idx;
  });
};
const _updateCameraKC = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraKC(alpha, dt);
  if (!killcam) return;
  const { A, Bf, a, done } = kcFrame();
  if (done) { kcEnd(); return; }
  const p = A.m[killcam.idx], q = Bf.m[killcam.idx] || p;
  const yaw = p[3] + wrapDeg(q[3] - p[3]) * a, pitch = lerp(p[4], q[4], a);
  camera.position.set(lerp(p[0], q[0], a), lerp(p[1], q[1], a) + (p[8] || 1.62), lerp(p[2], q[2], a));
  camera.rotation.set(-pitch * DEG, Math.PI - yaw * DEG, p[6] > 0 ? -Math.sin(p[6] / 10 * Math.PI) * 0.12 : 0, 'YXZ');
  if (Math.abs(camera.fov - CFG.fov) > 0.01) { camera.fov = CFG.fov; camera.updateProjectionMatrix(); }
  vm.visible = false; selBox.visible = false; crackBox.visible = false;
  if (typeof mcItem !== 'undefined') mcItem.visible = false;
  if (typeof vmShield !== 'undefined') vmShield.visible = false;
};
const _drawHUDKC = drawHUD;
drawHUD = function (al) {
  if (!killcam) return _drawHUDKC(al);
  const g = hctx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  const { prog, A } = kcFrame();
  // film look: letterbox + red tint when they took damage
  g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(0, 0, W, H * 0.09); g.fillRect(0, H * 0.91, W, H * 0.09);
  const hurtNow = A.m[killcam.idx] && A.m[killcam.idx][6] > 0;
  if (hurtNow) { g.fillStyle = 'rgba(200,0,0,.18)'; g.fillRect(0, 0, W, H); }
  txt('KILLCAM', 24, H * 0.06, 30, '#ff5a5a');
  txt(`${killcam.victim.name}'s view`, 150, H * 0.06, 24, '#ffffff');
  txt('press any key to skip', W - 24, H * 0.06, 18, '#aaaaaa', 'right');
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(24, H * 0.94, W - 48, 4);
  g.fillStyle = '#ff5a5a'; g.fillRect(24, H * 0.94, (W - 48) * prog, 4);
  $('#tinfo').innerHTML = ''; $('#dbg').textContent = '';
  if (!$('#end').classList.contains('hidden')) { $('#end').classList.add('hidden'); kcEndShow = true; }
  $('#center').innerHTML = '';
};
const _startGameKC = startGame;
startGame = function () { killcam = null; kcBuf = []; kcEndShow = false; _startGameKC(); };
G.startGame = startGame;
const _toMenuKC = toMenu;
toMenu = function () { killcam = null; kcBuf = []; kcEndShow = false; _toMenuKC(); };
(function () {
  const rows = MENU[2].rows, i = rows.findIndex(x => x[0] === 'fov');
  rows.splice(i + 1, 0, ['killcam', 'Kill-cam (replay from the bot\'s eyes when you kill it)', 'tg']);
})();
buildMenu();
