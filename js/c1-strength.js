// ================= STRENGTH POTION (key U) =================
// Press U (rebindable) to drink a Strength potion: x1.4 melee & arrow damage for 10 s.
// Screen gets a pulsing red-orange edge, a timer, red swirls, and a power-up flash + sound when you drink it.
for (const [k, v] of Object.entries({ strPots: 2, botStrPots: 1 })) { DEF[k] = v; if (CFG[k] === undefined) CFG[k] = v; }
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'pot') + 1, 0, ['strpot', 'Strength potion (10 s of x1.4 damage)', 'KeyU']);
KB_DEF.strpot = 'KeyU'; if (KB.strpot === undefined) KB.strpot = 'KeyU';
SND.strPot = v => { noise(0.15, 0.3 * v, 3000, 1.5); [220, 277, 330, 440].forEach((f, i) => beep(f, 0.22, 'sawtooth', 0.07 * v, 0, i * 0.06)); beep(110, 0.5, 'sine', 0.2 * v, -30, 0.1); };
const strPotIcon = pxArt(px => {
  const rows = ['......XX......', '.....XWWX.....', '......XX......', '.....XGGX.....', '....XRRRRX....', '...XRRWRRRX...', '..XRRWRRRRRX..', '..XRRRRRRRRX..', '..XRRRRRRRRX..', '...XRRRRRRX...', '....XXXXXX....'];
  rows.forEach((r, y) => [...r].forEach((c, x) => { const col = { X: '#2a1a1a', W: '#ffffff', G: '#cfe6ff', R: '#a8201a' }[c]; if (col) px(x + 1, y + 3, col); }));
});
let strQ = false, strFlashT = -1e9;
function drinkStrength(e) {
  if ((e.strPots || 0) <= 0 || e.dead || tick < (e.strCD || 0)) return false;
  e.strPots--; e.strCD = tick + 20;
  e.strPotUntil = Math.max(e.strPotUntil || 0, tick) + 200;
  sfx('strPot', e.x, e.y, e.z);
  burst(e.x, e.y + 1, e.z, 40, ['#a8201a', '#ff6a3a', '#ffb070', '#ffffff'], 3, 0.8, 0.08, 2, 1);
  if (e === player) { strFlashT = performance.now(); camShake = 1; }
  else feed(`${e.name} drank a Strength potion!`, '#ff8a5a');
  return true;
}
const _dealDamageStrPot = dealDamage;
dealDamage = function (t, amt, src) {
  if (src && src.att && (src.att.strPotUntil || 0) > tick && (src.kind === 'melee' || src.kind === 'arrow')) amt *= 1.4;
  return _dealDamageStrPot(t, amt, src);
};
// input
window.addEventListener('keydown', e => { if (!e.repeat && !rebinding && e.code === KB.strpot && inGame()) strQ = true; });
window.addEventListener('mousedown', e => { if (!rebinding && 'Mouse' + e.button === KB.strpot && inGame()) strQ = true; });
const _playerControlStr = playerControl;
playerControl = function (p) {
  if (strQ) { strQ = false; if (!(p.stunT > tick)) drinkStrength(p); }
  _playerControlStr(p);
};
// bots drink one when they commit to a fight
const _botTickStr = botTick;
botTick = function (b) {
  _botTickStr(b);
  if (!b.strPots || (b.strPotUntil || 0) > tick || game.countdown > 0 || b.stunT > tick || b.using) return;
  const t = b.ai.t; if (!t || t.dead) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z);
  if (d < 6 && b.health > 10 && Math.random() < 0.02 + 0.06 * (b.skill || 0.5)) drinkStrength(b);
};
// particles + setup
const _gameTickStr2 = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickStr2(); if (tick === t0) return;
  for (const m of mobs) if (!m.dead && (m.strPotUntil || 0) > tick && tick % 3 === 0) {
    const a = tick * 0.4 + m.id; spawnP(m.x + Math.cos(a) * 0.5, m.y + 0.2 + (tick % 12) * 0.13, m.z + Math.sin(a) * 0.5, 0, 0.5, 0, '#ff6a3a', 0.45, 0.08, 0);
  }
};
const _startGameStr = startGame;
startGame = function () {
  _startGameStr(); if (!game) return;
  for (const m of mobs) { m.strPotsMax = m.isPlayer ? CFG.strPots : CFG.botStrPots; m.strPots = m.strPotsMax; m.strPotUntil = 0; m.strCD = 0; }
};
G.startGame = startGame;
const _respawnStr = respawn;
respawn = function (m) { _respawnStr(m); m.strPots = m.strPotsMax || 0; m.strPotUntil = 0; };
// screen effects
const _drawHUDStrPot = drawHUD;
drawHUD = function (a) {
  _drawHUDStrPot(a);
  if (state !== 'play' || !game || !player || player.dead) return;
  const g = hctx, gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4), hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4;
  if (player.strPotsMax > 0) {
    const sx = hx - 87 * gs;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(sx, hy, hh, hh);
    g.globalAlpha = player.strPots > 0 ? 1 : 0.35; g.drawImage(strPotIcon, sx + 3 * gs, hy + 3 * gs, 16 * gs, 16 * gs); g.globalAlpha = 1;
    txt(String(player.strPots), sx + 19 * gs, hy + 20 * gs, 9 * gs, '#fff', 'right');
    txt(keyName(KB.strpot), sx + hh / 2, hy - 3 * gs, 8 * gs, '#ff9a6a', 'center');
  }
  const left = (player.strPotUntil || 0) - tick;
  if (left > 0) {
    const pulse = 0.16 + 0.08 * Math.sin(performance.now() / 160) + (left < 60 ? 0.06 * Math.sin(performance.now() / 60) : 0);
    const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    rg.addColorStop(0, 'rgba(255,90,40,0)'); rg.addColorStop(1, `rgba(255,70,20,${pulse})`);
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // timer bar under the crosshair
    const bw = 60 * gs / 2, bx = W / 2 - bw / 2, by = H / 2 + 26 * gs / 2 + 30;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(bx - 2, by - 2, bw + 4, 8);
    g.fillStyle = '#ff6a3a'; g.fillRect(bx, by, bw * left / 200, 4);
    txt(`STRENGTH  ${(left / 20).toFixed(1)}s`, W / 2, by - 6, 18, '#ffb070', 'center');
  }
  const since = performance.now() - strFlashT;
  if (since < 500) { g.fillStyle = `rgba(255,120,40,${0.4 * (1 - since / 500)})`; g.fillRect(0, 0, W, H); txt('STRENGTH!', W / 2, H / 2 - 120, 40, '#ff8a3a', 'center'); }
};
const _updateCameraStr = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraStr(alpha, dt);
  const since = performance.now() - strFlashT;
  if (since < 400 && player) { camera.fov = fovNow * (1 + 0.08 * Math.sin(since / 400 * Math.PI)); camera.updateProjectionMatrix(); }
};
(function () {
  const row = (sec, after, r) => { const rows = MENU[sec].rows, i = rows.findIndex(x => x[0] === after); rows.splice(i + 1, 0, r); };
  row(1, 'pots', ['strPots', 'Strength potions (press U — x1.4 damage for 10 s)', 'rng', [0, 8, 1]]);
  row(2, 'botPots', ['botStrPots', 'Bot strength potions', 'rng', [0, 8, 1]]);
})();
buildMenu();
