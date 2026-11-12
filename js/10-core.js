'use strict';
// ================= CORE: utils, config, audio, textures, blocks, world =================
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const wrapDeg = a => { a = (a + 180) % 360; if (a < 0) a += 360; return a - 180; };
let _seed = 1;
function srand(s) { _seed = Math.abs(s | 0) % 2147483647; if (_seed <= 0) _seed += 2147483646; }
function rnd() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }
const R = Math.random;
function gauss() { return (R() + R() + R() + R() - 2) * 0.866; }

// ---------- config ----------
const DEF = {
  mode: 'duel', win: 'last', killTarget: 5, map: 'arena', bots: 3, skill: 60, aggro: 70, combat: '19',
  armor: 'iron', prot: 2, wtype: 'sword', tier: 'diamond', sharp: 1,
  bow: true, arrows: 16, power: 1, gapples: 3, blocks: 64, webs: 0, pick: true,
  botArmor: 'same', botWeapon: 'same', botItems: true,
  regen: true, autoSprint: true, sens: 100, fov: 80, hitboxes: false, vol: 70
};
let CFG = Object.assign({}, DEF);
try { Object.assign(CFG, JSON.parse(localStorage.getItem('blockbrawl_cfg') || '{}')); } catch (e) {}
function saveCfg() { try { localStorage.setItem('blockbrawl_cfg', JSON.stringify(CFG)); } catch (e) {} }
let COMBAT18 = CFG.combat === '18';

// ---------- audio (all synthesized) ----------
let AC = null, noiseBuf = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function beep(f, d, type, v, slide, delay) {
  const a = ac(); if (!a) return;
  v *= CFG.vol / 100; if (v < 0.003) return;
  const t = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, v, freq, q, delay, type) {
  const a = ac(); if (!a) return;
  v *= CFG.vol / 100; if (v < 0.003) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + (delay || 0);
  const s = a.createBufferSource(); s.buffer = noiseBuf;
  const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = q || 1;
  const g = a.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.03);
}
const SND = {
  hit: v => { noise(0.12, 0.55 * v, 900, 1); beep(130, 0.09, 'triangle', 0.25 * v, -60); },
  crit: v => { noise(0.16, 0.45 * v, 3200, 2); noise(0.1, 0.4 * v, 900, 1); beep(150, 0.1, 'triangle', 0.22 * v, -80); },
  weak: v => { noise(0.07, 0.25 * v, 1500, 1); },
  swing: v => { noise(0.08, 0.1 * v, 2600, 0.7, 0, 'highpass'); },
  hurt: v => { beep(240, 0.16, 'sawtooth', 0.16 * v, -130); noise(0.1, 0.3 * v, 700); },
  bow: v => { noise(0.22, 0.3 * v, 1600, 1.5); beep(520, 0.12, 'triangle', 0.1 * v, -320); },
  arrowHit: v => { noise(0.06, 0.35 * v, 2200, 2); },
  ding: v => { beep(1320, 0.18, 'sine', 0.22 * v); beep(1760, 0.12, 'sine', 0.1 * v, 0, 0.03); },
  brk: v => { noise(0.2, 0.45 * v, 650, 0.8); },
  place: v => { noise(0.1, 0.4 * v, 520, 1); },
  dig: v => { noise(0.06, 0.18 * v, 800, 1); },
  eat: v => { noise(0.07, 0.3 * v, 1300, 2); },
  burp: v => { beep(170, 0.3, 'sawtooth', 0.18 * v, -70); },
  death: v => { beep(320, 0.45, 'sawtooth', 0.2 * v, -230); },
  kill: v => { beep(880, 0.08, 'square', 0.1 * v); beep(1320, 0.14, 'square', 0.1 * v, 0, 0.08); },
  splash: v => { noise(0.35, 0.3 * v, 900, 0.6); },
  step: v => { noise(0.05, 0.07 * v, 700, 1); },
  click: v => { beep(700, 0.04, 'square', 0.08 * v); },
  win: v => { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.25, 'square', 0.1 * v, 0, i * 0.12)); },
  lose: v => { [392, 330, 262].forEach((f, i) => beep(f, 0.35, 'triangle', 0.15 * v, 0, i * 0.18)); },
  tick: v => { beep(1000, 0.06, 'square', 0.1 * v); },
  go: v => { beep(1500, 0.3, 'square', 0.12 * v); }
};
let listener = null; // set to player / camera position object
function sfx(name, x, y, z, vm) {
  let v = vm == null ? 1 : vm;
  if (x !== undefined && listener) {
    const d = Math.hypot(x - listener.x, y - listener.y, z - listener.z);
    v *= clamp(1 - d / 26, 0, 1); if (v < 0.02) return;
  }
  SND[name] && SND[name](v);
}

// ---------- textures ----------
const T = { GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, COBBLE: 4, PLANKS: 5, LOG: 6, LOG_TOP: 7, LEAVES: 8, BEDROCK: 9,
  WOOL_R: 10, WOOL_B: 11, GLASS: 12, ICE: 13, BLUE_ICE: 14, WEB: 15, WATER: 16, SAND: 17, BRICK: 18, OBSIDIAN: 19, WOOL_W: 20 };
const ATL_C = 8, ATL_R = 4;
const atlas = document.createElement('canvas'); atlas.width = 16 * ATL_C; atlas.height = 16 * ATL_R;
const actx = atlas.getContext('2d');
const tileCv = [];
function makeTile(i, fn) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'); const img = g.createImageData(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const p = fn(x, y); const k = (y * 16 + x) * 4;
    img.data[k] = clamp(p[0], 0, 255); img.data[k + 1] = clamp(p[1], 0, 255); img.data[k + 2] = clamp(p[2], 0, 255); img.data[k + 3] = p[3] == null ? 255 : p[3];
  }
  g.putImageData(img, 0, 0); actx.drawImage(c, (i % ATL_C) * 16, Math.floor(i / ATL_C) * 16); tileCv[i] = c;
}
function nz(b, v) { const k = (rnd() - 0.5) * v; return [b[0] + k, b[1] + k, b[2] + k, 255]; }
function genTextures() {
  srand(1234);
  const dirt = [134, 96, 67], grass = [98, 160, 56], stone = [128, 128, 128];
  makeTile(T.DIRT, () => rnd() < 0.08 ? nz([100, 70, 48], 20) : nz(dirt, 36));
  makeTile(T.GRASS_TOP, () => nz(grass, 46));
  const edge = []; for (let x = 0; x < 16; x++) edge[x] = 3 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.25 ? 1 : 0);
  makeTile(T.GRASS_SIDE, (x, y) => y < edge[x] ? nz(grass, 40) : (rnd() < 0.08 ? nz([100, 70, 48], 20) : nz(dirt, 36)));
  makeTile(T.STONE, () => rnd() < 0.1 ? nz([105, 105, 105], 16) : nz(stone, 28));
  const pts = []; for (let i = 0; i < 9; i++) pts.push([rnd() * 16, rnd() * 16, 100 + rnd() * 50]);
  makeTile(T.COBBLE, (x, y) => {
    let d1 = 1e9, d2 = 1e9, c = 0;
    for (const p of pts) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
      const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
      if (d < d1) { d2 = d1; d1 = d; c = p[2]; } else if (d < d2) d2 = d;
    }
    return d2 - d1 < 1.3 ? nz([62, 62, 62], 14) : nz([c, c, c], 24);
  });
  makeTile(T.PLANKS, (x, y) => {
    if (y % 4 === 3) return nz([112, 86, 50], 10);
    if (x === ((y >> 2) * 7 + 3) % 16) return nz([120, 92, 55], 10);
    return nz([164, 132, 80], 18);
  });
  makeTile(T.LOG, x => nz((x * 7) % 5 < 2 ? [84, 64, 38] : [108, 84, 50], 18));
  makeTile(T.LOG_TOP, (x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) return nz([96, 74, 44], 16);
    return nz(Math.floor(d) % 2 ? [176, 142, 88] : [150, 118, 70], 12);
  });
  makeTile(T.LEAVES, () => rnd() < 0.2 ? [0, 0, 0, 0] : nz([58, 132, 38], 60));
  makeTile(T.BEDROCK, () => { const c = [[30, 30, 30], [80, 80, 80], [130, 130, 130], [55, 55, 55]][(rnd() * 4) | 0]; return nz(c, 14); });
  makeTile(T.WOOL_R, (x, y) => nz([170, 40, 36], (x + y) % 3 ? 14 : 30));
  makeTile(T.WOOL_B, (x, y) => nz([46, 60, 160], (x + y) % 3 ? 14 : 30));
  makeTile(T.WOOL_W, (x, y) => nz([228, 228, 228], (x + y) % 3 ? 10 : 24));
  makeTile(T.GLASS, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [215, 238, 250, 255];
    if ((x - y === 4 || x - y === 5) && x > 5 && x < 11) return [255, 255, 255, 220];
    return [0, 0, 0, 0];
  });
  makeTile(T.ICE, () => nz([150, 190, 252], 20));
  makeTile(T.BLUE_ICE, (x, y) => ((x * 3 + y * 5) % 11 === 0) ? nz([170, 200, 255], 10) : nz([102, 150, 240], 22));
  makeTile(T.WEB, (x, y) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (x === y || x === 15 - y || x === 8 || y === 8 || Math.abs(r - 5) < 0.5 || Math.abs(r - 2.5) < 0.45) return [235, 235, 235, 235];
    return [0, 0, 0, 0];
  });
  makeTile(T.WATER, () => { const p = nz([52, 92, 222], 22); p[3] = 255; return p; });
  makeTile(T.SAND, () => nz([219, 207, 158], 22));
  makeTile(T.BRICK, (x, y) => {
    if (y % 8 === 7 || x === (y < 8 ? 0 : 8)) return nz([78, 78, 78], 10);
    return nz([122, 122, 122], 22);
  });
  makeTile(T.OBSIDIAN, () => rnd() < 0.08 ? nz([70, 40, 110], 20) : nz([22, 16, 34], 16));
}
genTextures();

// crack overlays (10 stages)
const crackTex = [];
(function () {
  srand(77);
  const lines = []; for (let i = 0; i < 40; i++) { const x = rnd() * 16, y = rnd() * 16, a = rnd() * 6.28; lines.push([x, y, a, 2 + rnd() * 5]); }
  for (let s = 0; s < 10; s++) {
    const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.75)';
    for (let i = 0; i < 4 + s * 4; i++) {
      const L = lines[i]; let x = L[0], y = L[1];
      for (let k = 0; k < L[3]; k++) { g.fillRect(x | 0, y | 0, 1, 1); x += Math.cos(L[2] + k * 0.4); y += Math.sin(L[2] + k * 0.4); }
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    crackTex.push(t);
  }
})();

// ---------- blocks ----------
const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, PLANKS: 5, LOG: 6, LEAVES: 7, BEDROCK: 8, WOOL_R: 9, WOOL_B: 10,
  GLASS: 11, ICE: 12, BLUE_ICE: 13, WEB: 14, WATER: 15, SAND: 16, BRICK: 17, OBSIDIAN: 18, WOOL_W: 19, BARRIER: 255 };
const BL = [];
function defB(id, name, tiles, hard, tool, o) {
  BL[id] = Object.assign({ id, name, tiles, hard, tool, solid: true, opaque: true, friction: 0.6, cross: false, liquid: false, needTool: false, drop: id, color: '#888' }, o || {});
}
defB(0, 'Air', null, 0, null, { solid: false, opaque: false, drop: 0 });
defB(1, 'Grass Block', [T.GRASS_TOP, T.GRASS_SIDE, T.DIRT], 0.6, 'shovel', { drop: 2, color: '#62a038' });
defB(2, 'Dirt', [T.DIRT, T.DIRT, T.DIRT], 0.5, 'shovel', { color: '#866043' });
defB(3, 'Stone', [T.STONE, T.STONE, T.STONE], 1.5, 'pick', { needTool: true, drop: 4, color: '#808080' });
defB(4, 'Cobblestone', [T.COBBLE, T.COBBLE, T.COBBLE], 2, 'pick', { needTool: true, color: '#7a7a7a' });
defB(5, 'Oak Planks', [T.PLANKS, T.PLANKS, T.PLANKS], 2, 'axe', { color: '#a4844f' });
defB(6, 'Oak Log', [T.LOG_TOP, T.LOG, T.LOG_TOP], 2, 'axe', { color: '#6c5432' });
defB(7, 'Leaves', [T.LEAVES, T.LEAVES, T.LEAVES], 0.2, 'hoe', { opaque: false, drop: 0, color: '#3a8426' });
defB(8, 'Bedrock', [T.BEDROCK, T.BEDROCK, T.BEDROCK], -1, null, { color: '#444' });
defB(9, 'Red Wool', [T.WOOL_R, T.WOOL_R, T.WOOL_R], 0.8, 'shears', { color: '#aa2824' });
defB(10, 'Blue Wool', [T.WOOL_B, T.WOOL_B, T.WOOL_B], 0.8, 'shears', { color: '#2e3ca0' });
defB(11, 'Glass', [T.GLASS, T.GLASS, T.GLASS], 0.3, null, { opaque: false, drop: 0, color: '#cfe8f5' });
defB(12, 'Ice', [T.ICE, T.ICE, T.ICE], 0.5, 'pick', { friction: 0.98, drop: 0, color: '#96befc' });
defB(13, 'Blue Ice', [T.BLUE_ICE, T.BLUE_ICE, T.BLUE_ICE], 2.8, 'pick', { friction: 0.989, color: '#6696f0' });
defB(14, 'Cobweb', [T.WEB, T.WEB, T.WEB], 4, 'sword', { solid: false, opaque: false, cross: true, needTool: true, color: '#eee' });
defB(15, 'Water', [T.WATER, T.WATER, T.WATER], -1, null, { solid: false, opaque: false, liquid: true, color: '#345cde' });
defB(16, 'Sand', [T.SAND, T.SAND, T.SAND], 0.5, 'shovel', { color: '#dbcf9e' });
defB(17, 'Stone Bricks', [T.BRICK, T.BRICK, T.BRICK], 1.5, 'pick', { needTool: true, color: '#7a7a7a' });
defB(18, 'Obsidian', [T.OBSIDIAN, T.OBSIDIAN, T.OBSIDIAN], 50, 'pick', { needTool: true, color: '#161022' });
defB(19, 'White Wool', [T.WOOL_W, T.WOOL_W, T.WOOL_W], 0.8, 'shears', { color: '#e4e4e4' });
const bdef = id => id === 255 ? null : BL[id];
const isSolid = id => id === 255 || (id > 0 && BL[id].solid);
const isOpaque = id => id > 0 && id !== 255 && BL[id].opaque;

// ---------- world ----------
let WX = 48, WY = 40, WZ = 48, world = new Uint8Array(WX * WY * WZ), VOID_Y = -30;
let spawns = [];
function getB(x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (y < 0 || y >= WY) return 0;
  if (x < 0 || z < 0 || x >= WX || z >= WZ) return 255;
  return world[(y * WZ + z) * WX + x];
}
function rawSet(x, y, z, id) { if (x < 0 || y < 0 || z < 0 || x >= WX || y >= WY || z >= WZ) return; world[(y * WZ + z) * WX + x] = id; }
function setB(x, y, z, id) {
  if (x < 0 || y < 0 || z < 0 || x >= WX || y >= WY || z >= WZ) return false;
  rawSet(x, y, z, id); markDirty(x, z);
  if ((x & 15) === 0) markDirty(x - 1, z); if ((x & 15) === 15) markDirty(x + 1, z);
  if ((z & 15) === 0) markDirty(x, z - 1); if ((z & 15) === 15) markDirty(x, z + 1);
  return true;
}
function topY(x, z) { for (let y = WY - 1; y >= 0; y--) { const b = getB(x, y, z); if (isSolid(b) || b === B.WATER) return y + 1; } return -1; }

// ---------- meshing ----------
const FACES = [
  { dir: [-1, 0, 0], s: 0.8, t: 1, c: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], s: 0.8, t: 1, c: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], s: 0.5, t: 2, c: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], s: 1.0, t: 0, c: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], s: 0.65, t: 1, c: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], s: 0.65, t: 1, c: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] }
];
const CS = 16;
let chunks = [];
const atlasTex = new THREE.CanvasTexture(atlas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestFilter; atlasTex.generateMipmaps = false;
const matO = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
const matX = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
const matW = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
function garr() { return { p: [], u: [], c: [], i: [] }; }
function quad(g, x, y, z, F, tile, sh, yTop) {
  const n = g.p.length / 3, col = tile % ATL_C, row = (tile / ATL_C) | 0;
  for (const c of F.c) {
    let py = c[1]; if (yTop !== undefined && py === 1) py = yTop;
    g.p.push(x + c[0], y + py, z + c[2]);
    g.u.push((col + 0.001 + c[3] * 0.998) / ATL_C, 1 - (row + 1 - (0.001 + c[4] * 0.998)) / ATL_R);
    g.c.push(sh, sh, sh);
  }
  g.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
}
function crossQuads(g, x, y, z, tile) {
  const col = tile % ATL_C, row = (tile / ATL_C) | 0;
  const P = [[[0.05, 0, 0.05], [0.95, 0, 0.95], [0.05, 1, 0.05], [0.95, 1, 0.95]], [[0.95, 0, 0.05], [0.05, 0, 0.95], [0.95, 1, 0.05], [0.05, 1, 0.95]]];
  const UV = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const q of P) {
    const n = g.p.length / 3;
    q.forEach((p, k) => { g.p.push(x + p[0], y + p[1], z + p[2]); g.u.push((col + UV[k][0]) / ATL_C, 1 - (row + 1 - UV[k][1]) / ATL_R); g.c.push(1, 1, 1); });
    g.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
  }
}
function toGeo(g) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3));
  geo.setIndex(g.i); geo.computeBoundingSphere();
  return geo;
}
function buildChunk(ch) {
  const o = garr(), w = garr(), x2 = garr();
  const x0 = ch.cx * CS, z0 = ch.cz * CS;
  for (let y = 0; y < WY; y++) for (let z = z0; z < Math.min(z0 + CS, WZ); z++) for (let x = x0; x < Math.min(x0 + CS, WX); x++) {
    const id = world[(y * WZ + z) * WX + x]; if (!id) continue;
    const b = BL[id];
    if (b.cross) { crossQuads(x2, x, y, z, b.tiles[0]); continue; }
    if (b.liquid) {
      const top = getB(x, y + 1, z) === B.WATER ? 1 : 0.875;
      for (const F of FACES) {
        const n = getB(x + F.dir[0], y + F.dir[1], z + F.dir[2]);
        if (n === B.WATER || n === 255 || isOpaque(n)) continue;
        quad(w, x, y, z, F, b.tiles[F.t], F.s, top);
      }
      continue;
    }
    for (const F of FACES) {
      const n = getB(x + F.dir[0], y + F.dir[1], z + F.dir[2]);
      if (n === 255 || isOpaque(n)) continue;
      if (n === id && !b.opaque && id !== B.LEAVES) continue;
      quad(o, x, y, z, F, b.tiles[F.t], F.s * (0.86 + 0.14 * Math.min(1, y / 12)));
    }
  }
  for (const k of ['mo', 'mw', 'mx']) if (ch[k]) { scene.remove(ch[k]); ch[k].geometry.dispose(); ch[k] = null; }
  if (o.i.length) { ch.mo = new THREE.Mesh(toGeo(o), matO); scene.add(ch.mo); }
  if (x2.i.length) { ch.mx = new THREE.Mesh(toGeo(x2), matX); scene.add(ch.mx); }
  if (w.i.length) { ch.mw = new THREE.Mesh(toGeo(w), matW); ch.mw.renderOrder = 2; scene.add(ch.mw); }
  ch.dirty = false;
}
function markDirty(x, z) {
  if (x < 0 || z < 0 || x >= WX || z >= WZ) return;
  const c = chunks.find(c => c.cx === (x >> 4) && c.cz === (z >> 4)); if (c) c.dirty = true;
}
function rebuildAll() {
  for (const ch of chunks) for (const k of ['mo', 'mw', 'mx']) if (ch[k]) { scene.remove(ch[k]); ch[k].geometry.dispose(); }
  chunks = [];
  for (let cz = 0; cz < Math.ceil(WZ / CS); cz++) for (let cx = 0; cx < Math.ceil(WX / CS); cx++) chunks.push({ cx, cz, dirty: true });
  for (const ch of chunks) buildChunk(ch);
}
function updateChunks() { let n = 0; for (const ch of chunks) if (ch.dirty && n < 4) { buildChunk(ch); n++; } }

// ---------- world generators ----------
function allocWorld(x, y, z) { WX = x; WY = y; WZ = z; world = new Uint8Array(WX * WY * WZ); spawns = []; }
function tree(x, y, z) {
  for (let i = 0; i < 4; i++) rawSet(x, y + i, z, B.LOG);
  for (let dy = 2; dy <= 5; dy++) {
    const r = dy >= 4 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 5 || rnd() < 0.5)) continue;
      if (getB(x + dx, y + dy, z + dz) === 0) rawSet(x + dx, y + dy, z + dz, B.LEAVES);
    }
  }
}
function ringSpawns(cx, cz, r, n, y) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; spawns.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); }
}
function genArena(seed) {
  srand(seed); allocWorld(48, 40, 48);
  const G = 7;
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y < 4; y++) rawSet(x, y, z, B.STONE);
    rawSet(x, 4, z, B.DIRT); rawSet(x, 5, z, B.DIRT); rawSet(x, 6, z, B.GRASS);
    if (x === 0 || z === 0 || x === WX - 1 || z === WZ - 1) for (let y = G; y < G + 4; y++) rawSet(x, y, z, B.BRICK);
  }
  const C = 24;
  // central hill
  for (let x = C - 5; x <= C + 5; x++) for (let z = C - 5; z <= C + 5; z++) {
    const d = Math.hypot(x - C, z - C);
    if (d < 5.2) { rawSet(x, 6, z, B.DIRT); rawSet(x, 7, z, d < 3.2 ? B.DIRT : B.GRASS); }
    if (d < 3.2) rawSet(x, 8, z, B.GRASS);
  }
  // pond
  const px = 11 + ((rnd() * 4) | 0), pz = 35 + ((rnd() * 3) | 0);
  for (let x = px - 5; x <= px + 5; x++) for (let z = pz - 5; z <= pz + 5; z++) {
    const d = Math.hypot(x - px, z - pz);
    if (d < 3.6) { for (let y = 4; y <= 6; y++) rawSet(x, y, z, B.WATER); rawSet(x, 3, z, B.SAND); }
    else if (d < 4.8) rawSet(x, 6, z, B.SAND);
  }
  // blue ice track
  for (let x = 30; x <= 40; x++) for (let z = 7; z <= 10; z++) rawSet(x, 6, z, B.BLUE_ICE);
  // trees
  [[8, 8], [40, 40], [9, 25], [38, 26], [26, 40]].forEach(([x, z]) => { if (getB(x, 6, z) === B.GRASS) tree(x, 7, z); });
  // cover pillars & low walls
  for (let i = 0; i < 7; i++) {
    const x = 5 + ((rnd() * 38) | 0), z = 5 + ((rnd() * 38) | 0);
    if (Math.hypot(x - C, z - C) < 8 || getB(x, 6, z) !== B.GRASS || getB(x, 7, z)) continue;
    const h = 1 + ((rnd() * 2) | 0), m = rnd() < 0.5 ? B.COBBLE : B.PLANKS, len = 1 + ((rnd() * 3) | 0), ax = rnd() < 0.5;
    for (let k = 0; k < len; k++) for (let y = 7; y < 7 + h; y++) rawSet(x + (ax ? k : 0), y, z + (ax ? 0 : k), m);
  }
  // cobwebs
  [[C + 7, C - 7], [C - 7, C + 7], [C + 8, C + 8]].forEach(([x, z]) => { if (!getB(x, 7, z)) rawSet(x, 7, z, B.WEB); });
  ringSpawns(C + 0.5, C + 0.5, 16, 16, G + 0.01);
}
function island(cx, cz, r, top, surf) {
  for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d > r) continue;
    const depth = Math.floor((r - d) * 1.1 + 1 + rnd() * 2);
    for (let k = 0; k < depth; k++) rawSet(x, top - k, z, k === 0 ? (surf || B.GRASS) : k < 3 ? B.DIRT : B.STONE);
  }
}
function bridge(x0, z0, x1, z1, y, id) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len * 2);
  const px = -(z1 - z0) / len, pz = (x1 - x0) / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    for (let w = -1; w <= 1; w++) { const bx = Math.floor(x + px * w), bz = Math.floor(z + pz * w); if (!getB(bx, y, bz)) rawSet(bx, y, bz, id); }
  }
}
function genBridges(seed, nTeams) {
  srand(seed); allocWorld(72, 40, 72); VOID_Y = -30;
  const C = 36, top = 20;
  island(C, C, 7.5, top);
  tree(C, top + 1, C);
  const n = Math.max(2, Math.min(8, nTeams));
  const pos = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + 0.3, ix = C + Math.cos(a) * 25, iz = C + Math.sin(a) * 25;
    island(ix, iz, 5.5, top);
    const wool = [B.WOOL_R, B.WOOL_B, B.WOOL_W][i % 3];
    bridge(C + Math.cos(a) * 7, C + Math.sin(a) * 7, ix - Math.cos(a) * 5, iz - Math.sin(a) * 5, top, wool);
    pos.push([ix, iz]);
  }
  // ring bridges between neighbouring islands (half of them)
  for (let i = 0; i < n && n > 3; i += 2) {
    const a = pos[i], b = pos[(i + 1) % n]; bridge(a[0], a[1], b[0], b[1], top, B.PLANKS);
  }
  for (const p of pos) for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; spawns.push([p[0] + Math.cos(a) * 1.8, top + 1.01, p[1] + Math.sin(a) * 1.8]); }
  spawns.islands = n;
}
function genPlains(seed) {
  srand(seed); allocWorld(64, 44, 64);
  const o1 = rnd() * 10, o2 = rnd() * 10, WL = 11;
  const H = [];
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    let h = 13 + 2.6 * Math.sin(x * 0.13 + o1) + 2.6 * Math.cos(z * 0.11 + o2) + 1.6 * Math.sin((x + z) * 0.07 + o1 * 2) + rnd() * 0.6;
    h = Math.floor(h); H[x * WZ + z] = h;
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y < h - 3; y++) rawSet(x, y, z, B.STONE);
    for (let y = Math.max(1, h - 3); y < h; y++) rawSet(x, y, z, B.DIRT);
    rawSet(x, h, z, h <= WL ? B.SAND : B.GRASS);
    for (let y = h + 1; y <= WL; y++) rawSet(x, y, z, B.WATER);
    if (x === 0 || z === 0 || x === WX - 1 || z === WZ - 1) for (let y = h + 1; y < h + 4; y++) rawSet(x, y, z, B.BRICK);
  }
  for (let i = 0; i < 14; i++) {
    const x = 4 + ((rnd() * (WX - 8)) | 0), z = 4 + ((rnd() * (WZ - 8)) | 0), h = H[x * WZ + z];
    if (h > WL && getB(x, h + 1, z) === 0) tree(x, h + 1, z);
  }
  for (let i = 0; i < 40; i++) {
    const a = rnd() * 6.28, r = 8 + rnd() * 20, x = Math.floor(32 + Math.cos(a) * r), z = Math.floor(32 + Math.sin(a) * r);
    const h = H[x * WZ + z]; if (h > WL && getB(x, h + 1, z) === 0 && getB(x, h + 2, z) === 0) spawns.push([x + 0.5, h + 1.01, z + 0.5]);
  }
}
