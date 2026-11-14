// ================= FULL MATCH REPLAY =================
// Every match is recorded (everyone's movement, looks, swings, hits, items, shields, deaths + every block placed /
// broken). After the match press "Watch Replay" on the end screen:
//   play / pause, 0.25x - 4x speed, scrub the timeline, jump ±5 s, step frames, click kill markers to jump to kills,
//   watch from anyone's eyes, 3rd-person on anyone, or a free-fly camera.
const RS = 13; // floats per mob per tick
let REC = null, RP = null;
function recStart() {
  REC = { on: true, t0: tick, frames: [], world0: world.slice(), dims: [WX, WY, WZ, YOFF], events: [], deaths: [], n: mobs.length };
}
const _startGameRec = startGame;
startGame = function () { RP = null; $('#replayUI') && $('#replayUI').remove(); _startGameRec(); if (game) recStart(); };
G.startGame = startGame;
const _gameTickRec = gameTick;
gameTick = function () {
  const t0 = tick;
  _gameTickRec();
  if (tick === t0 || !REC || !REC.on || REC.frames.length > 24000) return;
  const f = new Float32Array(REC.n * RS);
  mobs.forEach((m, k) => {
    const o = k * RS;
    f[o] = m.x; f[o + 1] = m.y; f[o + 2] = m.z; f[o + 3] = m.yaw; f[o + 4] = m.pitch; f[o + 5] = m.swingT; f[o + 6] = m.hurtTime;
    f[o + 7] = m.dead ? 1 : 0; f[o + 8] = m.sneaking ? 1 : 0; f[o + 9] = m.sel; f[o + 10] = m.shieldUp ? 1 : 0;
    f[o + 11] = m.using === 'bow' ? 1 : m.using === 'eat' ? 2 : m.using === 'block' ? 3 : 0; f[o + 12] = m.health + m.absorption;
  });
  REC.frames.push(f);
};
const _setBRec = setB;
setB = function (x, y, z, id) {
  const old = getB(x, y, z);
  const r = _setBRec(x, y, z, id);
  if (r && REC && REC.on && state === 'play' && old !== id) REC.events.push([REC.frames.length, x, y, z, old, id]);
  return r;
};
const _dieRec = die;
die = function (t, src) {
  _dieRec(t, src);
  if (t.dead && REC && REC.on) REC.deaths.push({ f: REC.frames.length, name: t.name, by: (src && src.att && src.att.name) || '', you: src && src.att === player });
};
const _endGameRec = endGame;
endGame = function (team) { _endGameRec(team); if (REC) REC.on = false; };
const _toMenuRec = toMenu;
toMenu = function () { exitReplay(true); REC = null; _toMenuRec(); };

// ---------- playback ----------
function replayWorldTo(fi) {
  if (fi === RP.wf) return;
  const ev = REC.events;
  if (fi > RP.wf) { for (const e of ev) if (e[0] > RP.wf && e[0] <= fi) setB(e[1], e[2], e[3], e[5]); }
  else { for (let i = ev.length - 1; i >= 0; i--) { const e = ev[i]; if (e[0] <= RP.wf && e[0] > fi) setB(e[1], e[2], e[3], e[4]); } }
  RP.wf = fi;
}
function openReplay() {
  if (!REC || REC.frames.length < 2) return;
  document.exitPointerLock && document.exitPointerLock();
  $('#end').classList.add('hidden'); $('#dead').classList.add('hidden'); $('#pause').classList.add('hidden');
  state = 'replay';
  [WX, WY, WZ] = REC.dims; YOFF = REC.dims[3] || 0; world = REC.world0.slice(); rebuildAll();
  const pi = mobs.indexOf(player);
  RP = { t: 0, wf: 0, playing: true, speed: 1, cam: { mode: 'pov', idx: Math.max(0, pi) }, free: { x: WX / 2, y: WY * 0.6, z: WZ / 2, yaw: 0, pitch: 30 }, lastScrub: 0 };
  for (const m of mobs) { m._selKeep = m.sel; if (m.parts) m.parts.root.visible = true; }
  buildReplayUI();
}
function exitReplay(silent) {
  if (!RP) return;
  RP = null; $('#replayUI') && $('#replayUI').remove();
  for (const m of mobs) if (m._selKeep !== undefined) { m.sel = m._selKeep; setHeldVisual(m); }
  if (!silent) { state = 'play'; $('#end').classList.remove('hidden'); }
}
const fmtT = f => { const s = Math.floor(f / 20); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function buildReplayUI() {
  const st = document.createElement('style');
  st.textContent = `#replayUI{position:fixed;left:0;right:0;bottom:0;z-index:20;background:linear-gradient(transparent,rgba(0,0,0,.85) 30%);padding:26px 16px 12px;font-family:VT323,monospace;color:#fff}
  #replayUI .bar{position:relative;height:18px;margin:4px 0 8px}#replayUI input[type=range]{width:100%;margin:0;position:absolute;top:0}
  #replayUI .mk{position:absolute;top:-10px;width:10px;height:10px;transform:translateX(-5px);cursor:pointer;border-radius:2px}
  #replayUI .row2{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#replayUI .mc{font-size:20px;min-height:30px;padding:0 10px}
  #replayUI select{font-family:VT323,monospace;font-size:20px;background:#1c1c1c;color:#eee;border:2px solid #000;min-height:30px}
  #replayUI .time{font-size:22px;margin-left:6px;min-width:110px}#replayUI .hint{font-size:17px;color:#aaa;width:100%}
  #replayTitle{position:fixed;left:16px;top:10px;z-index:20;font-family:VT323,monospace;font-size:28px;color:#ff5a5a;text-shadow:2px 2px #000}`;
  const ui = document.createElement('div'); ui.id = 'replayUI'; ui.appendChild(st);
  const N = REC.frames.length - 1;
  ui.innerHTML += `<div id="replayTitle">REPLAY</div><div class="bar"><input id="rpSlider" type="range" min="0" max="${N}" step="1" value="0"></div>
  <div class="row2">
   <button class="mc" id="rpBack">⏪ 5s</button><button class="mc" id="rpPrev">◀ frame</button><button class="mc" id="rpPlay">⏸</button>
   <button class="mc" id="rpNext">frame ▶</button><button class="mc" id="rpFwd">5s ⏩</button><button class="mc" id="rpSpeed">1x</button>
   <span class="time" id="rpTime">0:00 / ${fmtT(N)}</span>
   <select id="rpCam"></select>
   <button class="mc" id="rpExit">Exit replay</button>
   <div class="hint">Space play/pause · ←/→ 5 s · , . frame step · C next camera · free cam: click to look, WASD / Space / Shift to fly · red markers = kills (click to jump)</div>
  </div>`;
  document.body.appendChild(ui);
  const bar = ui.querySelector('.bar');
  for (const d of REC.deaths) {
    const mk = document.createElement('div'); mk.className = 'mk'; mk.style.left = (d.f / N * 100) + '%';
    mk.style.background = d.you ? '#70ff70' : '#ff5a5a'; mk.title = `${fmtT(d.f)} ${d.name} died${d.by ? ' (' + d.by + ')' : ''}`;
    mk.onclick = () => { RP.t = Math.max(0, d.f - 60); RP.playing = true; }; bar.appendChild(mk);
  }
  const cam = ui.querySelector('#rpCam');
  const opts = [['free', -1, 'Free camera']];
  mobs.forEach((m, k) => { opts.push(['pov', k, `${m.isPlayer ? 'Your' : m.name + "'s"} eyes`]); opts.push(['third', k, `3rd person: ${m.name}`]); });
  cam.innerHTML = opts.map(([mo, k, n], i) => `<option value="${i}">${n}</option>`).join('');
  const setCam = i => { const [mo, k] = opts[i]; RP.cam = { mode: mo, idx: k }; cam.value = i; if (mo === 'free') { const c = camera.position; Object.assign(RP.free, { x: c.x, y: c.y, z: c.z }); } };
  cam.value = String(opts.findIndex(o => o[0] === 'pov' && o[1] === RP.cam.idx));
  cam.onchange = () => setCam(+cam.value);
  RP.nextCam = () => setCam((+cam.value + 1) % opts.length);
  const sl = ui.querySelector('#rpSlider');
  sl.oninput = () => { RP.t = +sl.value; RP.lastScrub = performance.now(); };
  const speeds = [0.25, 0.5, 1, 2, 4];
  ui.querySelector('#rpSpeed').onclick = e => { RP.speed = speeds[(speeds.indexOf(RP.speed) + 1) % speeds.length]; e.target.textContent = RP.speed + 'x'; };
  ui.querySelector('#rpPlay').onclick = () => { RP.playing = !RP.playing; };
  ui.querySelector('#rpBack').onclick = () => { RP.t = Math.max(0, RP.t - 100); };
  ui.querySelector('#rpFwd').onclick = () => { RP.t = Math.min(N, RP.t + 100); };
  ui.querySelector('#rpPrev').onclick = () => { RP.playing = false; RP.t = Math.max(0, Math.floor(RP.t) - 1); };
  ui.querySelector('#rpNext').onclick = () => { RP.playing = false; RP.t = Math.min(N, Math.floor(RP.t) + 1); };
  ui.querySelector('#rpExit').onclick = () => exitReplay(false);
  ui.querySelectorAll('button,select,input').forEach(el => el.addEventListener('keydown', e => e.stopPropagation()));
}
// keyboard / free-cam
const rpKeys = {};
window.addEventListener('keydown', e => {
  if (!RP) return;
  rpKeys[e.code] = true;
  const N = REC.frames.length - 1;
  if (e.code === 'Space') { e.preventDefault(); if (RP.cam.mode !== 'free') RP.playing = !RP.playing; }
  if (e.code === 'ArrowLeft') RP.t = Math.max(0, RP.t - 100);
  if (e.code === 'ArrowRight') RP.t = Math.min(N, RP.t + 100);
  if (e.code === 'Comma') { RP.playing = false; RP.t = Math.max(0, Math.floor(RP.t) - 1); }
  if (e.code === 'Period') { RP.playing = false; RP.t = Math.min(N, Math.floor(RP.t) + 1); }
  if (e.code === 'KeyC') RP.nextCam();
  if (e.code === 'KeyP') RP.playing = !RP.playing;
});
window.addEventListener('keyup', e => { rpKeys[e.code] = false; });
glCanvas.addEventListener('click', () => { if (RP && RP.cam.mode === 'free') try { glCanvas.requestPointerLock(); } catch (e) {} });
document.addEventListener('mousemove', e => {
  if (!RP || RP.cam.mode !== 'free' || document.pointerLockElement !== glCanvas) return;
  RP.free.yaw += e.movementX * 0.15; RP.free.pitch = clamp(RP.free.pitch + e.movementY * 0.15, -89, 89);
});
function rpFrame(alpha) {
  const N = REC.frames.length - 1, t = clamp(RP.t, 0, N), i = Math.floor(t), j = Math.min(N, i + 1);
  return { A: REC.frames[i], Bf: REC.frames[j], a: t - i, i };
}
const _stepAndRenderRP = stepAndRender;
stepAndRender = function (dt) {
  if (RP) {
    const N = REC.frames.length - 1;
    if (RP.playing) { RP.t += dt * 20 * RP.speed; if (RP.t >= N) { RP.t = N; RP.playing = false; } }
    replayWorldTo(Math.floor(RP.t));
    if (RP.cam.mode === 'free') { // fly
      const F = RP.free, y = F.yaw * DEG, sp = (rpKeys.ControlLeft ? 30 : 12) * dt;
      const fx = -Math.sin(y), fz = Math.cos(y);
      if (rpKeys.KeyW) { F.x += fx * sp; F.z += fz * sp; } if (rpKeys.KeyS) { F.x -= fx * sp; F.z -= fz * sp; }
      if (rpKeys.KeyA) { F.x += fz * sp; F.z -= fx * sp; } if (rpKeys.KeyD) { F.x -= fz * sp; F.z += fx * sp; }
      if (rpKeys.Space) F.y += sp; if (rpKeys.ShiftLeft || rpKeys.ShiftRight) F.y -= sp;
    }
    const ui = $('#replayUI');
    if (ui) {
      if (performance.now() - RP.lastScrub > 150) ui.querySelector('#rpSlider').value = Math.floor(RP.t);
      ui.querySelector('#rpTime').textContent = `${fmtT(RP.t)} / ${fmtT(N)}`;
      ui.querySelector('#rpPlay').textContent = RP.playing ? '⏸' : '▶';
    }
  }
  _stepAndRenderRP(dt);
};
const _updateModelsRP = updateModels;
updateModels = function (alpha) {
  _updateModelsRP(alpha);
  if (!RP) return;
  const { A, Bf, a } = rpFrame();
  mobs.forEach((m, k) => {
    const pr = m.parts; if (!pr) return;
    const o = k * RS, P = i => A[o + i], Q = i => Bf[o + i];
    const dead = P(7) && Q(7);
    pr.root.visible = !dead && !(RP.cam.mode === 'pov' && RP.cam.idx === k);
    pr.root.rotation.z = 0;
    pr.root.position.set(lerp(P(0), Q(0), a), lerp(P(1), Q(1), a) - (P(8) ? 0.12 : 0), lerp(P(2), Q(2), a));
    pr.root.rotation.y = -(P(3) + wrapDeg(Q(3) - P(3)) * a) * DEG;
    pr.head.rotation.x = clamp(lerp(P(4), Q(4), a), -80, 80) * DEG;
    pr.body.rotation.x = P(8) ? 0.35 : 0;
    const sel = P(9) | 0; if (m.sel !== sel && m.inv[sel] !== undefined) { m.sel = sel; setHeldVisual(m); }
    // walk animation from movement
    const sp = Math.hypot(Q(0) - P(0), Q(2) - P(2)); pr._rpLimb = (pr._rpLimb || 0) + sp * 2.6 * (RP.playing ? RP.speed : 0);
    const sw = Math.cos(pr._rpLimb * 0.6662) * Math.min(1, sp * 5) * 0.6;
    pr.legR.rotation.x = sw; pr.legL.rotation.x = -sw; pr.armL.rotation.x = sw * 0.8; pr.armR.rotation.x = -sw * 0.8; pr.armR.rotation.z = 0; pr.armL.rotation.z = 0;
    if (P(5) > 0) { const s = clamp(1 - (P(5) - a) / 6, 0, 1), s1 = Math.sin(Math.sqrt(s) * Math.PI); pr.armR.rotation.x = -1.2 - s1 * 0.9 + s * 1.2; pr.armR.rotation.z = -s1 * 0.4; }
    const u = P(11); if (u === 1) { pr.armR.rotation.x = -Math.PI / 2; pr.armL.rotation.x = -Math.PI / 2; pr.armL.rotation.z = -0.4; } else if (u === 2) pr.armR.rotation.x = -1.3;
    if (P(10)) { pr.armL.rotation.x = -1.15; pr.armL.rotation.z = -0.55; }
    if (pr.shieldPivot) pr.shieldPivot.rotation.x = -pr.armL.rotation.x;
    for (const mt of m.mats) if (mt.emissive) mt.emissive.setHex(P(6) > 0 ? 0x880000 : 0);
    if (pr.tag) pr.tag.visible = pr.root.visible;
  });
  for (const ar of arrows) if (ar.mesh) ar.mesh.visible = false;
};
const _updateCameraRP = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraRP(alpha, dt);
  if (!RP) return;
  vm.visible = false; selBox.visible = false; crackBox.visible = false;
  if (typeof mcItem !== 'undefined') mcItem.visible = false;
  if (typeof vmShield !== 'undefined') vmShield.visible = false;
  if (Math.abs(camera.fov - CFG.fov) > 0.01) { camera.fov = CFG.fov; camera.updateProjectionMatrix(); }
  if (RP.cam.mode === 'free') {
    const F = RP.free; camera.position.set(F.x, F.y, F.z); camera.rotation.set(-F.pitch * DEG, Math.PI - F.yaw * DEG, 0, 'YXZ'); return;
  }
  const { A, Bf, a } = rpFrame(), o = RP.cam.idx * RS, P = i => A[o + i], Q = i => Bf[o + i];
  const yaw = P(3) + wrapDeg(Q(3) - P(3)) * a, pitch = lerp(P(4), Q(4), a);
  let x = lerp(P(0), Q(0), a), y = lerp(P(1), Q(1), a) + (P(8) ? 1.54 : 1.62), z = lerp(P(2), Q(2), a);
  if (RP.cam.mode === 'third') {
    const d = [-Math.sin(yaw * DEG) * Math.cos(pitch * DEG), -Math.sin(pitch * DEG), Math.cos(yaw * DEG) * Math.cos(pitch * DEG)];
    let dist = 4; const h = rayBlocks(x, y, z, -d[0], -d[1], -d[2], dist); if (h && isSolid(h.id)) dist = Math.max(0.3, h.dist - 0.2);
    x -= d[0] * dist; y -= d[1] * dist; z -= d[2] * dist;
  }
  camera.position.set(x, y, z);
  camera.rotation.set(-pitch * DEG, Math.PI - yaw * DEG, RP.cam.mode === 'pov' && P(6) > 0 ? -Math.sin(P(6) / 10 * Math.PI) * 0.12 : 0, 'YXZ');
};
const _drawHUDRP = drawHUD;
drawHUD = function (al) {
  _drawHUDRP(al);
  if (!RP) return;
  const g = hctx; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const { A } = rpFrame(), k = RP.cam.idx;
  if (RP.cam.mode !== 'free' && k >= 0) {
    const m = mobs[k], hp = A[k * RS + 12];
    txt(`${m.isPlayer ? 'You' : m.name}  ·  ${(hp / 2).toFixed(1)}❤`, W / 2, 44, 24, m.isPlayer ? '#ffff70' : (m.teamCol || '#fff'), 'center');
    if (RP.cam.mode === 'pov' && A[k * RS + 6] > 0) { g.fillStyle = 'rgba(200,0,0,.15)'; g.fillRect(0, 0, W, H); }
  }
  $('#tinfo').innerHTML = ''; $('#dbg').textContent = ''; $('#center').innerHTML = '';
};
// "Watch Replay" button on the end screen
(function () {
  const b = document.createElement('button'); b.className = 'mc'; b.id = 'watchReplay'; b.textContent = '▶ Watch Replay';
  $('#again').parentNode.insertBefore(b, $('#again'));
  b.onclick = openReplay;
})();
