// ================= KILL-CAM RULES vs MULTIPLE OPPONENTS =================
// With several opponents the kill-cam no longer interrupts every kill. It plays:
//  - when your kill finishes off the LAST opponent (match won) — from that victim's eyes
//  - when YOU die — from your killer's eyes, so you can see how they got you
// 1v1 behaves as before.
const _dieKCRules = die;
die = function (t, src) {
  const hadKC = !!killcam;
  // decide BEFORE the kill-cam code runs: a kill that leaves opponents standing gets no kill-cam at all
  const foesAfter = player ? mobs.filter(m => !m.dead && m !== t && m.team !== player.team).length : 0;
  // FFA / duel: kill-cam on every kill. Team fight: no mid-match kill-cams (keeps your momentum) — the final kill-cam plays at the end.
  const skip = CFG.mode === 'teams' && game && !game.over && foesAfter > 0;
  const keepKC = CFG.killcam; if (skip) CFG.killcam = false;
  try { _dieKCRules(t, src); } finally { CFG.killcam = keepKC; }
  if (!t.dead || !player) return;
  // your kill, but opponents are still standing -> skip this kill-cam
  if (false && !hadKC && killcam && t !== player && !killcam.final) {
    const foesLeft = mobs.filter(m => !m.dead && m.team !== player.team).length;
    if (foesLeft > 0 && !player.dead) { killcam = null; if (state === 'play' && game && !game.over) lockMouse(); }
  }
  // you died -> watch it from your killer's eyes
  if (t === player && CFG.killcam && !killcam && typeof kcSnap === 'function' && CFG.mode !== 'teams') {
    const k = (src && src.att) || (tick - (player.lastAttackT || -999) < 60 ? player.lastAttacker : null);
    const idx = k && k !== player ? mobs.indexOf(k) : -1;
    kcSnap();
    if (idx >= 0 && kcBuf.length >= 10) {
      killcam = { idx, victim: k, frames: kcBuf.slice(-KC_LEN), start: performance.now() + 700, deathCam: true };
      // (mouse stays captured)
    }
  }
};
const _drawHUDKCRules = drawHUD;
drawHUD = function (al) {
  _drawHUDKCRules(al);
  if (!killcam || !killcam.deathCam) return;
  hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  txt('HOW YOU DIED', W / 2, H * 0.17, 40, '#ff5a5a', 'center');
  txt(`${killcam.victim.name}'s view`, W / 2, H * 0.17 + 32, 22, '#ffffff', 'center');
};
// while the death-cam plays, keep the "You died" screen hidden; show it after
const _kcEndRules = kcEnd;
kcEnd = function () {
  const wasDeath = killcam && killcam.deathCam;
  _kcEndRules();
  if (wasDeath && player && player.dead && game && !game.over && game.win === 'last') { $('#deadMsg').textContent = player.deathMsg || ''; $('#dead').classList.remove('hidden'); }
};
const _drawHUDKCDead = drawHUD;
drawHUD = function (al) { if (killcam && killcam.deathCam) $('#dead').classList.add('hidden'); _drawHUDKCDead(al); };
