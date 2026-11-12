// ================= MINECRAFT-ACCURACY PASS =================
// A) bots draw the bow like real players (full 1 s draw + time to aim)
// B) smooth lighting / ambient occlusion on blocks
// C) skin & armour textures instead of flat colours
// D) gradient sky dome like MC
// E) 3D (extruded) held items in first person, like MC
// F) item-switch lower/raise animation
// G) 1.9 sword sweep attack

// ---------- A) bot bow timing ----------
const _releaseBowMC = releaseBow;
releaseBow = function (e) {
  if (!e.isPlayer) {
    if (e._bowNeed === undefined) e._bowNeed = 26 + Math.round((1 - (e.skill || 0.5)) * 14 + Math.random() * 10); // 1.3 - 2.5 s
    if (e.useT < e._bowNeed) return;   // keep holding the draw
    e._bowNeed = undefined;
  }
  _releaseBowMC(e);
};

// ---------- B) smooth lighting (per-vertex ambient occlusion) ----------
const AO_LEVEL = [0.55, 0.7, 0.85, 1];
const _quadMC = quad;
quad = function (g, x, y, z, F, tile, sh, yTop) {
  const n0 = g.c.length;
  _quadMC(g, x, y, z, F, tile, sh, yTop);
  if (yTop !== undefined) return; // water keeps flat shading
  const n = F.dir, bx = x + n[0], by = y + n[1], bz = z + n[2];
  const axes = [0, 1, 2].filter(a => n[a] === 0);
  F.c.forEach((c, k) => {
    const o1 = [0, 0, 0], o2 = [0, 0, 0];
    o1[axes[0]] = c[axes[0]] ? 1 : -1; o2[axes[1]] = c[axes[1]] ? 1 : -1;
    const s1 = isOpaque(getB(bx + o1[0], by + o1[1], bz + o1[2])) ? 1 : 0;
    const s2 = isOpaque(getB(bx + o2[0], by + o2[1], bz + o2[2])) ? 1 : 0;
    const cn = isOpaque(getB(bx + o1[0] + o2[0], by + o1[1] + o2[1], bz + o1[2] + o2[2])) ? 1 : 0;
    const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cn);
    const f = AO_LEVEL[ao], i = n0 + k * 3;
    g.c[i] *= f; g.c[i + 1] *= f; g.c[i + 2] *= f;
  });
};

// ---------- C) skin / clothes / armour textures ----------
function noiseTex(w, h, lo, hi, edge) {
  const c = cv(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = lo + Math.random() * (hi - lo);
    if (edge && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) v *= 0.78;
    const k = Math.round(v * 255); g.fillStyle = `rgb(${k},${k},${k})`; g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
const SKIN_TEX = noiseTex(8, 12, 0.9, 1.0), CLOTH_TEX = noiseTex(8, 12, 0.78, 1.0), PANTS_TEX = noiseTex(4, 12, 0.8, 1.0), ARMOR_TEX = noiseTex(8, 8, 0.82, 1.0, true);
const _makeModelMC = makeModel;
makeModel = function (e) {
  _makeModelMC(e);
  const [skin, shirt, pants, shoe] = e.mats;
  if (skin) { skin.map = SKIN_TEX; skin.needsUpdate = true; }
  if (shirt) { shirt.map = CLOTH_TEX; shirt.needsUpdate = true; }
  if (pants) { pants.map = PANTS_TEX; pants.needsUpdate = true; }
  if (shoe) { shoe.map = PANTS_TEX; shoe.needsUpdate = true; }
  if (e.armorMat) { e.armorMat.map = ARMOR_TEX; e.armorMat.needsUpdate = true; }
};

// ---------- D) sky dome ----------
const skyGeo = new THREE.SphereGeometry(320, 24, 16);
{
  const top = new THREE.Color(0x5f93ff), mid = new THREE.Color(0x9ec4ff), low = new THREE.Color(0xc4dcff), col = [];
  const p = skyGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const h = p.getY(i) / 320, c = new THREE.Color();
    if (h > 0.15) c.copy(mid).lerp(top, Math.min(1, (h - 0.15) / 0.6)); else c.copy(low).lerp(mid, clamp((h + 0.1) / 0.25, 0, 1));
    col.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
}
const skyDome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
skyDome.renderOrder = -10; scene.add(skyDome);
scene.fog.color.set(0xb4d2ff);

// ---------- E) 3D extruded items ----------
const extrudeCache = new Map();
function extrudeIcon(canvas) {
  if (extrudeCache.has(canvas)) return extrudeCache.get(canvas);
  const N = canvas.width, d = canvas.getContext('2d').getImageData(0, 0, N, N).data;
  const op = (x, y) => x >= 0 && y >= 0 && x < N && y < N && d[(y * N + x) * 4 + 3] > 128;
  const P = [], C = [], s = 1 / N, t = s / 2;
  const face = (v, r, g, b, sh) => { for (const q of [0, 1, 2, 0, 2, 3]) { P.push(...v[q]); C.push(r * sh, g * sh, b * sh); } };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!op(x, y)) continue;
    const k = (y * N + x) * 4, r = d[k] / 255, g = d[k + 1] / 255, b = d[k + 2] / 255;
    const x0 = x * s - 0.5, x1 = x0 + s, y1 = 0.5 - y * s, y0 = y1 - s;
    face([[x0, y0, t], [x1, y0, t], [x1, y1, t], [x0, y1, t]], r, g, b, 1);
    face([[x1, y0, -t], [x0, y0, -t], [x0, y1, -t], [x1, y1, -t]], r, g, b, 0.75);
    if (!op(x - 1, y)) face([[x0, y0, -t], [x0, y0, t], [x0, y1, t], [x0, y1, -t]], r, g, b, 0.8);
    if (!op(x + 1, y)) face([[x1, y0, t], [x1, y0, -t], [x1, y1, -t], [x1, y1, t]], r, g, b, 0.8);
    if (!op(x, y - 1)) face([[x0, y1, t], [x1, y1, t], [x1, y1, -t], [x0, y1, -t]], r, g, b, 0.95);
    if (!op(x, y + 1)) face([[x0, y0, -t], [x1, y0, -t], [x1, y0, t], [x0, y0, t]], r, g, b, 0.6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.computeVertexNormals();
  extrudeCache.set(canvas, geo);
  return geo;
}
const vmItem3D = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, side: THREE.DoubleSide }));
vmItem3D.renderOrder = 1000; vm.add(vmItem3D);
let equipT = -1e9, lastHeldMC = null, lastSelMC = -1;
const _updateCameraMC = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraMC(alpha, dt);
  skyDome.position.copy(camera.position);
  const p = player;
  vmItem3D.visible = false;
  if (!p || p.dead || !vm.visible) return;
  // F) lower + raise the hand when you switch items
  if (p.sel !== lastSelMC || p.held !== lastHeldMC) { if (lastSelMC !== -1) equipT = performance.now(); lastSelMC = p.sel; lastHeldMC = p.held; }
  const et = (performance.now() - equipT) / 260;
  if (et < 1) vm.position.y -= (1 - Math.abs(et * 2 - 1)) * 0.35 * (et < 0.5 ? 1 : 1);
  // E) swap the flat sprite for a 3D item
  const it = p.held;
  if (!vmItem.visible || !it || it.k === 'block') return;
  const ic = it.k === 'bow' && p.using === 'bow' && p.useT > 6 ? ICON.bowPull : itemIcon(it);
  if (!ic || ic.width !== 16) return;
  vmItem3D.geometry = extrudeIcon(ic);
  vmItem3D.position.copy(vmItem.position); vmItem3D.rotation.copy(vmItem.rotation);
  vmItem3D.scale.set(vmItem.scale.x * 0.42, vmItem.scale.y * 0.42, 0.42);
  vmItem3D.visible = true; vmItem.visible = false;
};

// ---------- G) sword sweep (1.9+) ----------
SND.sweep = v => { noise(0.2, 0.3 * v, 2200, 0.6); };
const _attackSweep = attack;
attack = function (a, t, reach) {
  const canSweep = !COMBAT18 && a.held && a.held.k === 'sword' && cooldown(a) > 0.9 && a.onGround && !a.sprinting;
  const r = _attackSweep(a, t, reach);
  if (r && canSweep) {
    let any = false;
    for (const m of mobs) {
      if (m === a || m === t || m.dead || m.team === a.team) continue;
      if (Math.abs(m.x - t.x) > 1.3 || Math.abs(m.z - t.z) > 1.3 || Math.abs(m.y - t.y) > 0.6) continue;
      if (Math.hypot(m.x - a.x, m.z - a.z) > 3.5) continue;
      if (_hurtSweep(m, 1, { att: a, kind: 'melee' })) knockback(m, 0.4, a.x - m.x, a.z - m.z);
      any = true;
    }
    const y = a.yaw * DEG, fx = a.x - Math.sin(y) * 1.2, fz = a.z + Math.cos(y) * 1.2;
    for (let i = -4; i <= 4; i++) { const ang = y + i * 0.18; spawnP(a.x - Math.sin(ang) * 1.3, a.y + 1.1, a.z + Math.cos(ang) * 1.3, 0, 0, 0, '#f4f4f4', 0.25, 0.09, 0); }
    sfx('sweep', fx, a.y + 1, fz, any ? 1 : 0.6);
  }
  return r;
};
function _hurtSweep(m, amt, src) { return hurt(m, amt, src); }

// rebuild the current world so smooth lighting shows straight away
rebuildAll();
