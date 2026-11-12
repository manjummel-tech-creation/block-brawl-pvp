// ================= MATCH THE SMP CLIP =================
// - First-person item rendered exactly like MC: big 3D item, MC's real swing math (ItemInHandRenderer) and equip dip
// - Bigger first-person shield (bottom-left)
// - Dense, jagged MC-style cobweb texture
// - Dark-red damage-indicator particles on hits (1.9+)
// - Potion-effect icons top-right (Strength / Regeneration / Absorption) like the MC HUD

// ---------- MC first-person item transform ----------
const mcHand = new THREE.Group(); mcHand.matrixAutoUpdate = false; camera.add(mcHand);
const mcItem = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, side: THREE.DoubleSide }));
mcItem.renderOrder = 1002; mcItem.matrixAutoUpdate = false; mcHand.add(mcItem);
const _M = new THREE.Matrix4(), _T = new THREE.Matrix4(), _R = new THREE.Matrix4(), _S = new THREE.Matrix4();
const D2R = Math.PI / 180;
// MC "handheld" model display, firstperson_righthand: rotation [0,-90,25], translation [1.13,3.2,1.13]/16, scale 0.68
const HANDHELD = new THREE.Matrix4().compose(new THREE.Vector3(1.13 / 16, 3.2 / 16, 1.13 / 16),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -90 * D2R, 25 * D2R, 'XYZ')), new THREE.Vector3(1.0, 1.0, 1.0)); // bigger than vanilla 0.68, like the clip
// generated items (apple, potions, bucket, wind charge): rotation [0,-90,25], translation [1.13,3.2,1.13], scale 0.68 as well
let mcEquipK = 1;
const _updateCameraClip = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraClip(alpha, dt);
  mcItem.visible = false;
  const p = player;
  if (!p || p.dead || state !== 'play' || thirdPerson || !vm.visible || (game && game.spec && p.dead)) return;
  const it = p.held && !(p.held.n !== undefined && p.held.n <= 0) ? p.held : null;
  if (!it || it.k === 'block' || p.using) return;           // blocks & bow/eat/block poses keep the existing renderer
  const ic = itemIcon(it); if (!ic || ic.width !== 16) return;
  // equip progress (dip when switching)
  const et = clamp((performance.now() - equipT) / 260, 0, 1);
  mcEquipK = et;
  // swing progress (MC: 6 ticks)
  const f = p.swingT > 0 ? clamp(1 - (p.swingT - alpha) / 6, 0, 1) : 0;
  const sf = Math.sqrt(f);
  // --- ItemInHandRenderer.renderArmWithItem (right hand) ---
  _M.identity();
  _M.multiply(_T.makeTranslation(-0.5 * Math.sin(sf * Math.PI), 0.22 * Math.sin(sf * Math.PI * 2), -0.28 * Math.sin(f * Math.PI)));
  _M.multiply(_T.makeTranslation(0.56, -0.6 + (1 - et) * -0.6, -0.78));
  // applyItemArmAttackTransform
  const a1 = Math.sin(f * f * Math.PI), a2 = Math.sin(sf * Math.PI);
  _M.multiply(_R.makeRotationY((45 + a1 * -20) * D2R));
  _M.multiply(_R.makeRotationZ(a2 * -20 * D2R));
  _M.multiply(_R.makeRotationX(a2 * -88 * D2R));
  _M.multiply(_R.makeRotationY(-45 * D2R));
  // weapon sway from earlier feel pass
  _M.premultiply(_T.makeTranslation(vm.position.x, 0, 0));
  _M.multiply(HANDHELD);
  if (it.k === 'mace') { _M.multiply(_S.makeScale(1.2, 1.2, 1.2)); _M.premultiply(_T.makeTranslation(-0.1, 0.24, 0.02)); } // chunkier mace, lifted into view
  mcHand.matrix.copy(_M); mcHand.matrixWorldNeedsUpdate = true;
  mcItem.geometry = extrudeIcon(ic);
  mcItem.matrix.identity();
  mcItem.visible = true;
  vmItem.visible = false; vmItem3D.visible = false; vmArm.visible = false;
};

// ---------- bigger first-person shield ----------
const _updateCameraShieldBig = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraShieldBig(alpha, dt);
  if (!vmShield.visible) return;
  vmShield.scale.setScalar(1.55);
  vmShield.position.x -= 0.12 * (1 - vmShieldK); vmShield.position.y -= 0.12 * (1 - vmShieldK);
};

// ---------- MC-style cobweb texture (dense, jagged) ----------
(function () {
  srand(4242);
  const W2 = 16, cells = new Array(256).fill(0);
  const put = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 16 && y < 16) cells[y * 16 + x] = Math.max(cells[y * 16 + x], v); };
  // spokes
  for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2 + 0.2; for (let r = 0; r < 9; r += 0.5) put(7.5 + Math.cos(ang) * r, 7.5 + Math.sin(ang) * r, 2); }
  // jagged rings
  for (const R0 of [2.2, 4.3, 6.4]) for (let a = 0; a < 6.283; a += 0.12) { const r = R0 + (rnd() - 0.5) * 0.9; put(7.5 + Math.cos(a) * r, 7.5 + Math.sin(a) * r, 1); }
  // random strands & clumps
  for (let i = 0; i < 28; i++) { const x = rnd() * 16, y = rnd() * 16; put(x, y, 1); if (rnd() < 0.4) put(x + 1, y, 1); }
  makeTile(T.WEB, (x, y) => {
    const v = cells[y * 16 + x];
    if (!v) return [0, 0, 0, 0];
    return v === 2 ? [238, 238, 238, 255] : (rnd() < 0.3 ? [190, 190, 190, 255] : [220, 220, 220, 255]);
  });
  atlasTex.needsUpdate = true;
  for (const k in iconCache) if (k.startsWith('block14')) delete iconCache[k];
})();

// ---------- damage indicator particles ----------
const _dealDamageClip = dealDamage;
dealDamage = function (t, amt, src) {
  const r = _dealDamageClip(t, amt, src);
  if (src && src.att && amt > 0.3 && !COMBAT18) {
    const n = Math.min(10, Math.max(1, Math.round(amt / 2)));
    burst(t.x, t.y + 1.3, t.z, n, ['#5a0a0a', '#7a1010', '#3a0505'], 1.6, 0.7, 0.09, 4, 1.2);
  }
  return r;
};

// ---------- potion-effect icons (top-right, like the MC HUD) ----------
const effIcon = (fill, rows) => pxArt(px => rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') px(x + 4, y + 4, c === 'X' ? '#1a1a1a' : fill); })));
const EFF = {
  strength: { col: '#c0302a', ic: effIcon('#e04a3a', ['..XX....', '.XooX...', 'XooooX..', '.XoooXX.', '..XooooX', '...XooX.', '....XX..']) },
  regen: { col: '#e06aa0', ic: effIcon('#ff7ab8', ['.XX.XX..', 'XooXooX.', 'XoooooX.', '.XoooX..', '..XoX...', '...X....']) },
  absorb: { col: '#f2c624', ic: effIcon('#f2c624', ['.XX.XX..', 'XooXooX.', 'XoooooX.', '.XoooX..', '..XoX...', '...X....']) }
};
const _drawHUDClip = drawHUD;
drawHUD = function (a) {
  _drawHUDClip(a);
  if (state !== 'play' || !game || !player || player.dead) return;
  const p = player, list = [];
  const str = Math.max((p.strPotUntil || 0) - tick, (p.strengthUntil || 0) - tick);
  if (str > 0) list.push(['strength', str]);
  if (p.regenFx > 0) list.push(['regen', p.regenFx]);
  if (p.absorption > 0) list.push(['absorb', p.totemAbsUntil ? p.totemAbsUntil - tick : -1]);
  const g = hctx, S = 44;
  list.forEach(([k, left], i) => {
    const x = W - 12 - (i + 1) * (S + 6), y = 210;
    g.fillStyle = 'rgba(30,30,30,.7)'; g.fillRect(x, y, S, S);
    g.strokeStyle = left >= 0 && left < 60 ? '#ffffff' : '#8a8a8a'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, S - 2, S - 2);
    g.globalAlpha = left >= 0 && left < 60 ? 0.5 + 0.5 * Math.abs(Math.sin(performance.now() / 150)) : 1;
    g.drawImage(EFF[k].ic, x + 4, y + 4, S - 8, S - 8); g.globalAlpha = 1;
    if (left >= 0) txt(`${Math.ceil(left / 20)}s`, x + S / 2, y + S + 14, 16, '#fff', 'center');
  });
};
