// ================= HELD ITEMS DONE RIGHT + THICKER SWORDS + THOR'S-HAMMER MACE =================

// ---------- Mjolnir-style mace icon ----------
ICON.mace = pxArt(px => {
  // leather-wrapped handle from bottom-left toward the head
  for (let i = 0; i < 8; i++) { const x = 2 + i, y = 13 - i; px(x, y, i % 2 ? '#6b4a22' : '#4a3015'); px(x + 1, y, '#2e1c0a'); }
  px(1, 14, '#c8c8d0'); px(2, 14, '#8a8a94'); px(1, 13, '#8a8a94'); // pommel cap
  px(0, 15, '#5a3c1a'); px(1, 15, '#5a3c1a');                         // strap
  // big blocky head, perpendicular to the handle, centred at the handle's end
  const cx = 11, cy = 4;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const a = ((x - cx) + (y - cy)) / Math.SQRT2, b = ((x - cx) - (y - cy)) / Math.SQRT2; // a: along head, b: along handle
    if (Math.abs(a) <= 4.6 && Math.abs(b) <= 2.4) {
      const edge = Math.abs(a) > 3.8 || Math.abs(b) > 1.7;
      const rune = Math.abs(b) < 0.6 && Math.abs(a) < 2.6 && ((x + y) % 2 === 0);
      px(x, y, edge ? '#5c5c66' : rune ? '#8fd0ff' : (a < 0 ? '#e2e2ea' : '#b4b4be'));
    }
  }
});
for (const k in iconCache) if (k.startsWith('mace')) delete iconCache[k];

// ---------- thicker 3D items ----------
const extrude2Cache = new Map();
function extrude2(canvas, thick) {
  const key = canvas; let byT = extrude2Cache.get(key); if (!byT) extrude2Cache.set(key, byT = {});
  if (byT[thick]) return byT[thick];
  const N = canvas.width, d = canvas.getContext('2d').getImageData(0, 0, N, N).data;
  const op = (x, y) => x >= 0 && y >= 0 && x < N && y < N && d[(y * N + x) * 4 + 3] > 128;
  const P = [], C = [], s = 1 / N, t = s * thick / 2;
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
  return (byT[thick] = geo);
}
const THICK = { sword: 2.2, axe: 2.2, mace: 3.2, pick: 1.6 };

// ---------- 3rd-person held item: proper MC hold (handle in the fist, blade forward + up) ----------
// item space: handle at bottom-left, tip at top-right -> blade dir (1,1,0); we map it to "forward & up" in the arm.
const HOLD_Q = (() => {
  const u = new THREE.Vector3(1, 1, 0).normalize(), n = new THREE.Vector3(0, 0, 1), w = new THREE.Vector3().crossVectors(n, u);
  // arm hangs down (-y). Blade should point forward (+z) and slightly up; flat of the blade faces sideways (x)
  const U = new THREE.Vector3(0, 0.55, 1).normalize(), N2 = new THREE.Vector3(1, 0, 0), W2 = new THREE.Vector3().crossVectors(N2, U);
  const A = new THREE.Matrix4().makeBasis(u, n, w), Bm = new THREE.Matrix4().makeBasis(U, N2, W2);
  return new THREE.Quaternion().setFromRotationMatrix(Bm.multiply(A.transpose()));
})();
const heldMat3 = new THREE.MeshBasicMaterial({ vertexColors: true });
function ensureHeld3(m) {
  const pr = m.parts; if (!pr || pr.held3) return;
  const g = new THREE.Group(); g.position.set(0, -10 * PX, 0.5 * PX); g.quaternion.copy(HOLD_Q);
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), heldMat3);
  g.add(mesh); pr.armR.add(g); pr.held3 = mesh; pr.held3g = g;
}
const _updateModelsHeld = updateModels;
updateModels = function (alpha) {
  _updateModelsHeld(alpha);
  for (const m of mobs) {
    const pr = m.parts; if (!pr) continue;
    ensureHeld3(m);
    const it = m.held && !(m.held.n !== undefined && m.held.n <= 0) ? m.held : null;
    const ic = it ? (it.k === 'bow' && m.using === 'bow' && m.useT > 6 ? ICON.bowPull : itemIcon(it)) : null;
    if (ic && ic.width === 16) {
      const s = (it.k === 'mace' ? 0.95 : 0.78);
      pr.held3.geometry = extrude2(ic, THICK[it.k] || 1);
      pr.held3.scale.setScalar(s);
      pr.held3.position.set(0.4 * s, 0.4 * s, 0);              // put the handle (bottom-left pixel) in the fist
      pr.held3.visible = true; pr.held.visible = false;
    } else { pr.held3.visible = false; }
  }
};

// ---------- first-person: thicker swords / chunky hammer ----------
const _updateCameraThick = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraThick(alpha, dt);
  if (typeof mcItem === 'undefined' || !mcItem.visible || !player || !player.held) return;
  const it = player.held, th = THICK[it.k];
  if (th) mcItem.geometry = extrude2(itemIcon(it), th);
};

// ---------- Thor's hammer smash: lightning + thunder + shockwave ----------
SND.thunder = v => { noise(1.4, 0.8 * v, 160, 0.5, 0, 'lowpass'); noise(0.25, 0.6 * v, 2600, 0.7); noise(0.9, 0.5 * v, 80, 0.7, 0.15, 'lowpass'); };
const bolts = [];
function lightning(x, y, z) {
  const pts = []; let cx = x, cz = z;
  for (let h = 28; h >= 0; h -= 2) { pts.push(new THREE.Vector3(cx, y + h, cz)); cx = x + (Math.random() - 0.5) * (h > 2 ? 1.6 : 0.2); cz = z + (Math.random() - 0.5) * (h > 2 ? 1.6 : 0.2); }
  pts.push(new THREE.Vector3(x, y, z));
  const grp = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, len, 0.22), new THREE.MeshBasicMaterial({ color: 0xdfefff, fog: false }));
    seg.position.copy(a).add(b).multiplyScalar(0.5); seg.lookAt(b); seg.rotateX(Math.PI / 2); grp.add(seg);
  }
  scene.add(grp); bolts.push({ g: grp, t: performance.now() });
  // shockwave ring
  for (let i = 0; i < 36; i++) { const ang = i / 36 * Math.PI * 2; spawnP(x, y + 0.2, z, Math.cos(ang) * 7, 0.6, Math.sin(ang) * 7, i % 2 ? '#bfe3ff' : '#ffffff', 0.45, 0.12, 0); }
  burst(x, y + 1, z, 30, ['#ffffff', '#9fd4ff', '#5aa8ff'], 4, 0.6, 0.1, 2, 1.5);
  sfx('thunder', x, y, z);
  if (player && Math.hypot(player.x - x, player.z - z) < 30) thorFlashT = performance.now();
}
let thorFlashT = -1e9;
const _attackThor = attack;
attack = function (a, t, reach) {
  const smash = a.held && a.held.k === 'mace' && !a.onGround && a.fallDistance > 1.5;
  const r = _attackThor(a, t, reach);
  if (r && smash) { lightning(t.x, t.y, t.z); if (a === player) camShake = 1; }
  return r;
};
const _stepAndRenderThor = stepAndRender;
stepAndRender = function (dt) {
  const now = performance.now();
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i], age = now - b.t;
    b.g.visible = age < 90 || (age > 140 && age < 230);          // flicker like real lightning
    if (age > 260) { scene.remove(b.g); b.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); bolts.splice(i, 1); }
  }
  _stepAndRenderThor(dt);
};
const _drawHUDThor = drawHUD;
drawHUD = function (al) {
  _drawHUDThor(al);
  const s = performance.now() - thorFlashT;
  if (s < 260) { hctx.setTransform(DPR, 0, 0, DPR, 0, 0); hctx.fillStyle = `rgba(220,235,255,${0.45 * (1 - s / 260)})`; hctx.fillRect(0, 0, W, H); }
};
const _itemNameThor = itemName;
itemName = function (it) { if (it && it.k === 'mace') return (CFG.maceMode === 'bounce' ? 'Bounce' : 'Stun') + " Mace — Thor's Hammer (smash from height)"; return _itemNameThor(it); };
