// ================= NEW MAPS: Cave, Nether, Snowy Peaks, Desert Canyon =================
// + new blocks (netherrack, deepslate, ores, snow, glowstone, sandstone, nether bricks) and per-map atmosphere.

// ---------- new textures ----------
Object.assign(T, { NETHERRACK: 21, DEEPSLATE: 22, DIAMOND_ORE: 23, SNOW: 24, SNOW_SIDE: 25, GLOWSTONE: 26, SANDSTONE: 27, NETHER_BRICK: 28, GOLD_ORE: 29, SANDSTONE_TOP: 30 });
(function () {
  srand(9090);
  makeTile(T.NETHERRACK, () => rnd() < 0.15 ? nz([90, 26, 26], 20) : nz([112, 38, 36], 30));
  makeTile(T.DEEPSLATE, (x, y) => (y % 4 === 0 && rnd() < 0.5) ? nz([52, 52, 58], 10) : nz([74, 74, 80], 22));
  const ore = (c) => (x, y) => { const k = ((x * 7 + y * 13) % 17); return (k < 3 && rnd() < 0.85) ? nz(c, 30) : nz([118, 118, 118], 26); };
  makeTile(T.DIAMOND_ORE, ore([80, 230, 220]));
  makeTile(T.GOLD_ORE, ore([250, 210, 60]));
  makeTile(T.SNOW, () => nz([240, 246, 250], 14));
  const se = []; for (let x = 0; x < 16; x++) se[x] = 3 + (rnd() < 0.5 ? 1 : 0);
  makeTile(T.SNOW_SIDE, (x, y) => y < se[x] ? nz([240, 246, 250], 12) : (rnd() < 0.08 ? nz([100, 70, 48], 20) : nz([134, 96, 67], 36)));
  makeTile(T.GLOWSTONE, (x, y) => ((x * 3 + y * 5) % 7 < 2) ? nz([255, 236, 160], 20) : nz([196, 150, 70], 30));
  makeTile(T.SANDSTONE, (x, y) => (y % 5 === 4) ? nz([196, 176, 120], 10) : nz([220, 204, 150], 16));
  makeTile(T.SANDSTONE_TOP, () => nz([224, 210, 158], 14));
  makeTile(T.NETHER_BRICK, (x, y) => (y % 8 === 7 || x === (y < 8 ? 3 : 11)) ? nz([28, 12, 16], 8) : nz([60, 26, 32], 16));
  atlasTex.needsUpdate = true;
})();
Object.assign(B, { NETHERRACK: 20, DEEPSLATE: 21, DIAMOND_ORE: 22, SNOW: 23, GLOWSTONE: 24, SANDSTONE: 25, NETHER_BRICK: 26, GOLD_ORE: 27 });
defB(20, 'Netherrack', [T.NETHERRACK, T.NETHERRACK, T.NETHERRACK], 0.4, 'pick', { needTool: true, color: '#702624' });
defB(21, 'Deepslate', [T.DEEPSLATE, T.DEEPSLATE, T.DEEPSLATE], 3, 'pick', { needTool: true, color: '#4a4a50' });
defB(22, 'Diamond Ore', [T.DIAMOND_ORE, T.DIAMOND_ORE, T.DIAMOND_ORE], 3, 'pick', { needTool: true, drop: 4, color: '#50e6dc' });
defB(23, 'Snow Block', [T.SNOW, T.SNOW_SIDE, T.DIRT], 0.6, 'shovel', { drop: 2, color: '#f0f6fa' });
defB(24, 'Glowstone', [T.GLOWSTONE, T.GLOWSTONE, T.GLOWSTONE], 0.3, null, { drop: 0, color: '#f0d080' });
defB(25, 'Sandstone', [T.SANDSTONE_TOP, T.SANDSTONE, T.SANDSTONE], 0.8, 'pick', { needTool: true, color: '#dccc96' });
defB(26, 'Nether Bricks', [T.NETHER_BRICK, T.NETHER_BRICK, T.NETHER_BRICK], 2, 'pick', { needTool: true, color: '#3c1a20' });
defB(27, 'Gold Ore', [T.GOLD_ORE, T.GOLD_ORE, T.GOLD_ORE], 3, 'pick', { needTool: true, drop: 4, color: '#f0d23c' });

// ---------- noise ----------
function makeNoise(seed) {
  srand(seed); const P = new Uint8Array(512); for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [P[i], P[j]] = [P[j], P[i]]; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const h = (x, y, z) => P[(P[(P[x & 255] + y) & 255] + z) & 255] / 255;
  const s = t => t * t * (3 - 2 * t);
  const n3 = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = s(x - xi), yf = s(y - yi), zf = s(z - zi);
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), xf), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  };
  return (x, y, z, oct) => { let a = 0, f = 1, amp = 1, t = 0; for (let o = 0; o < (oct || 3); o++) { a += n3(x * f, y * f, z * f) * amp; t += amp; f *= 2; amp *= 0.5; } return a / t; };
}
function ringSpawnsFloor(cx, cz, r, n) { // spawns on the floor in a ring, ordered by angle (team split relies on order)
  spawns = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const x = Math.floor(cx + Math.cos(a) * r), z = Math.floor(cz + Math.sin(a) * r);
    let y = -1;
    for (let yy = 1; yy < WY - 2; yy++) if (isSolid(getB(x, yy - 1, z)) && !getB(x, yy, z) && !getB(x, yy + 1, z)) { y = yy; if (yy > 3) break; }
    if (y < 0) { y = topY(x, z); }
    spawns.push([x + 0.5, y + 0.01, z + 0.5]);
  }
}

// ---------- CAVE ----------
function genCave(seed) {
  allocWorld(64, 34, 64); const N = makeNoise(seed); srand(seed);
  const C = 32;
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) for (let y = 0; y < WY; y++) {
    if (y === 0 || y === WY - 1) { rawSet(x, y, z, B.BEDROCK); continue; }
    rawSet(x, y, z, y < 12 ? B.DEEPSLATE : B.STONE);
  }
  for (let x = 1; x < WX - 1; x++) for (let z = 1; z < WZ - 1; z++) for (let y = 6; y < WY - 2; y++) {
    const dx = x - C, dz = z - C;
    const dome = (dx * dx + dz * dz) / (17 * 17) + Math.pow((y - 10) / 11, 2);
    const n = N(x * 0.07, y * 0.12, z * 0.07, 3);
    const worm = Math.abs(N(x * 0.05 + 50, y * 0.08, z * 0.05, 2) - 0.5);
    if (dome < 1 + (n - 0.5) * 0.5 || (worm < 0.045 && y < 22) || (n > 0.68 && y < 26)) rawSet(x, y, z, 0);
  }
  // ores, glowstone, webs, water, mineshaft supports
  for (let i = 0; i < 9000; i++) {
    const x = 1 + ((rnd() * (WX - 2)) | 0), y = 1 + ((rnd() * (WY - 3)) | 0), z = 1 + ((rnd() * (WZ - 2)) | 0);
    const id = getB(x, y, z); if (id !== B.STONE && id !== B.DEEPSLATE) continue;
    if (N6.some(([a, b, c]) => getB(x + a, y + b, z + c) === 0)) {
      const r = rnd();
      if (r < 0.06) rawSet(x, y, z, B.DIAMOND_ORE); else if (r < 0.14) rawSet(x, y, z, B.GOLD_ORE);
      else if (r < 0.2 && getB(x, y - 1, z) === 0) rawSet(x, y, z, B.GLOWSTONE);
    }
  }
  for (let i = 0; i < 60; i++) { // cobwebs in corners near the ceiling
    const x = 2 + ((rnd() * (WX - 4)) | 0), z = 2 + ((rnd() * (WZ - 4)) | 0);
    for (let y = WY - 3; y > 7; y--) if (getB(x, y, z) === 0 && isSolid(getB(x, y + 1, z))) { if (rnd() < 0.5) rawSet(x, y, z, B.WEB); break; }
  }
  for (let k = 0; k < 4; k++) { // underground pools
    const px = C + Math.round(Math.cos(k * 1.7) * 8), pz = C + Math.round(Math.sin(k * 1.7) * 8);
    for (let x = px - 2; x <= px + 2; x++) for (let z = pz - 2; z <= pz + 2; z++) if (getB(x, 6, z) === 0 && Math.hypot(x - px, z - pz) < 2.4) { rawSet(x, 5, z, B.WATER); rawSet(x, 4, z, B.WATER); }
  }
  for (let k = 0; k < 6; k++) { // mineshaft supports
    const a = k / 6 * Math.PI * 2 + 0.4, x = Math.floor(C + Math.cos(a) * 14), z = Math.floor(C + Math.sin(a) * 14);
    for (let y = 6; y < 11 && getB(x, y, z) === 0; y++) rawSet(x, y, z, B.LOG);
    for (let d = -1; d <= 1; d++) if (getB(x + d, 11, z) === 0) rawSet(x + d, 11, z, B.PLANKS);
  }
  ringSpawnsFloor(C, C, 11, 16);
}

// ---------- NETHER ----------
function genNether(seed) {
  allocWorld(64, 40, 64); const N = makeNoise(seed); srand(seed);
  const C = 32;
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    const h = Math.floor(9 + N(x * 0.06, 0, z * 0.06, 3) * 9 + (Math.hypot(x - C, z - C) > 26 ? (Math.hypot(x - C, z - C) - 26) * 1.5 : 0));
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y <= Math.min(h, WY - 2); y++) rawSet(x, y, z, B.NETHERRACK);
    // ceiling stalactites
    const c = Math.floor(6 * N(x * 0.09 + 30, 5, z * 0.09, 2));
    for (let y = WY - 1; y > WY - 1 - c * (N(x * 0.2, 9, z * 0.2) > 0.55 ? 2 : 0.6); y--) rawSet(x, y, z, B.NETHERRACK);
  }
  // flatten the arena floor in the middle + fortress bridge
  for (let x = C - 12; x <= C + 12; x++) for (let z = C - 12; z <= C + 12; z++) if (Math.hypot(x - C, z - C) < 12) { for (let y = 1; y < 12; y++) rawSet(x, y, z, B.NETHERRACK); for (let y = 12; y < 22; y++) rawSet(x, y, z, 0); }
  for (let x = 4; x < WX - 4; x++) for (let w = -1; w <= 1; w++) { rawSet(x, 15, C + w, B.NETHER_BRICK); if (w !== 0 && x % 4 === 0) rawSet(x, 16, C + w, B.NETHER_BRICK); if (x % 8 === 0) for (let y = 1; y < 15; y++) if (!getB(x, y, C + w)) rawSet(x, y, C + w, B.NETHER_BRICK); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = Math.floor(C + Math.cos(a) * 9), z = Math.floor(C + Math.sin(a) * 9); for (let y = 12; y < 12 + 3 + (i % 3); y++) rawSet(x, y, z, B.OBSIDIAN); }
  for (let i = 0; i < 40; i++) { const x = (rnd() * WX) | 0, z = (rnd() * WZ) | 0; for (let y = WY - 2; y > 20; y--) if (getB(x, y, z) === 0 && isSolid(getB(x, y + 1, z))) { rawSet(x, y, z, B.GLOWSTONE); if (rnd() < 0.5) rawSet(x, y - 1, z, B.GLOWSTONE); break; } }
  ringSpawnsFloor(C, C, 9, 16);
}

// ---------- SNOWY PEAKS ----------
function genSnow(seed) {
  allocWorld(64, 48, 64); const N = makeNoise(seed); srand(seed);
  const C = 32, H = [];
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    const d = Math.hypot(x - C, z - C);
    const ring = clamp((d - 15) / 12, 0, 1);
    let h = 10 + ring * ring * (16 + N(x * 0.08, 3, z * 0.08, 3) * 14) + N(x * 0.15, 7, z * 0.15, 2) * 3;
    h = Math.floor(Math.min(h, WY - 4)); H[x * WZ + z] = h;
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y < h - 2; y++) rawSet(x, y, z, B.STONE);
    for (let y = Math.max(1, h - 2); y < h; y++) rawSet(x, y, z, h > 20 ? B.STONE : B.DIRT);
    rawSet(x, h, z, h > 22 && N(x * 0.3, 1, z * 0.3) < 0.45 ? B.STONE : B.SNOW);
  }
  // frozen lake in the valley
  for (let x = C - 7; x <= C + 7; x++) for (let z = C - 4; z <= C + 4; z++) if (Math.hypot((x - C) / 7, (z - C) / 4) < 1 && Math.hypot(x - C, z - C) > 3) { rawSet(x, H[x * WZ + z], z, B.ICE); rawSet(x, H[x * WZ + z] - 1, z, B.WATER); }
  // spruce-ish trees
  for (let i = 0; i < 18; i++) {
    const a = rnd() * 6.28, r = 8 + rnd() * 16, x = Math.floor(C + Math.cos(a) * r), z = Math.floor(C + Math.sin(a) * r);
    if (x < 3 || z < 3 || x > WX - 4 || z > WZ - 4) continue;
    const h = H[x * WZ + z]; if (getB(x, h, z) !== B.SNOW) continue;
    for (let y = 1; y <= 6; y++) rawSet(x, h + y, z, B.LOG);
    for (let y = 3; y <= 7; y++) { const rr = y < 5 ? 2 : y < 7 ? 1 : 0; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) if ((dx || dz || y === 7) && Math.abs(dx) + Math.abs(dz) <= rr + 1 && !getB(x + dx, h + y, z + dz)) rawSet(x + dx, h + y, z + dz, B.LEAVES); }
  }
  ringSpawnsFloor(C, C, 10, 16);
}

// ---------- DESERT CANYON ----------
function genCanyon(seed) {
  allocWorld(64, 40, 64); const N = makeNoise(seed); srand(seed);
  const C = 32;
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    const off = Math.sin(z * 0.12) * 4 + (N(0, 0, z * 0.05) - 0.5) * 6;
    const dx = Math.abs(x - C - off);
    let h = dx < 11 ? 8 : 8 + Math.min(20, (dx - 11) * 2.4 + N(x * 0.1, 2, z * 0.1) * 6);
    if (dx > 14 && N(x * 0.2, 4, z * 0.2) > 0.62) h += 4; // hoodoos
    h = Math.floor(h);
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y < h; y++) rawSet(x, y, z, (y % 6 === 0) ? B.SANDSTONE : (y > 9 && (y % 6 === 3) ? B.WOOL_R : B.SANDSTONE));
    rawSet(x, h, z, dx < 11 ? B.SAND : B.SANDSTONE);
    if (dx < 2.2) { rawSet(x, h, z, B.WATER); rawSet(x, h - 1, z, B.WATER); }
  }
  // plank bridges over the river + rock arches
  for (const bz of [14, 32, 50]) for (let x = C - 6; x <= C + 6; x++) for (let w = 0; w < 2; w++) if (!getB(x, 9, bz + w) || getB(x, 9, bz + w) === B.WATER) rawSet(x, 9, bz + w, B.PLANKS);
  for (let i = 0; i < 3; i++) { const z = 8 + i * 22; for (let x = C - 13; x <= C + 13; x++) { const y = Math.floor(22 - Math.pow((x - C) / 13, 2) * 10); for (let k = 0; k < 2; k++) rawSet(x, y + k, z, B.SANDSTONE); } }
  ringSpawnsFloor(C, C, 8, 16);
}

// ---------- hook into match start / menu ----------
const NEW_MAPS = { cave: genCave, nether: genNether, snow: genSnow, canyon: genCanyon };
const ATMO = {
  default: { bg: 0x8ab8ff, fog: 0xb4d2ff, near: 45, far: 120, sky: true, tint: 1, light: 0.85 },
  cave: { bg: 0x08080c, fog: 0x0c0c12, near: 6, far: 40, sky: false, tint: 0.62, light: 0.5 },
  nether: { bg: 0x2a0806, fog: 0x4a120c, near: 8, far: 55, sky: false, tint: 0.85, light: 0.7 },
  snow: { bg: 0xb8c8e0, fog: 0xe2eaf4, near: 18, far: 85, sky: true, tint: 1, light: 0.95 },
  canyon: { bg: 0x9cc0f0, fog: 0xf0dcb0, near: 30, far: 110, sky: true, tint: 1.02, light: 0.95 }
};
const lightsMC = []; scene.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight) lightsMC.push([o, o.intensity]); });
function applyAtmo(name) {
  const a = ATMO[name] || ATMO.default;
  scene.background.setHex(a.bg); scene.fog.color.setHex(a.fog); scene.fog.near = a.near; scene.fog.far = a.far;
  skyDome.visible = a.sky; sun.visible = a.sky; clouds.visible = a.sky;
  for (const m of [matO, matX, matW]) m.color.setScalar(a.tint);
  for (const [l, i] of lightsMC) l.intensity = i * a.light / 0.85;
}
const _startGameMaps = startGame;
startGame = function () {
  const gen = NEW_MAPS[CFG.map];
  const keepArena = genArena;
  if (gen) genArena = seed => { VOID_Y = -30; gen(seed); };
  try { _startGameMaps(); } finally { genArena = keepArena; }
  applyAtmo(CFG.map);
};
G.startGame = startGame;
const _toMenuMaps = toMenu;
toMenu = function () { _toMenuMaps(); applyAtmo('default'); };
(function () {
  const r = MENU[0].rows.find(x => x[0] === 'map');
  r[2] = 'ch'; r[3] = r[3].concat([['cave', 'Cave'], ['nether', 'Nether'], ['snow', 'Snowy Peaks'], ['canyon', 'Desert Canyon']]);
})();
buildMenu();
