// ================= SUNFLOWER-PLAINS LOOK: lime grass, plants, rolling hills, flat MC clouds =================

// ---------- brighter, modern lime grass ----------
(function () {
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
  const G = ['#6cae32', '#78ba3a', '#84c444', '#8fcd4d', '#9bd658'].map(hex);
  const D = ['#6b4a30', '#79553a', '#866143', '#936c4b'].map(hex);
  srand(301);
  const top = []; for (let i = 0; i < 256; i++) top.push(rnd());
  makeTile(T.GRASS_TOP, (x, y) => { const v = top[y * 16 + x]; return v < 0.12 ? G[0] : v < 0.4 ? G[1] : v < 0.75 ? G[2] : v < 0.93 ? G[3] : G[4]; });
  srand(302); const lip = []; for (let x = 0; x < 16; x++) lip[x] = 2 + ((rnd() * 2.4) | 0);
  makeTile(T.GRASS_SIDE, (x, y) => {
    if (y < lip[x]) return y === 0 ? G[3] : G[2];
    if (y === lip[x]) return rnd() < 0.5 ? G[1] : D[0];
    const v = rnd(); return v < 0.1 ? D[3] : v < 0.4 ? D[0] : v < 0.8 ? D[1] : D[2];
  });
})();

// ---------- plants: tall grass, sunflower, poppy, cornflower, dandelion ----------
Object.assign(T, { TGRASS: 31 });
const PLANT_TILES = {}; // drawn into a second small atlas row via extra canvas tiles
(function () {
  // reuse spare atlas slots 24..31 region where free: we only need 4 more tiles; pick indices not used by maps (21-30 used) -> extend atlas
  const old = atlas, nc = document.createElement('canvas'); nc.width = old.width; nc.height = old.height * 2;
  nc.getContext('2d').drawImage(old, 0, 0);
  atlas.width = nc.width; atlas.height = nc.height; actx.drawImage(nc, 0, 0);
})();
// atlas is now 8 x 8 tiles: update UV math by redefining ATL_R usage through new quad/cross functions
const ATL_R2 = 8;
function makeTile2(i, fn) { // like makeTile but for the taller atlas
  const c = cv(16), g = c.getContext('2d'), img = g.createImageData(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const p = fn(x, y), k = (y * 16 + x) * 4; img.data[k] = p[0]; img.data[k + 1] = p[1]; img.data[k + 2] = p[2]; img.data[k + 3] = p[3] == null ? 255 : p[3]; }
  g.putImageData(img, 0, 0); actx.clearRect((i % 8) * 16, Math.floor(i / 8) * 16, 16, 16); actx.drawImage(c, (i % 8) * 16, Math.floor(i / 8) * 16); tileCv[i] = c;
}
// redraw every existing tile into the bigger atlas at the same index (canvas resize cleared it)
for (let i = 0; i < tileCv.length; i++) if (tileCv[i]) actx.drawImage(tileCv[i], (i % 8) * 16, Math.floor(i / 8) * 16);
const PT = { TALLGRASS: 32, SUNFLOWER: 33, POPPY: 34, CORNFLOWER: 35, DANDELION: 36 };
(function () {
  srand(401);
  const blades = []; for (let i = 0; i < 9; i++) blades.push([2 + rnd() * 12, 6 + rnd() * 9, (rnd() - 0.5) * 0.5]);
  makeTile2(PT.TALLGRASS, (x, y) => {
    for (const [bx, h, lean] of blades) { const yy = 15 - y; if (yy <= h && Math.abs(x - (bx + lean * yy)) < 0.7) return yy > h - 2 ? [150, 214, 92] : [104, 172, 54]; }
    return [0, 0, 0, 0];
  });
  const flower = (head, ring) => (x, y) => {
    if (x >= 7 && x <= 8 && y >= 7) return (y === 11 && x === 8) || (y === 12 && x === 7) ? [70, 150, 40] : [86, 170, 52]; // stem + leaf
    if (y === 11 && (x === 9 || x === 10)) return [86, 170, 52];
    if (y === 12 && (x === 5 || x === 6)) return [86, 170, 52];
    const d = Math.hypot(x - 7.5, y - 4); if (d < 1.6) return ring; if (d < 3.4) return head;
    return [0, 0, 0, 0];
  };
  makeTile2(PT.SUNFLOWER, flower([248, 196, 30], [214, 110, 20]));
  makeTile2(PT.POPPY, (x, y) => { if (x >= 7 && x <= 8 && y >= 8) return [76, 150, 44]; const d = Math.hypot(x - 7.5, y - 6); return d < 1 ? [40, 30, 20] : d < 2.6 ? [214, 34, 34] : [0, 0, 0, 0]; });
  makeTile2(PT.CORNFLOWER, (x, y) => { if (x >= 7 && x <= 8 && y >= 8) return [76, 150, 44]; const d = Math.hypot(x - 7.5, y - 6); return d < 1 ? [40, 60, 160] : d < 2.6 ? [70, 110, 230] : [0, 0, 0, 0]; });
  makeTile2(PT.DANDELION, (x, y) => { if (x >= 7 && x <= 8 && y >= 9) return [76, 150, 44]; const d = Math.hypot(x - 7.5, y - 7); return d < 2.2 ? [252, 220, 40] : [0, 0, 0, 0]; });
})();
Object.assign(B, { TALLGRASS: 28, SUNFLOWER: 29, POPPY: 30, CORNFLOWER: 31, DANDELION: 32 });
const PLANTS = new Set([28, 29, 30, 31, 32]);
defB(28, 'Tall Grass', [PT.TALLGRASS, PT.TALLGRASS, PT.TALLGRASS], 0, null, { solid: false, opaque: false, cross: true, drop: 0, color: '#6aac36' });
defB(29, 'Sunflower', [PT.SUNFLOWER, PT.SUNFLOWER, PT.SUNFLOWER], 0, null, { solid: false, opaque: false, cross: true, drop: 0, color: '#f8c41e' });
defB(30, 'Poppy', [PT.POPPY, PT.POPPY, PT.POPPY], 0, null, { solid: false, opaque: false, cross: true, drop: 0, color: '#d62222' });
defB(31, 'Cornflower', [PT.CORNFLOWER, PT.CORNFLOWER, PT.CORNFLOWER], 0, null, { solid: false, opaque: false, cross: true, drop: 0, color: '#466ee6' });
defB(32, 'Dandelion', [PT.DANDELION, PT.DANDELION, PT.DANDELION], 0, null, { solid: false, opaque: false, cross: true, drop: 0, color: '#fcdc28' });

// UV math for the 8x8 atlas
quad = (function () {
  const _q = quad;
  return function (g, x, y, z, F, tile, sh, yTop) {
    const n0 = g.u.length; _q(g, x, y, z, F, tile, sh, yTop);
    const col = tile % 8, row = (tile / 8) | 0;
    for (let k = 0; k < 4; k++) { const c = F.c[k]; g.u[n0 + k * 2] = (col + 0.001 + c[3] * 0.998) / 8; g.u[n0 + k * 2 + 1] = 1 - (row + 1 - (0.001 + c[4] * 0.998)) / ATL_R2; }
  };
})();
crossQuads = function (g, x, y, z, tile) {
  const col = tile % 8, row = (tile / 8) | 0;
  const jx = ((x * 73856093 ^ z * 19349663) % 7) / 40, jz = ((x * 19349663 ^ z * 83492791) % 7) / 40; // a little jitter like MC
  const P2 = [[[0.1 + jx, 0, 0.1 + jz], [0.9 + jx, 0, 0.9 + jz], [0.1 + jx, 1, 0.1 + jz], [0.9 + jx, 1, 0.9 + jz]], [[0.9 + jx, 0, 0.1 + jz], [0.1 + jx, 0, 0.9 + jz], [0.9 + jx, 1, 0.1 + jz], [0.1 + jx, 1, 0.9 + jz]]];
  const UV = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const q of P2) {
    const n = g.p.length / 3;
    q.forEach((p, k) => { g.p.push(x + p[0], y + p[1], z + p[2]); g.u.push((col + UV[k][0]) / 8, 1 - (row + 1 - UV[k][1]) / ATL_R2); g.c.push(1, 1, 1); });
    g.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
  }
};
atlasTex.dispose(); atlasTex.needsUpdate = true;
for (const k in iconCache) if (k.startsWith('block')) delete iconCache[k];

// plants never block rays (arrows, attacks, aiming); clicking them replaces them like MC
const _rayBlocksPlants = rayBlocks;
rayBlocks = function (ox, oy, oz, dx, dy, dz, maxD) {
  let off = 0, h = _rayBlocksPlants(ox, oy, oz, dx, dy, dz, maxD);
  while (h && PLANTS.has(h.id) && off < maxD) {
    off += h.dist + 0.02;
    h = _rayBlocksPlants(ox + dx * off, oy + dy * off, oz + dz * off, dx, dy, dz, maxD - off);
    if (h) h.dist += off;
  }
  return h;
};
const _tryPlacePlants = tryPlace;
tryPlace = function (e) {
  const d = e.look(), h = _rayBlocksPlants(e.x, e.y + e.eyeH, e.z, d[0], d[1], d[2], 4.5);
  if (h && PLANTS.has(h.id)) { rawSet(h.x, h.y, h.z, 0); }
  else if (h) { const x = h.x + h.face[0], y = h.y + h.face[1], z = h.z + h.face[2]; if (PLANTS.has(getB(x, y, z))) rawSet(x, y, z, 0); }
  return _tryPlacePlants(e);
};
// bots can build where plants are (pillaring from a grassy spot etc.)
const _botPlacePlants = botPlace;
botPlace = function (b, x, y, z, web) { if (PLANTS.has(getB(x, y, z))) rawSet(x, y, z, 0); return _botPlacePlants(b, x, y, z, web); };
// placing / breaking the block under a plant removes the plant
const _setBPlants = setB;
setB = function (x, y, z, id) { const r = _setBPlants(x, y, z, id); if (r && !isSolid(id) && PLANTS.has(getB(x, y + 1, z))) _setBPlants(x, y + 1, z, 0); return r; };

// ---------- vegetation ----------
function plantAt(x, z, density) {
  for (let y = WY - 2; y > 0; y--) {
    const id = getB(x, y, z);
    if (id === 0 || PLANTS.has(id)) continue;
    if (id !== B.GRASS || getB(x, y + 1, z) !== 0) return;
    const r = rnd();
    if (r < density * 0.72) rawSet(x, y + 1, z, B.TALLGRASS);
    else if (r < density * 0.8) rawSet(x, y + 1, z, [B.POPPY, B.CORNFLOWER, B.DANDELION][(rnd() * 3) | 0]);
    return;
  }
}
function sunflowerPatch(cx, cz, r, n) { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * r, x = Math.floor(cx + Math.cos(a) * d), z = Math.floor(cz + Math.sin(a) * d); const y = topY(x, z); if (y > 0 && getB(x, y - 1, z) === B.GRASS && !getB(x, y, z)) rawSet(x, y, z, B.SUNFLOWER); } }

// ---------- new "Sunflower Plains" terrain (replaces Plains) ----------
genPlains = function (seed) {
  srand(seed); allocWorld(72, 48, 72); const N = makeNoise(seed); srand(seed + 1);
  const C = 36, MX = 10 + rnd() * 6, MZ = 10 + rnd() * 6; // mountain in one corner
  const H = [];
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    const dc = Math.hypot(x - C, z - C);
    const calm = clamp((dc - 6) / 14, 0, 1);                                  // flatter fighting area in the middle
    let h = 12 + (N(x * 0.035, 0, z * 0.035, 3) - 0.5) * 10 * calm + (N(x * 0.09, 5, z * 0.09, 2) - 0.5) * 4 * calm;
    const dm = Math.hypot(x - MX, z - MZ);
    const m = Math.max(0, 1 - dm / 30);                                                    // big rounded grassy mountain
    h += Math.pow(m, 1.35) * 24 * (0.65 + 0.6 * N(x * 0.06, 9, z * 0.06, 3)) + m * (N(x * 0.15, 4, z * 0.15, 2) - 0.5) * 6;
    h += Math.max(0, 9 - Math.hypot(x - (WX - 12), z - (WZ - 14)) * 0.6);                 // a second rise
    h = Math.floor(clamp(h, 6, WY - 6)); H[x * WZ + z] = h;
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y < h - 3; y++) rawSet(x, y, z, B.STONE);
    for (let y = Math.max(1, h - 3); y < h; y++) rawSet(x, y, z, B.DIRT);
    rawSet(x, h, z, B.GRASS);
  }
  // exposed stone on the steep mountain faces
  for (let x = 1; x < WX - 1; x++) for (let z = 1; z < WZ - 1; z++) {
    const h = H[x * WZ + z], slope = Math.max(Math.abs(h - H[(x + 1) * WZ + z]), Math.abs(h - H[x * WZ + z + 1]));
    if (slope >= 3 && rnd() < 0.5) rawSet(x, h, z, B.STONE);
  }
  // a few oak trees
  for (let i = 0; i < 9; i++) { const x = 4 + ((rnd() * (WX - 8)) | 0), z = 4 + ((rnd() * (WZ - 8)) | 0); if (Math.hypot(x - C, z - C) < 10) continue; const h = H[x * WZ + z]; if (getB(x, h, z) === B.GRASS) tree(x, h + 1, z); }
  // grass + flowers everywhere, sunflower fields
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) plantAt(x, z, Math.hypot(x - C, z - C) < 8 ? 0.22 : 0.45);
  for (let i = 0; i < 7; i++) sunflowerPatch(6 + rnd() * (WX - 12), 6 + rnd() * (WZ - 12), 4 + rnd() * 4, 18);
  sunflowerPatch(C, C, 9, 10);
  ringSpawnsFloor(C, C, 9, 16);
};
// light vegetation on the Arena too
const _genArenaVeg = genArena;
genArena = function (seed) { _genArenaVeg(seed); srand(seed + 5); for (let x = 1; x < WX - 1; x++) for (let z = 1; z < WZ - 1; z++) plantAt(x, z, 0.16); sunflowerPatch(10, 12, 3, 8); sunflowerPatch(38, 36, 3, 8); };
(function () { const r = MENU[0].rows.find(x => x[0] === 'map'); const o = r[3].find(c => c[0] === 'plains'); if (o) o[1] = 'Sunflower Plains'; })();

// ---------- flat, see-through Minecraft clouds ----------
clouds.visible = false;
const cloudTex = (() => {
  const c = cv(128), g = c.getContext('2d'); srand(777);
  for (let i = 0; i < 46; i++) { const x = (rnd() * 128) | 0, y = (rnd() * 128) | 0, w = 3 + ((rnd() * 14) | 0), h = 2 + ((rnd() * 7) | 0); g.fillStyle = '#fff'; g.fillRect(x, y, w, h); g.fillRect((x + w * 0.4) | 0, (y - 2) | 0, (w * 0.5) | 0, h + 3); }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
})();
const cloudLayer = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.82, alphaTest: 0.5, depthWrite: false, fog: false, side: THREE.DoubleSide }));
cloudLayer.rotation.x = -Math.PI / 2; cloudLayer.renderOrder = -5; scene.add(cloudLayer);
const cloudLayer2 = cloudLayer.clone(); cloudLayer2.material = cloudLayer.material.clone(); cloudLayer2.material.opacity = 0.35; cloudLayer2.renderOrder = -6; scene.add(cloudLayer2);
const _updateCameraClouds = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraClouds(alpha, dt);
  const sky = skyDome.visible;
  cloudLayer.visible = cloudLayer2.visible = sky;
  cloudLayer.position.set(camera.position.x, Math.max(WY + 22, 62), camera.position.z);
  cloudLayer2.position.set(camera.position.x, Math.max(WY + 22, 62) - 0.6, camera.position.z); // soft edge "thickness"
  cloudTex.offset.set((performance.now() / 1000 * 0.004 + camera.position.x / 400) % 1, (camera.position.z / 400) % 1);
};
// brighter summer sky with a pale horizon
scene.fog.color.setHex(0xc8ddff); scene.background.setHex(0x84b4ff);

// regenerate the menu backdrop with the new look
rebuildAll();
