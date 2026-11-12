// ================= SPLASH POTIONS OF INSTANT HEALTH =================
// Press the potion key (default Y, rebindable) to throw one at your feet: it splashes and heals 5 hearts.
// Not on the hotbar. Bots carry them too and pot themselves when they get low.
for (const [k, v] of Object.entries({ pots: 3, botPots: 3 })) { DEF[k] = v; if (CFG[k] === undefined) CFG[k] = v; }
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'use') + 1, 0, ['pot', 'Splash Instant Health potion (not on hotbar)', 'KeyY']);
KB_DEF.pot = 'KeyY'; if (KB.pot === undefined) KB.pot = 'KeyY';
SND.potThrow = v => { noise(0.12, 0.15 * v, 1500, 0.8); };
SND.potBreak = v => { noise(0.18, 0.5 * v, 3500, 1.5); beep(1800, 0.08, 'sine', 0.08 * v); beep(2400, 0.1, 'sine', 0.06 * v, 0, 0.04); };
SND.heal = v => { [660, 880, 1100].forEach((f, i) => beep(f, 0.15, 'sine', 0.08 * v, 0, i * 0.05)); };
const potIcon = pxArt(px => {
  const rows = ['......XX......', '.....XWWX.....', '......XX......', '.....XGGX.....', '....XRRRRX....', '...XRRWRRRX...', '..XRRWRRRRRX..', '..XRRRRRRRRX..', '..XRRRRRRRRX..', '...XRRRRRRX...', '....XXXXXX....'];
  rows.forEach((r, y) => [...r].forEach((c, x) => { const col = { X: '#2a1a1a', W: '#ffffff', G: '#cfe6ff', R: '#f0306a' }[c]; if (col) px(x + 1, y + 3, col); }));
});
const potProj = [];
const potGeo = new THREE.BoxGeometry(0.22, 0.28, 0.22), potMat = new THREE.MeshLambertMaterial({ color: 0xf0306a, emissive: 0x401020 });
let potQ = false;
function throwPot(e) {
  if ((e.pots || 0) <= 0 || tick < (e.potCD || 0) || e.dead) return false;
  e.pots--; e.potCD = tick + (e.isPlayer ? 20 : 60);
  swing(e);
  const w = { x: e.x, y: e.y + e.eyeH - 0.2, z: e.z, vx: e.vx * 0.5, vy: -0.45, vz: e.vz * 0.5, owner: e, age: 0 };
  w.px = w.x; w.py = w.y; w.pz = w.z;
  w.mesh = new THREE.Mesh(potGeo, potMat); w.mesh.position.set(w.x, w.y, w.z); scene.add(w.mesh);
  potProj.push(w);
  sfx('potThrow', e.x, e.y, e.z);
  return true;
}
function potSplash(x, y, z, owner) {
  for (const m of mobs) {
    if (m.dead || (m !== owner && m.team !== owner.team)) continue;
    const d = Math.hypot(m.x - x, m.y + 0.9 - y, m.z - z);
    if (d > 3) continue;
    const heal = 10 * (d < 1.5 ? 1 : 1 - (d - 1.5) / 3);
    m.health = Math.min(20, m.health + heal);
    burst(m.x, m.y + 1, m.z, 12, ['#ff6090', '#ffb0c8'], 1.5, 0.7, 0.06, 1, 0.8);
    drawTag(m);
    if (m === player) { potFlashT = performance.now(); sfx('heal'); }
  }
  burst(x, y + 0.2, z, 45, ['#f0306a', '#ff8ab0', '#ffd0e0', '#ffffff'], 3.2, 0.9, 0.08, 4, 1.2);
  sfx('potBreak', x, y, z);
}
let potFlashT = -1e9;
function tickPots() {
  for (const w of potProj) {
    w.px = w.x; w.py = w.y; w.pz = w.z; w.age++;
    const sp = Math.hypot(w.vx, w.vy, w.vz) || 0.01, dx = w.vx / sp, dy = w.vy / sp, dz = w.vz / sp;
    const bh = rayBlocks(w.x, w.y, w.z, dx, dy, dz, sp);
    if ((bh && isSolid(bh.id) && bh.dist <= sp) || w.age > 60) {
      const t = bh ? bh.dist - 0.05 : 0;
      potSplash(w.x + dx * t, w.y + dy * t, w.z + dz * t, w.owner);
      w.dead = true; continue;
    }
    w.x += w.vx; w.y += w.vy; w.z += w.vz;
    w.vx *= 0.99; w.vy = w.vy * 0.99 - 0.05; w.vz *= 0.99;
    if (w.y < VOID_Y) w.dead = true;
  }
  for (let i = potProj.length - 1; i >= 0; i--) if (potProj[i].dead) { scene.remove(potProj[i].mesh); potProj.splice(i, 1); }
}
// input
window.addEventListener('keydown', e => { if (!e.repeat && !rebinding && e.code === KB.pot && inGame()) potQ = true; });
window.addEventListener('mousedown', e => { if (!rebinding && 'Mouse' + e.button === KB.pot && inGame()) potQ = true; });
window.addEventListener('wheel', e => { if (!rebinding && (e.deltaY > 0 ? 'WheelDown' : 'WheelUp') === KB.pot && inGame()) potQ = true; }, { passive: true });
const _playerControlPot = playerControl;
playerControl = function (p) {
  if (potQ) { potQ = false; if (!(p.stunT > tick)) throwPot(p); }
  _playerControlPot(p);
};
// bots pot themselves when they're getting low
const _botTickPot = botTick;
botTick = function (b) {
  _botTickPot(b);
  if (!b.pots || game.countdown > 0 || b.inWeb || b.stunT > tick || b.using === 'eat') return;
  const hp = b.health, sk = b.skill || 0.5;
  if (hp < 6 + 5 * sk && hp < 18 && tick >= (b.potCD || 0) && Math.random() < 0.05 + 0.25 * sk) {
    b.pitch = 80;
    throwPot(b);
  }
};
// tick + render
const _gameTickPot = gameTick;
gameTick = function () { const t0 = tick; _gameTickPot(); if (tick !== t0) tickPots(); };
const _updateModelsPot = updateModels;
updateModels = function (alpha) {
  _updateModelsPot(alpha);
  for (const w of potProj) { w.mesh.position.set(lerp(w.px, w.x, alpha), lerp(w.py, w.y, alpha), lerp(w.pz, w.z, alpha)); w.mesh.rotation.x += 0.25; w.mesh.rotation.z += 0.18; }
};
const _startGamePot = startGame;
startGame = function () {
  _startGamePot();
  if (!game) return;
  for (const m of mobs) { m.potsMax = m.isPlayer ? CFG.pots : CFG.botPots; m.pots = m.potsMax; m.potCD = 0; }
};
G.startGame = startGame;
const _respawnPot = respawn;
respawn = function (m) { _respawnPot(m); m.pots = m.potsMax || 0; m.potCD = 0; };
const _toMenuPot = toMenu;
toMenu = function () { for (const w of potProj) scene.remove(w.mesh); potProj.length = 0; _toMenuPot(); };
// HUD: potion count left of the off-hand slot, heal flash
const _drawHUDPot = drawHUD;
drawHUD = function (a) {
  _drawHUDPot(a);
  if (state !== 'play' || !game || !player || player.dead) return;
  const gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4), hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4;
  if (player.potsMax > 0) {
    const sx = hx - 58 * gs;
    hctx.fillStyle = 'rgba(0,0,0,.5)'; hctx.fillRect(sx, hy, hh, hh);
    hctx.globalAlpha = player.pots > 0 ? 1 : 0.35; hctx.drawImage(potIcon, sx + 3 * gs, hy + 3 * gs, 16 * gs, 16 * gs); hctx.globalAlpha = 1;
    txt(String(player.pots), sx + 19 * gs, hy + 20 * gs, 9 * gs, '#fff', 'right');
    txt(keyName(KB.pot), sx + hh / 2, hy - 3 * gs, 8 * gs, '#ffb0c8', 'center');
  }
  const since = performance.now() - potFlashT;
  if (since < 600) { hctx.fillStyle = `rgba(255,80,140,${0.25 * (1 - since / 600)})`; hctx.fillRect(0, 0, W, H); }
};
(function () {
  const row = (sec, after, r) => { const rows = MENU[sec].rows, i = rows.findIndex(x => x[0] === after); rows.splice(i + 1, 0, r); };
  row(1, 'gapples', ['pots', 'Splash healing potions (press Y — heals 5 hearts)', 'rng', [0, 16, 1]]);
  row(2, 'botGapples', ['botPots', 'Bot healing potions', 'rng', [0, 16, 1]]);
})();
buildMenu();
