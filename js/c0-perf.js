// ================= PERFORMANCE PASS =================
// 1) Render the 3D scene at 1x pixel ratio (pixel-art game, no visible quality loss, far fewer pixels on Retina).
renderer.setPixelRatio(1);
// 2) HUD canvas at most 1.5x.
const _resizePerf = resize;
resize = function () { _resizePerf(); DPR = Math.min(window.devicePixelRatio || 1, 1.5); hud.width = W * DPR; hud.height = H * DPR; };
window.addEventListener('resize', () => resize());
resize();
// 3) Only touch the DOM when text actually changes (the HUD was rewriting these every frame -> layout thrash).
function dedupeProp(el, prop) {
  const proto = Object.getPrototypeOf(el);
  let d = null, p = proto;
  while (p && !d) { d = Object.getOwnPropertyDescriptor(p, prop); p = Object.getPrototypeOf(p); }
  if (!d || !d.set) return;
  let last = el[prop];
  Object.defineProperty(el, prop, { configurable: true, get() { return d.get.call(el); }, set(v) { if (v === last) return; last = v; d.set.call(el, v); } });
}
for (const id of ['#tinfo', '#center']) dedupeProp($(id), 'innerHTML');
// 4) Spread chunk re-meshing out: at most 2 chunks per frame, nearest to the camera first
//    (bots building / digging used to rebuild up to 4 chunks in one frame -> hitches).
updateChunks = function () {
  let list = null;
  for (const ch of chunks) if (ch.dirty) (list || (list = [])).push(ch);
  if (!list) return;
  if (list.length > 2) {
    const cx = camera.position.x, cz = camera.position.z;
    list.sort((a, b) => Math.hypot(a.cx * 16 + 8 - cx, a.cz * 16 + 8 - cz) - Math.hypot(b.cx * 16 + 8 - cx, b.cz * 16 + 8 - cz));
  }
  for (let i = 0; i < Math.min(2, list.length); i++) buildChunk(list[i]);
};
// 5) Cheaper per-frame work: name tags are sprites that never need frustum-sorting against the world.
renderer.sortObjects = true;
// 6) Cache the "what am I looking at" ray once per frame instead of 3-4 times (HUD, outline, crosshair).
let _pickCache = { t: -1, f: -1, r: null };
let _frameNo = 0;
const _stepAndRenderPerf = stepAndRender;
stepAndRender = function (dt) { _frameNo++; _stepAndRenderPerf(dt); };
const _pickEntityPerf = pickEntity;
pickEntity = function (e, reach, dir) {
  if (e === player && !dir && reach === 3) {
    if (_pickCache.f === _frameNo && _pickCache.t === tick && _pickCache.yaw === e.yaw && _pickCache.pitch === e.pitch) {
      if (_pickCache.web) e._webBlock = _pickCache.web;
      return _pickCache.r;
    }
    const r = _pickEntityPerf(e, reach, dir);
    _pickCache = { f: _frameNo, t: tick, yaw: e.yaw, pitch: e.pitch, r, web: e._webBlock && e._webBlock.t === tick ? e._webBlock : null };
    return r;
  }
  return _pickEntityPerf(e, reach, dir);
};
// frame loop uses the wrapped stepAndRender
frame = function (now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  stepAndRender(dt);
};
G.stepAndRender = stepAndRender;
