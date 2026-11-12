// ================= ITEMS, ICONS, MODELS, MOBS, PHYSICS, COMBAT =================
const TIERS = {
  wood:      { n: 'Wooden',    sw: 4, ax: 7,  axs: 0.8, mine: 2,  col: ['#6b5230', '#a0824e', '#c4a46a'] },
  stone:     { n: 'Stone',     sw: 5, ax: 9,  axs: 0.8, mine: 4,  col: ['#4a4a4a', '#7c7c7c', '#a8a8a8'] },
  iron:      { n: 'Iron',      sw: 6, ax: 9,  axs: 0.9, mine: 6,  col: ['#6e6e6e', '#d0d0d0', '#ffffff'] },
  gold:      { n: 'Golden',    sw: 4, ax: 7,  axs: 1.0, mine: 12, col: ['#8a6a10', '#f0cc30', '#fff6a0'] },
  diamond:   { n: 'Diamond',   sw: 7, ax: 9,  axs: 1.0, mine: 8,  col: ['#126a62', '#33ebcb', '#c8fff4'] },
  netherite: { n: 'Netherite', sw: 8, ax: 10, axs: 1.0, mine: 9,  col: ['#241e22', '#4a4044', '#7a6e72'] }
};
const ARMOR = {
  none:      { n: 'None',      pts: 0,  tough: 0,  kb: 0,   col: null },
  leather:   { n: 'Leather',   pts: 7,  tough: 0,  kb: 0,   col: 0x8b5a2b },
  gold:      { n: 'Gold',      pts: 11, tough: 0,  kb: 0,   col: 0xf0cc30 },
  chain:     { n: 'Chain',     pts: 12, tough: 0,  kb: 0,   col: 0x8c8c8c },
  iron:      { n: 'Iron',      pts: 15, tough: 0,  kb: 0,   col: 0xdcdcdc },
  diamond:   { n: 'Diamond',   pts: 20, tough: 8,  kb: 0,   col: 0x3fe0d0 },
  netherite: { n: 'Netherite', pts: 20, tough: 12, kb: 0.4, col: 0x4a4044 }
};

// ---------- item icons (pixel art, drawn procedurally) ----------
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function pxArt(draw) { const c = cv(16); const g = c.getContext('2d'); draw((x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); }); return c; }
function line(px, x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col); }
const ICON = {};
function swordIcon(t) {
  const c = TIERS[t].col;
  return pxArt(px => {
    for (let i = 0; i < 10; i++) { const x = 5 + i, y = 10 - i; px(x, y, c[1]); px(x + 1, y, c[2]); px(x, y - 1, c[0]); px(x + 1, y + 1, c[0]); }
    px(15, 0, c[0]); px(14, 0, c[0]); px(15, 1, c[0]);
    line(px, 2, 9, 6, 13, '#2c1e0e'); line(px, 3, 9, 6, 12, '#5a3c1a'); // guard
    line(px, 1, 14, 4, 11, '#5a3c1a'); px(0, 15, '#2c1e0e'); px(1, 15, '#2c1e0e'); px(0, 14, '#2c1e0e');
  });
}
function toolHandle(px) { for (let i = 0; i < 11; i++) { px(2 + i, 14 - i, '#6b4a22'); px(3 + i, 14 - i, '#3e2a12'); } }
function axeIcon(t) {
  const c = TIERS[t].col;
  return pxArt(px => {
    toolHandle(px);
    for (let y = 1; y < 9; y++) for (let x = 8; x < 15; x++) {
      const d = Math.abs(x - 11.2) * 0.8 + Math.abs(y - 4.5) * 0.75;
      if (d < 3.2 && !(x < 10 && y > 6)) px(x, y, x > 12 ? c[2] : d > 2.4 ? c[0] : c[1]);
    }
  });
}
function pickIcon(t) {
  const c = TIERS[t].col;
  return pxArt(px => {
    toolHandle(px);
    for (let x = 3; x < 16; x++) { const y = Math.round(1 + Math.pow((x - 9.5) / 4.2, 2)); if (y < 8) { px(x, y, c[1]); px(x, y + 1, c[0]); px(x, y - 1, c[2]); } }
  });
}
ICON.bow = pxArt(px => {
  for (let a = 0; a <= 90; a += 3) { const r = a * DEG; px(Math.round(2 + 11 * Math.cos(r)), Math.round(14 - 11 * Math.sin(r)), '#6b4a22'); px(Math.round(2 + 10 * Math.cos(r)), Math.round(14 - 10 * Math.sin(r)), '#3e2a12'); }
  line(px, 2, 3, 13, 14, '#d8d8d8');
});
ICON.bowPull = pxArt(px => {
  for (let a = 0; a <= 90; a += 3) { const r = a * DEG; px(Math.round(4 + 10 * Math.cos(r)), Math.round(12 - 10 * Math.sin(r)), '#6b4a22'); }
  line(px, 4, 2, 1, 15, '#d8d8d8'); line(px, 1, 15, 14, 12, '#d8d8d8');
  line(px, 2, 13, 12, 3, '#8a6a40'); px(12, 3, '#ccc'); px(13, 2, '#ccc');
});
ICON.gapple = pxArt(px => {
  for (let y = 4; y < 15; y++) for (let x = 2; x < 14; x++) {
    const d = Math.hypot((x - 7.5) / 5.6, (y - 9.3) / 5.2); if (d < 1) px(x, y, d > 0.82 ? '#9a6e00' : (x < 6 && y < 8) ? '#fff6b0' : '#f2c624');
  }
  px(8, 2, '#5a3c1a'); px(8, 3, '#5a3c1a'); px(9, 2, '#3a9a20'); px(10, 1, '#3a9a20'); px(10, 2, '#2a7a14');
});
ICON.arrow = pxArt(px => {
  line(px, 3, 12, 12, 3, '#8a6a40'); px(13, 2, '#bbb'); px(12, 2, '#888'); px(13, 3, '#888'); px(14, 1, '#ddd');
  px(2, 12, '#eee'); px(3, 13, '#eee'); px(1, 13, '#ddd'); px(2, 14, '#ddd'); px(2, 13, '#aaa');
});
ICON.fist = pxArt(px => { for (let y = 5; y < 12; y++) for (let x = 4; x < 12; x++) px(x, y, (x + y) % 5 ? '#c69c7b' : '#b0886a'); });
function blockIcon(id) {
  const c = cv(32), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const b = BL[id];
  if (b.cross) { g.drawImage(tileCv[b.tiles[0]], 0, 0, 32, 32); return c; }
  const top = tileCv[b.tiles[0]], side = tileCv[b.tiles[1]];
  g.setTransform(15 / 16, 7 / 16, -15 / 16, 7 / 16, 16, 1); g.drawImage(top, 0, 0);
  g.setTransform(15 / 16, 7 / 16, 0, 1, 1, 8); g.drawImage(side, 0, 0); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 16, 16);
  g.setTransform(15 / 16, -7 / 16, 0, 1, 16, 15); g.drawImage(side, 0, 0); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, 16, 16);
  return c;
}
const iconCache = {};
function itemIcon(it) {
  if (!it) return null;
  const key = it.k + (it.tier || '') + (it.id || '');
  if (iconCache[key]) return iconCache[key];
  let c;
  if (it.k === 'sword') c = swordIcon(it.tier);
  else if (it.k === 'axe') c = axeIcon(it.tier);
  else if (it.k === 'pick') c = pickIcon(it.tier);
  else if (it.k === 'bow') c = ICON.bow;
  else if (it.k === 'gapple') c = ICON.gapple;
  else if (it.k === 'block') c = blockIcon(it.id);
  else c = ICON.fist;
  return (iconCache[key] = c);
}
const texCache = new Map();
function canvasTex(c) {
  if (texCache.has(c)) return texCache.get(c);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  texCache.set(c, t); return t;
}
function itemName(it) {
  if (!it) return 'Fist';
  if (it.k === 'sword') return TIERS[it.tier].n + ' Sword' + (it.sharp ? ' (Sharp ' + it.sharp + ')' : '');
  if (it.k === 'axe') return TIERS[it.tier].n + ' Axe' + (it.sharp ? ' (Sharp ' + it.sharp + ')' : '');
  if (it.k === 'pick') return TIERS[it.tier].n + ' Pickaxe';
  if (it.k === 'bow') return 'Bow' + (it.power ? ' (Power ' + it.power + ')' : '');
  if (it.k === 'gapple') return 'Golden Apple';
  if (it.k === 'block') return BL[it.id].name;
  return '?';
}

// ---------- humanoid model ----------
const PX = 1.8 / 32;
const faceCache = {};
function headTextures(hair, eye) {
  const key = hair + eye; if (faceCache[key]) return faceCache[key];
  const mk = (fn) => { const c = cv(8); const g = c.getContext('2d'); g.fillStyle = '#c69c7b'; g.fillRect(0, 0, 8, 8); fn(g); return canvasTex(c); };
  const front = mk(g => { g.fillStyle = hair; g.fillRect(0, 0, 8, 2); g.fillRect(0, 2, 1, 1); g.fillRect(7, 2, 1, 1);
    g.fillStyle = '#fff'; g.fillRect(1, 4, 2, 1); g.fillRect(5, 4, 2, 1); g.fillStyle = eye; g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
    g.fillStyle = '#8a5a44'; g.fillRect(3, 5, 2, 1); g.fillStyle = '#6a3a2a'; g.fillRect(2, 6, 4, 1); });
  const side = mk(g => { g.fillStyle = hair; g.fillRect(0, 0, 8, 3); g.fillRect(0, 3, 3, 1); });
  const back = mk(g => { g.fillStyle = hair; g.fillRect(0, 0, 8, 5); });
  const top = mk(g => { g.fillStyle = hair; g.fillRect(0, 0, 8, 8); });
  const bot = mk(() => {});
  return (faceCache[key] = [side, side, top, bot, front, back]);
}
function bx(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mat); }
function makeModel(e) {
  const root = new THREE.Group();
  const lam = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); e.mats.push(m); return m; };
  const skin = lam(0xc69c7b), shirt = lam(e.color), pants = lam(e.pants || 0x2b3a8f), shoe = lam(0x3a3a3a);
  const ht = headTextures(e.hair, e.eye);
  const headMats = ht.map(t => { const m = new THREE.MeshLambertMaterial({ map: t }); e.mats.push(m); return m; });
  const body = new THREE.Group(); root.add(body);
  const head = new THREE.Group(); head.position.y = 24 * PX; body.add(head);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(8 * PX, 8 * PX, 8 * PX), headMats); hm.position.y = 4 * PX; head.add(hm);
  const torso = bx(8, 12, 4, shirt); torso.position.y = 18 * PX; body.add(torso);
  const mkLimb = (x, y, mat, lower) => {
    const g = new THREE.Group(); g.position.set(x * PX, y * PX, 0);
    const m = bx(4, 12, 4, mat); m.position.y = (lower ? -6 : -4) * PX; g.add(m);
    if (lower) { const s = bx(4.2, 2, 4.2, shoe); s.position.y = -11 * PX; g.add(s); }
    else { const h = bx(4.05, 9, 4.05, shirt); h.position.y = -1.5 * PX; g.add(h); }
    body.add(g); return g;
  };
  const armR = mkLimb(-6, 22, skin), armL = mkLimb(6, 22, skin);
  const legR = mkLimb(-2, 12, pants, true), legL = mkLimb(2, 12, pants, true);
  // armour
  const A = ARMOR[e.armor];
  if (A && A.col) {
    const am = new THREE.MeshLambertMaterial({ color: A.col, emissive: e.prot > 0 ? 0x2a1040 : 0x000000 });
    e.mats.push(am); e.armorMat = am;
    const helm = bx(9, 9, 9, am); helm.position.y = 4.3 * PX; head.add(helm);
    // keep the face visible: helmet is an open shell (front face hidden)
    helm.geometry.groups.forEach(g => { if (g.materialIndex === 4) g.count = 0; });
    const chest = bx(9, 12.6, 5, am); chest.position.y = 18 * PX; body.add(chest);
    for (const arm of [armR, armL]) { const s = bx(5, 6, 5, am); s.position.y = -0.5 * PX; arm.add(s); }
    for (const leg of [legR, legL]) { const l = bx(4.7, 7, 4.7, am); l.position.y = -3.4 * PX; leg.add(l); const b2 = bx(4.9, 4.5, 4.9, am); b2.position.y = -9.9 * PX; leg.add(b2); }
  }
  // held item
  const held = new THREE.Mesh(new THREE.PlaneGeometry(14 * PX, 14 * PX), new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  held.position.set(0, -10 * PX, 4 * PX); held.rotation.set(0, Math.PI / 2, 0);
  const holder = new THREE.Group(); holder.add(held); holder.rotation.x = -Math.PI / 2 + 0.3; armR.add(holder);
  // name tag
  const tagC = cv(256, 64); const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tagC), depthTest: false, transparent: true }));
  tag.scale.set(1.6, 0.4, 1); tag.position.y = 2.25; tag.renderOrder = 10; root.add(tag);
  // hitbox
  const hb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.6, 1.8, 0.6)), new THREE.LineBasicMaterial({ color: 0xffffff }));
  hb.position.y = 0.9; root.add(hb);
  const look = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.62, 0), new THREE.Vector3(0, 1.62, 2)]), new THREE.LineBasicMaterial({ color: 0x3366ff }));
  root.add(look);
  e.parts = { root, body, head, armR, armL, legR, legL, held, holder, tag, tagC, hb, look };
  scene.add(root);
}
function drawTag(e) {
  const c = e.parts.tagC, g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(0,0,0,0.38)';
  g.font = '30px VT323, monospace'; g.textAlign = 'center';
  const name = e.name, w = g.measureText(name).width + 14;
  g.fillRect(128 - w / 2, 2, w, 30);
  g.fillStyle = e.teamCol || '#fff'; g.fillText(name, 128, 27);
  const hp = Math.ceil(e.health + e.absorption) / 2;
  g.font = '26px VT323, monospace';
  const s = '❤ ' + (Math.round(hp * 2) / 2).toFixed(1);
  const w2 = g.measureText(s).width + 12;
  g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(128 - w2 / 2, 34, w2, 26);
  g.fillStyle = e.absorption > 0 ? '#f8d030' : hp > 6 ? '#ff5555' : hp > 3 ? '#ffaa00' : '#ff2020'; g.fillText(s, 128, 55);
  e.parts.tag.material.map.needsUpdate = true;
  e.tagHp = e.health + e.absorption;
}
function setHeldVisual(e) {
  const it = e.held, p = e.parts; if (!p) return;
  const ic = it ? (it.k === 'bow' && e.using === 'bow' && e.useT > 6 ? ICON.bowPull : itemIcon(it)) : null;
  if (!ic) { p.held.visible = false; return; }
  p.held.visible = true;
  if (p.held.material.map !== canvasTex(ic)) { p.held.material.map = canvasTex(ic); p.held.material.needsUpdate = true; }
  const isBlock = it.k === 'block' || it.k === 'gapple';
  p.held.scale.setScalar(isBlock ? 0.6 : 1);
}

// ---------- particles ----------
const PMAX = 900;
const P = { x: new Float32Array(PMAX), y: new Float32Array(PMAX), z: new Float32Array(PMAX), vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX),
  life: new Float32Array(PMAX), s: new Float32Array(PMAX), g: new Float32Array(PMAX), n: 0, mesh: null };
const _pm = new THREE.Matrix4(), _pc = new THREE.Color();
function initParticles() {
  P.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), PMAX);
  P.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  P.mesh.setColorAt(0, _pc.set(0xffffff)); P.mesh.count = 0; P.mesh.frustumCulled = false; scene.add(P.mesh);
}
function spawnP(x, y, z, vx, vy, vz, col, life, size, grav) {
  let i = P.n < PMAX ? P.n++ : (Math.random() * PMAX) | 0;
  P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz; P.life[i] = life; P.s[i] = size; P.g[i] = grav == null ? 9 : grav;
  P.mesh.setColorAt(i, _pc.set(col));
  P.mesh.instanceColor.needsUpdate = true;
}
function burst(x, y, z, n, col, spd, life, size, grav, up) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, b = Math.random() * 2 - 1, r = Math.sqrt(1 - b * b), s = spd * (0.4 + Math.random() * 0.6);
    spawnP(x, y, z, Math.cos(a) * r * s, b * s + (up || 0), Math.sin(a) * r * s, Array.isArray(col) ? col[(Math.random() * col.length) | 0] : col, life * (0.6 + Math.random() * 0.6), size, grav);
  }
}
function updateParticles(dt) {
  let i = 0;
  while (i < P.n) {
    P.life[i] -= dt;
    if (P.life[i] <= 0) {
      const j = --P.n;
      for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 's', 'g']) P[k][i] = P[k][j];
      P.mesh.getColorAt(j, _pc); P.mesh.setColorAt(i, _pc); P.mesh.instanceColor.needsUpdate = true;
      continue;
    }
    P.vy[i] -= P.g[i] * dt; P.vx[i] *= 0.98; P.vz[i] *= 0.98;
    let nx = P.x[i] + P.vx[i] * dt, ny = P.y[i] + P.vy[i] * dt, nz2 = P.z[i] + P.vz[i] * dt;
    if (isSolid(getB(nx, ny, nz2))) { P.vx[i] *= -0.2; P.vy[i] = 0; P.vz[i] *= -0.2; nx = P.x[i]; ny = P.y[i]; nz2 = P.z[i]; }
    P.x[i] = nx; P.y[i] = ny; P.z[i] = nz2;
    const s = P.s[i] * Math.min(1, P.life[i] * 3);
    _pm.makeScale(s, s, s); _pm.setPosition(nx, ny, nz2); P.mesh.setMatrixAt(i, _pm);
    i++;
  }
  P.mesh.count = P.n; P.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- mob ----------
let mobs = [], arrows = [], tick = 0, player = null;
let hitboxesOn = false;
class Mob {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, pyaw: 0, ppitch: 0,
      onGround: false, hc: false, fallDistance: 0, inWater: false, inWeb: false, sprinting: false, sneaking: false, jumpTicks: 0,
      health: 20, absorption: 0, invul: 0, hurtTime: 0, lastHurt: 0, dead: false, deathT: 0,
      ticksSinceSwing: 100, swingT: 0, using: null, useT: 0, useCD: 0, regenTimer: 0, saturation: 5, regenFx: 0,
      hitStun: 0, combo: 0, maxCombo: 0, kills: 0, deaths: 0, dmgDealt: 0, dmgTaken: 0, hits: 0, crits: 0, swings: 0,
      limb: 0, limbAmp: 0, mineProg: 0, mineKey: null, mineDelay: 0, lastAttacker: null, lastAttackT: -9999,
      in: { f: 0, s: 0, jump: false }, mats: [], sel: 0, tagHp: -1, respawnAt: 0, lastHitReach: 0, deathMsg: ''
    });
    Object.assign(this, o);
    this.kitProto = JSON.parse(JSON.stringify({ inv: this.inv, arrows: this.arrows }));
    makeModel(this); drawTag(this); setHeldVisual(this);
  }
  get held() { return this.inv[this.sel]; }
  get eyeH() { return this.sneaking ? 1.54 : 1.62; }
  get kbRes() { return ARMOR[this.armor].kb; }
  box() { return [this.x - 0.3, this.y, this.z - 0.3, this.x + 0.3, this.y + 1.8, this.z + 0.3]; }
  look() { const y = this.yaw * DEG, p = this.pitch * DEG; return [-Math.sin(y) * Math.cos(p), -Math.sin(p), Math.cos(y) * Math.cos(p)]; }
  select(i) { if (i !== this.sel) { this.sel = i; if (this.using) { this.using = null; this.useT = 0; } this.mineProg = 0; this.mineKey = null; if (!COMBAT18) this.ticksSinceSwing = 0; setHeldVisual(this); } }
  slotOf(k) { return this.inv.findIndex(it => it && it.k === k && (it.n === undefined || it.n > 0)); }
}

// ---------- AABB collision (MC Entity.move) ----------
function offY(b, e, d) {
  if (e[3] > b[0] && e[0] < b[3] && e[5] > b[2] && e[2] < b[5]) {
    if (d > 0 && e[4] <= b[1]) { const t = b[1] - e[4]; if (t < d) d = t; }
    else if (d < 0 && e[1] >= b[4]) { const t = b[4] - e[1]; if (t > d) d = t; }
  }
  return d;
}
function offX(b, e, d) {
  if (e[4] > b[1] && e[1] < b[4] && e[5] > b[2] && e[2] < b[5]) {
    if (d > 0 && e[3] <= b[0]) { const t = b[0] - e[3]; if (t < d) d = t; }
    else if (d < 0 && e[0] >= b[3]) { const t = b[3] - e[0]; if (t > d) d = t; }
  }
  return d;
}
function offZ(b, e, d) {
  if (e[3] > b[0] && e[0] < b[3] && e[4] > b[1] && e[1] < b[4]) {
    if (d > 0 && e[5] <= b[2]) { const t = b[2] - e[5]; if (t < d) d = t; }
    else if (d < 0 && e[2] >= b[5]) { const t = b[5] - e[2]; if (t > d) d = t; }
  }
  return d;
}
function blockBoxes(x0, y0, z0, x1, y1, z1) {
  const out = [];
  for (let x = Math.floor(x0); x <= Math.floor(x1); x++) for (let y = Math.floor(y0) - 1; y <= Math.floor(y1); y++) for (let z = Math.floor(z0); z <= Math.floor(z1); z++)
    if (isSolid(getB(x, y, z))) out.push([x, y, z, x + 1, y + 1, z + 1]);
  return out;
}
function boxFree(b) { return blockBoxes(b[0] + 0.001, b[1] + 0.001, b[2] + 0.001, b[3] - 0.001, b[4] - 0.001, b[5] - 0.001).every(k => !(b[0] < k[3] && b[3] > k[0] && b[1] < k[4] && b[4] > k[1] && b[2] < k[5] && b[5] > k[2])); }
function hasGroundBelow(x, y, z, depth) { // any solid block under a 0.6 footprint within depth
  for (let d = 1; d <= depth; d++) for (const ox of [-0.29, 0.29]) for (const oz of [-0.29, 0.29]) if (isSolid(getB(x + ox, y - d + 0.5, z + oz))) return true;
  return false;
}
function move(e, dx, dy, dz) {
  if (e.inWeb) { dx *= 0.25; dy *= 0.05; dz *= 0.25; e.vx = 0; e.vy = 0; e.vz = 0; e.fallDistance = 0; }
  // sneaking stops you walking off edges
  if (e.onGround && e.sneaking) {
    const st = 0.05;
    const okAt = (ox, oz) => !boxFree([e.x - 0.3 + ox, e.y - 1, e.z - 0.3 + oz, e.x + 0.3 + ox, e.y + 0.8, e.z + 0.3 + oz]);
    while (dx !== 0 && !okAt(dx, 0)) { if (dx < st && dx >= -st) dx = 0; else if (dx > 0) dx -= st; else dx += st; }
    while (dz !== 0 && !okAt(0, dz)) { if (dz < st && dz >= -st) dz = 0; else if (dz > 0) dz -= st; else dz += st; }
    while (dx !== 0 && dz !== 0 && !okAt(dx, dz)) {
      if (dx < st && dx >= -st) dx = 0; else if (dx > 0) dx -= st; else dx += st;
      if (dz < st && dz >= -st) dz = 0; else if (dz > 0) dz -= st; else dz += st;
    }
  }
  const ox = dx, oy = dy, oz = dz;
  let b = e.box();
  const boxes = blockBoxes(Math.min(b[0], b[0] + dx), Math.min(b[1], b[1] + dy), Math.min(b[2], b[2] + dz), Math.max(b[3], b[3] + dx), Math.max(b[4], b[4] + dy), Math.max(b[5], b[5] + dz));
  for (const k of boxes) dy = offY(k, b, dy);
  b = [b[0], b[1] + dy, b[2], b[3], b[4] + dy, b[5]];
  for (const k of boxes) dx = offX(k, b, dx);
  b = [b[0] + dx, b[1], b[2], b[3] + dx, b[4], b[5]];
  for (const k of boxes) dz = offZ(k, b, dz);
  b = [b[0], b[1], b[2] + dz, b[3], b[4], b[5] + dz];
  e.x = (b[0] + b[3]) / 2; e.y = b[1]; e.z = (b[2] + b[5]) / 2;
  e.hc = ox !== dx || oz !== dz;
  const wasGround = e.onGround;
  e.onGround = oy !== dy && oy < 0;
  if (ox !== dx) e.vx = 0;
  if (oy !== dy) e.vy = 0;
  if (oz !== dz) e.vz = 0;
  // fall state
  if (e.onGround) {
    if (e.fallDistance > 3 && !e.inWater) {
      const dmg = Math.ceil(e.fallDistance - 3);
      hurt(e, dmg, { kind: 'fall', bypass: true });
      sfx('hurt', e.x, e.y, e.z, 0.6);
    }
    if (!wasGround && e.fallDistance > 1.2) { const bid = getB(e.x, e.y - 0.5, e.z); if (bid && bid !== 255) burst(e.x, e.y + 0.05, e.z, 6 + Math.min(14, e.fallDistance * 2) | 0, BL[bid].color, 2, 0.5, 0.08, 9); }
    e.fallDistance = 0;
  } else if (dy < 0) e.fallDistance -= dy;
}
function updateFluidFlags(e) {
  const b = e.box(); let water = false, web = false;
  for (let x = Math.floor(b[0] + 0.001); x <= Math.floor(b[3] - 0.001); x++) for (let y = Math.floor(b[1] + 0.001); y <= Math.floor(b[4] - 0.001); y++) for (let z = Math.floor(b[2] + 0.001); z <= Math.floor(b[5] - 0.001); z++) {
    const id = getB(x, y, z); if (id === B.WATER && y + 0.875 > b[1] + 0.4) water = true; if (id === B.WEB) web = true;
  }
  if (water && !e.inWater && e.fallDistance > 2) sfx('splash', e.x, e.y, e.z);
  e.inWater = water; e.inWeb = web;
  if (water) e.fallDistance = 0;
}
function moveRelative(e, strafe, forward, factor) {
  let d = strafe * strafe + forward * forward;
  if (d >= 1e-4) {
    d = Math.sqrt(d); if (d < 1) d = 1; d = factor / d;
    strafe *= d; forward *= d;
    const s = Math.sin(e.yaw * DEG), c = Math.cos(e.yaw * DEG);
    e.vx += strafe * c - forward * s;
    e.vz += forward * c + strafe * s;
  }
}
function slipBelow(e) { const id = getB(e.x, e.y - 0.5, e.z); return id && id !== 255 && BL[id].solid ? BL[id].friction : 0.6; }
function travel(e, strafe, forward) {
  if (e.inWater) {
    const y0 = e.y;
    moveRelative(e, strafe, forward, 0.02);
    move(e, e.vx, e.vy, e.vz);
    e.vx *= 0.8; e.vy *= 0.8; e.vz *= 0.8; e.vy -= 0.02;
    if (e.hc) { const b = e.box(); const t = [b[0] + e.vx, b[1] + 0.6 - e.y + y0 + e.vy, b[2] + e.vz, b[3] + e.vx, b[4] + 0.6 - e.y + y0 + e.vy, b[5] + e.vz]; if (boxFree(t)) e.vy = 0.3; }
    return;
  }
  let f = e.onGround ? slipBelow(e) * 0.91 : 0.91;
  const speed = 0.1 * (e.sprinting ? 1.3 : 1);
  const acc = e.onGround ? speed * 0.16277136 / (f * f * f) : (e.sprinting ? 0.026 : 0.02);
  moveRelative(e, strafe, forward, acc);
  f = e.onGround ? slipBelow(e) * 0.91 : 0.91;
  move(e, e.vx, e.vy, e.vz);
  e.vy -= 0.08; e.vy *= 0.98; e.vx *= f; e.vz *= f;
}
function doJump(e) {
  e.vy = 0.42;
  if (e.sprinting) { const r = e.yaw * DEG; e.vx -= Math.sin(r) * 0.2; e.vz += Math.cos(r) * 0.2; }
  e.jumpTicks = 10;
}

// ---------- damage pipeline ----------
function afterArmor(dmg, pts, tough) {
  if (pts <= 0) return dmg;
  // armour is "shredded" by big hits unless toughness resists it
  let eff = pts - dmg / (4 + tough / 4);
  eff = clamp(eff, pts / 5, 25);
  return dmg * (1 - eff / 25);
}
function afterProt(dmg, lvl) { lvl = Math.min(20, lvl); return dmg * (1 - lvl * 0.04); }
function hurt(t, amount, src) {
  if (t.dead || !game || game.over) return false;
  if (src.att && src.att.team === t.team && src.att !== t) return false;
  if (game.countdown > 0 && src.kind !== 'void') return false;
  if (src.kind !== 'void' && t.invul > 10) {
    if (amount <= t.lastHurt) return false;
    dealDamage(t, amount - t.lastHurt, src);
    t.lastHurt = amount;
    return 'partial';
  }
  t.lastHurt = amount; t.invul = 20; t.hurtTime = 10;
  dealDamage(t, amount, src);
  return true;
}
function dealDamage(t, amt, src) {
  if (t.using === 'block' && (src.kind === 'melee' || src.kind === 'arrow')) amt = (1 + amt) * 0.5;
  if (src.kind !== 'void') {
    const A = ARMOR[t.armor];
    if (!src.bypass) amt = afterArmor(amt, A.pts, A.tough);
    if (A.pts > 0) amt = afterProt(amt, t.prot * 4);
  }
  if (t.absorption > 0) { const a = Math.min(t.absorption, amt); t.absorption -= a; amt -= a; }
  t.health -= amt; t.dmgTaken += amt;
  if (src.att) { t.lastAttacker = src.att; t.lastAttackT = tick; src.att.dmgDealt += amt; }
  if (t === player) { camShake = 1; sfx('hurt'); }
  if (t.health <= 0.0001) { t.health = 0; die(t, src); }
}
function die(t, src) {
  t.dead = true; t.deathT = 0; t.deaths++; t.using = null; t.combo = 0;
  let killer = src.att || (tick - t.lastAttackT < 200 ? t.lastAttacker : null);
  if (killer === t) killer = null;
  let msg;
  if (src.kind === 'void') msg = killer ? `${t.name} was knocked into the void by ${killer.name}` : `${t.name} fell out of the world`;
  else if (src.kind === 'fall') msg = killer ? `${t.name} was doomed to fall by ${killer.name}` : `${t.name} hit the ground too hard`;
  else if (src.kind === 'arrow') msg = `${t.name} was shot by ${killer ? killer.name : 'an arrow'}`;
  else msg = `${t.name} was slain by ${killer ? killer.name : '???'}`;
  if (killer) { killer.kills++; if (killer === player) sfx('kill'); }
  t.deathMsg = msg;
  feed(msg, t === player ? '#ff6060' : killer === player ? '#70ff70' : '#fff');
  sfx('death', t.x, t.y, t.z);
  burst(t.x, t.y + 1, t.z, 30, ['#ffffff', '#dddddd', '#bbbbbb'], 2.2, 0.9, 0.12, 1, 0.6);
  if (game.win === 'kills') t.respawnAt = tick + 60;
  onDeath(t, killer);
}
function knockback(t, strength, xr, zr) {
  strength *= 1 - t.kbRes;
  if (strength <= 0) return;
  let d = Math.sqrt(xr * xr + zr * zr);
  if (d < 1e-4) { const a = Math.random() * 6.283; xr = Math.cos(a) * 0.01; zr = Math.sin(a) * 0.01; d = 0.01; }
  t.vx /= 2; t.vz /= 2;
  t.vx -= xr / d * strength; t.vz -= zr / d * strength;
  t.vy /= 2; t.vy += strength;
  if (t.vy > 0.4000000059604645) t.vy = 0.4000000059604645;
  t.onGround = false;
}
function weaponStats(e) {
  const h = e.held;
  if (!h || (h.k !== 'sword' && h.k !== 'axe' && h.k !== 'pick')) return { dmg: 1, speed: 4, sharp: 0 };
  const T2 = TIERS[h.tier];
  if (h.k === 'sword') return { dmg: COMBAT18 ? T2.sw + 1 : T2.sw, speed: 1.6, sharp: h.sharp || 0 };
  if (h.k === 'axe') return { dmg: COMBAT18 ? T2.sw : T2.ax, speed: T2.axs, sharp: h.sharp || 0 };
  return { dmg: COMBAT18 ? T2.sw - 1 : T2.sw - 2, speed: 1.2, sharp: 0 };
}
function cooldown(e) { // getAttackCooldownProgressPerTick
  if (COMBAT18) return 1;
  const total = 20 / weaponStats(e).speed;
  return clamp((e.ticksSinceSwing + 0.5) / total, 0, 1);
}
function isCrit(a, strong) {
  return (COMBAT18 || strong) && a.fallDistance > 0 && !a.onGround && !a.inWater && !a.inWeb && !(a.sprinting && !COMBAT18);
}
function swing(e) { e.swingT = 6; }
function attack(a, t, reach) {
  const ws = weaponStats(a), cd = cooldown(a);
  let dmg = ws.dmg * (0.2 + cd * cd * 0.8);
  let ench = ws.sharp ? (COMBAT18 ? 1.25 * ws.sharp : 1 + 0.5 * (ws.sharp - 1)) : 0;
  ench *= cd;
  const strong = cd > 0.9;
  let kb = 0;
  if (a.sprinting && (COMBAT18 || strong)) kb = 1;
  const crit = isCrit(a, strong);
  if (crit) dmg *= 1.5;
  dmg += ench;
  a.ticksSinceSwing = 0;
  const r = hurt(t, dmg, { att: a, kind: 'melee' });
  if (!r) { if (a === player || t === player) sfx('weak', t.x, t.y, t.z, 0.5); return false; }
  if (r === true) knockback(t, 0.4, a.x - t.x, a.z - t.z);
  if (kb > 0) {
    const s = 1 - t.kbRes;
    t.vx += -Math.sin(a.yaw * DEG) * kb * 0.5 * s; t.vz += Math.cos(a.yaw * DEG) * kb * 0.5 * s; t.vy += 0.1 * s;
    a.vx *= 0.6; a.vz *= 0.6; a.sprinting = false; a.dtap = false;
  }
  t.hitStun = 3;
  a.hits++; a.mhits = (a.mhits || 0) + 1; a.combo++; a.maxCombo = Math.max(a.maxCombo, a.combo); t.combo = 0;
  a.lastHitReach = reach || 0;
  if (crit) { a.crits++; burst(t.x, t.y + 1.1, t.z, 16, ['#ffffff', '#e8e0c8', '#c8b890'], 3.2, 0.5, 0.07, 3); }
  if (ench > 0) burst(t.x, t.y + 1.1, t.z, 10, ['#9be0ff', '#6aa8ff', '#c0a0ff'], 2.5, 0.5, 0.06, 2);
  sfx(crit ? 'crit' : (strong || COMBAT18) ? 'hit' : 'weak', t.x, t.y, t.z);
  if (a === player) { hitMarker = 6; showTarget(t); }
  if (t === player) { lastHitBy = a; }
  return true;
}

// ---------- ray casts ----------
function rayBlocks(ox, oy, oz, dx, dy, dz, maxD) { // DDA voxel traversal
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / dx), tdy = Math.abs(1 / dy), tdz = Math.abs(1 / dz);
  let tx = dx === 0 ? 1e9 : (dx > 0 ? x + 1 - ox : ox - x) * tdx;
  let ty = dy === 0 ? 1e9 : (dy > 0 ? y + 1 - oy : oy - y) * tdy;
  let tz = dz === 0 ? 1e9 : (dz > 0 ? z + 1 - oz : oz - z) * tdz;
  let t = 0, face = [0, 0, 0];
  for (let i = 0; i < 200; i++) {
    const id = getB(x, y, z);
    if (id && id !== B.WATER) return { x, y, z, id, face, dist: t };
    if (tx < ty && tx < tz) { t = tx; x += sx; tx += tdx; face = [-sx, 0, 0]; }
    else if (ty < tz) { t = ty; y += sy; ty += tdy; face = [0, -sy, 0]; }
    else { t = tz; z += sz; tz += tdz; face = [0, 0, -sz]; }
    if (t > maxD) return null;
  }
  return null;
}
function rayBox(ox, oy, oz, dx, dy, dz, b) { // slab method; returns entry distance or -1
  let tmin = 0, tmax = 1e9;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < b[a] || o[a] > b[a + 3]) return -1; continue; }
    let t1 = (b[a] - o[a]) / d[a], t2 = (b[a + 3] - o[a]) / d[a];
    if (t1 > t2) { const k = t1; t1 = t2; t2 = k; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  return tmin;
}
function pickEntity(e, reach, dir) {
  const d = dir || e.look(), ey = e.y + e.eyeH;
  let best = null, bd = reach;
  for (const m of mobs) {
    if (m === e || m.dead || m.team === e.team) continue;
    const b = m.box(); b[0] -= 0.1; b[1] -= 0.1; b[2] -= 0.1; b[3] += 0.1; b[4] += 0.1; b[5] += 0.1;
    const t = rayBox(e.x, ey, e.z, d[0], d[1], d[2], b);
    if (t >= 0 && t <= bd) { bd = t; best = m; }
  }
  if (best) { const bh = rayBlocks(e.x, ey, e.z, d[0], d[1], d[2], bd); if (bh && isSolid(bh.id) && bh.dist < bd) return null; }
  return best ? { m: best, dist: bd } : null;
}

// ---------- mining & placing ----------
function toolSpeed(e, b) {
  const h = e.held;
  if (b.id === B.WEB && h && h.k === 'sword') return 15;
  if (!h) return 1;
  if (h.k === 'sword') return 1.5;
  if ((h.k === 'pick' && b.tool === 'pick') || (h.k === 'axe' && b.tool === 'axe')) return TIERS[h.tier].mine;
  return 1;
}
function canHarvest(e, b) { if (!b.needTool) return true; const h = e.held; if (!h) return false; if (b.tool === 'pick') return h.k === 'pick' && (b.id !== B.OBSIDIAN || h.tier === 'diamond' || h.tier === 'netherite'); if (b.tool === 'sword') return h.k === 'sword'; return true; }
function tickMining(e, hit) {
  const b = BL[hit.id];
  if (b.hard < 0) return;
  const key = hit.x + ',' + hit.y + ',' + hit.z;
  if (e.mineKey !== key) { e.mineKey = key; e.mineProg = 0; }
  if (e.mineDelay > 0) { e.mineDelay--; return; }
  let speed = toolSpeed(e, b);
  if (e.inWater) speed /= 5;
  if (!e.onGround) speed /= 5;
  const dmg = b.hard === 0 ? 1 : speed / b.hard / (canHarvest(e, b) ? 30 : 100);
  e.mineProg += dmg;
  if (tick % 4 === 0) { sfx('dig', hit.x + 0.5, hit.y + 0.5, hit.z + 0.5); swing(e); }
  if (e.mineProg >= 1) {
    setB(hit.x, hit.y, hit.z, 0);
    sfx('brk', hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    burst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 22, b.color, 2.5, 0.7, 0.09, 12);
    if (canHarvest(e, b) && b.drop) giveBlock(e, b.drop);
    e.mineProg = 0; e.mineKey = null; e.mineDelay = 5;
  }
}
function giveBlock(e, id) {
  let s = e.inv.find(it => it && it.k === 'block' && it.id === id && it.n < 64);
  if (s) { s.n++; return; }
  const i = e.inv.findIndex(it => !it || (it.k === 'block' && it.n <= 0) || (it.k === 'gapple' && it.n <= 0));
  if (i >= 0) { e.inv[i] = { k: 'block', id, n: 1 }; if (i === e.sel) setHeldVisual(e); }
}
function tryPlace(e) {
  const it = e.held; if (!it || it.k !== 'block' || it.n <= 0) return false;
  const d = e.look(); const hit = rayBlocks(e.x, e.y + e.eyeH, e.z, d[0], d[1], d[2], 4.5);
  if (!hit) return false;
  const x = hit.x + hit.face[0], y = hit.y + hit.face[1], z = hit.z + hit.face[2];
  const cur = getB(x, y, z);
  if (cur === 255 || (cur && cur !== B.WATER)) return false;
  if (y < 0 || y >= WY) return false;
  if (BL[it.id].solid) for (const m of mobs) { if (m.dead) continue; const b = m.box(); if (b[0] < x + 1 && b[3] > x && b[1] < y + 1 && b[4] > y && b[2] < z + 1 && b[5] > z) return false; }
  setB(x, y, z, it.id);
  it.n--; swing(e);
  sfx('place', x + 0.5, y + 0.5, z + 0.5);
  return true;
}

// ---------- bow & arrows ----------
function arrowVelocityScale(ticks) { let p = ticks / 20; p = (p * p + p * 2) / 3; return p > 1 ? 1 : p; }
const arrowGeo = new THREE.BoxGeometry(0.05, 0.05, 0.6), arrowMat = new THREE.MeshLambertMaterial({ color: 0x8a6a40 });
const arrowCritMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
function releaseBow(e) {
  const scale = arrowVelocityScale(e.useT);
  e.using = null; e.useT = 0; setHeldVisual(e);
  if (scale < 0.1 || e.arrows <= 0) return;
  e.arrows--;
  const d = e.look(), v = scale * 3;
  const inacc = e.isPlayer ? 1 : 1 + (1 - e.skill) * 5;
  const ax = d[0] + gauss() * 0.0075 * inacc, ay = d[1] + gauss() * 0.0075 * inacc, az = d[2] + gauss() * 0.0075 * inacc;
  const n = Math.hypot(ax, ay, az);
  const bow = e.held;
  const a = { x: e.x, y: e.y + e.eyeH - 0.1, z: e.z, vx: ax / n * v, vy: ay / n * v, vz: az / n * v, shooter: e, crit: scale >= 1,
    base: 2 + (bow && bow.power ? bow.power * 0.5 + 0.5 : 0), inGround: false, life: 200, age: 0 };
  a.mesh = new THREE.Mesh(arrowGeo, a.crit ? arrowCritMat : arrowMat); scene.add(a.mesh);
  a.px = a.x; a.py = a.y; a.pz = a.z;
  arrows.push(a);
  sfx('bow', e.x, e.y, e.z);
}
function tickArrow(a) {
  a.px = a.x; a.py = a.y; a.pz = a.z; a.age++;
  if (a.inGround) { if (--a.life <= 0 || !isSolid(getB(a.hx, a.hy, a.hz))) a.dead = true; return; }
  const sp = Math.hypot(a.vx, a.vy, a.vz), dx = a.vx / sp, dy = a.vy / sp, dz = a.vz / sp;
  const bh = rayBlocks(a.x, a.y, a.z, dx, dy, dz, sp);
  let tHit = bh && bh.id !== B.WEB ? bh.dist : sp, ent = null;
  for (const m of mobs) {
    if (m.dead || (m === a.shooter && a.age < 5)) continue;
    const b = m.box(); b[0] -= 0.3; b[2] -= 0.3; b[3] += 0.3; b[5] += 0.3; b[4] += 0.3;
    const t = rayBox(a.x, a.y, a.z, dx, dy, dz, b);
    if (t >= 0 && t <= tHit) { tHit = t; ent = m; }
  }
  if (ent) {
    let dmg = Math.ceil(sp * a.base);
    if (a.crit) dmg += Math.floor(Math.random() * (dmg / 2 + 2));
    const r = hurt(ent, dmg, { att: a.shooter, kind: 'arrow' });
    if (r) {
      if (r === true) knockback(ent, 0.4, -dx, -dz);
      const bow = a.shooter.held, punch = bow && bow.punch || 0;
      if (punch > 0) { const hd = Math.hypot(a.vx, a.vz); if (hd > 0) { ent.vx += a.vx * punch * 0.6 / hd; ent.vy += 0.1; ent.vz += a.vz * punch * 0.6 / hd; } }
      a.shooter.hits++;
      sfx('arrowHit', ent.x, ent.y, ent.z);
      if (a.shooter === player) { sfx('ding'); hitMarker = 6; showTarget(ent); }
      if (a.crit) burst(ent.x, ent.y + 1, ent.z, 10, '#ffffff', 2.5, 0.4, 0.06, 3);
      a.dead = true;
    } else { a.vx *= -0.1; a.vy *= -0.1; a.vz *= -0.1; a.x += a.vx; a.y += a.vy; a.z += a.vz; }
    return;
  }
  if (bh && bh.id !== B.WEB && bh.dist <= sp) {
    a.x += dx * (bh.dist - 0.05); a.y += dy * (bh.dist - 0.05); a.z += dz * (bh.dist - 0.05);
    a.inGround = true; a.hx = bh.x; a.hy = bh.y; a.hz = bh.z; a.life = 200;
    sfx('arrowHit', a.x, a.y, a.z, 0.6);
    return;
  }
  a.x += a.vx; a.y += a.vy; a.z += a.vz;
  const inW = getB(a.x, a.y, a.z) === B.WATER, inWeb = getB(a.x, a.y, a.z) === B.WEB;
  const drag = inWeb ? 0.05 : inW ? 0.6 : 0.99;
  a.vx *= drag; a.vy *= drag; a.vz *= drag;
  a.vy -= 0.05;
  if (a.crit && a.age % 2 === 0) spawnP(a.x, a.y, a.z, 0, 0.2, 0, '#ffffff', 0.4, 0.05, 0);
  if (a.y < VOID_Y || a.age > 400) a.dead = true;
}

// ---------- golden apple / regen ----------
function eatGapple(e) {
  const it = e.held; if (!it || it.k !== 'gapple' || it.n <= 0) return;
  it.n--; e.absorption = 4; e.regenFx = 100; e.using = null; e.useT = 0;
  sfx('burp', e.x, e.y, e.z); drawTag(e);
}
function tickHealth(e) {
  if (e.dead) return;
  if (e.regenFx > 0) { e.regenFx--; if (e.regenFx % 25 === 0) e.health = Math.min(20, e.health + 1); }
  if (!CFG.regen) return;
  e.regenTimer++;
  if (e.saturation > 0) {
    if (e.regenTimer >= 10 && e.health < 20) { e.health = Math.min(20, e.health + 1); e.saturation = Math.max(0, e.saturation - 1); e.regenTimer = 0; }
  } else if (e.regenTimer >= 80) { if (e.health < 20) e.health = Math.min(20, e.health + 1); e.regenTimer = 0; }
}

// ---------- per-tick entity physics ----------
function physicsTick(e) {
  if (e.invul > 0) e.invul--; if (e.hurtTime > 0) e.hurtTime--; if (e.swingT > 0) e.swingT--;
  if (e.jumpTicks > 0) e.jumpTicks--; if (e.hitStun > 0) e.hitStun--; if (e.useCD > 0) e.useCD--;
  e.ticksSinceSwing++;
  updateFluidFlags(e);
  let { f, s, jump } = e.in;
  if (game.countdown > 0) { f = 0; s = 0; jump = false; }
  if (e.hitStun > 0) { f *= 0.0; s *= 0.0; }
  if (e.sneaking) { f *= 0.3; s *= 0.3; }
  if (e.using) { f *= 0.2; s *= 0.2; }
  f *= 0.98; s *= 0.98;
  // sprint rules
  if (e.in.f < 0.8 || e.sneaking || e.using || e.hc || e.inWater) e.sprinting = false;
  if (jump) {
    if (e.inWater) e.vy += 0.04;
    else if (e.onGround && e.jumpTicks === 0) doJump(e);
  } else e.jumpTicks = 0;
  const ovx = e.vx, ovz = e.vz;
  travel(e, s, f);
  // sprint dust & sudden direction change bursts
  if (e.onGround && !e.inWater) {
    const sp = Math.hypot(e.vx, e.vz);
    const bid = getB(e.x, e.y - 0.5, e.z);
    if (bid && bid !== 255 && BL[bid]) {
      if (e.sprinting && sp > 0.1 && Math.random() < 0.7) spawnP(e.x + (Math.random() - 0.5) * 0.5, e.y + 0.1, e.z + (Math.random() - 0.5) * 0.5, -e.vx * 3, 1.2, -e.vz * 3, BL[bid].color, 0.4, 0.07, 8);
      const osp = Math.hypot(ovx, ovz);
      if (osp > 0.12 && sp > 0.05 && (ovx * e.vx + ovz * e.vz) / (osp * sp) < 0.3) burst(e.x, e.y + 0.1, e.z, 6, BL[bid].color, 2, 0.4, 0.07, 8, 1);
      e.stepAcc = (e.stepAcc || 0) + sp;
      if (e.stepAcc > 1.6) { e.stepAcc = 0; sfx('step', e.x, e.y, e.z, e === player ? 0.6 : 1); }
    }
  }
  if (e.y < VOID_Y) hurt(e, 1000, { kind: 'void', bypass: true });
  tickHealth(e);
  // limb animation
  const moved = Math.hypot(e.x - e.px, e.z - e.pz);
  e.limbAmp = lerp(e.limbAmp, Math.min(1, moved * 4), 0.4);
  e.limb += moved * 2.6;
}
