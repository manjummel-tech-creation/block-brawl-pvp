// ================= CLASSIC-STYLE BLOCK TEXTURES =================
// Original 16x16 textures drawn in the classic block-game style: speckled per-pixel noise in small muted palettes
// (instead of the smooth blobby patches), ragged grass edge on dirt, board seams on planks, streaky bark, holey leaves.
(function () {
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
  const P = a => a.map(hex);
  const put = typeof makeTile2 === 'function' ? makeTile2 : makeTile;
  // per-pixel random grid (seeded), plus a soft low-frequency layer so speckles form tiny clumps
  function noise(seed) { srand(seed); const a = []; for (let i = 0; i < 256; i++) a.push(rnd()); return a; }
  function soft(seed) {
    const n = noise(seed), o = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let s = 0; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) s += n[((y + dy + 16) % 16) * 16 + ((x + dx + 16) % 16)];
      o.push(s / 5);
    }
    return o;
  }
  // speckle: mostly the middle shades, with a little of the darkest / lightest
  function speckle(seed, pal, clump) {
    const n = noise(seed), s = soft(seed + 9), k = clump === undefined ? 0.45 : clump;
    return (x, y) => { const i = y * 16 + x, v = clamp(n[i] * (1 - k) + ((s[i] - 0.5) * 2.2 + 0.5) * k, 0, 0.9999); return pal[Math.floor(v * pal.length)]; };
  }

  const GRASS = P(['#467f2c', '#4f8b32', '#5a9739', '#5a9739', '#64a340', '#6fae49']);
  const DIRT = P(['#6a4a30', '#79563a', '#866042', '#866042', '#916b4a', '#9c7754']);
  const STONE = P(['#6e6e6e', '#787878', '#818181', '#818181', '#8a8a8a', '#939393']);
  const SAND = P(['#cdc18d', '#d6ca98', '#dcd1a1', '#dcd1a1', '#e2d8ab', '#e9e0b7']);

  // grass top
  put(T.GRASS_TOP, speckle(301, GRASS, 0.4));
  // dirt, with a few grey pebbles
  { const f = speckle(311, DIRT, 0.4), n = noise(312); put(T.DIRT, (x, y) => n[y * 16 + x] > 0.975 ? hex('#8d8478') : f(x, y)); }
  // grass side: dirt with a ragged green cap dripping 2-4 px down
  { const d = speckle(311, DIRT, 0.4), g = speckle(321, GRASS, 0.3), n = noise(322), lip = [];
    for (let x = 0; x < 16; x++) lip[x] = 2 + Math.floor(n[x] * 3);
    put(T.GRASS_SIDE, (x, y) => y < lip[x] ? g(x, y) : y === lip[x] && n[40 + x] < 0.35 ? GRASS[0] : y === lip[x] ? DIRT[0] : d(x, y)); }
  // stone: speckle plus short darker cracks
  { const f = speckle(331, STONE, 0.55), n = noise(332), dark = new Set();
    for (let i = 0; i < 9; i++) { const x = Math.floor(n[i * 3] * 16), y = Math.floor(n[i * 3 + 1] * 16), L = 2 + Math.floor(n[i * 3 + 2] * 4); for (let k = 0; k < L; k++) dark.add(((x + k) % 16) + ((y + (k > 2 ? 1 : 0)) % 16) * 16); }
    put(T.STONE, (x, y) => dark.has(y * 16 + x) ? hex('#656565') : f(x, y)); }
  // cobblestone: chunky stones with a light top-left edge, dark bottom-right edge and dark gaps
  { srand(341); const pts = []; for (let i = 0; i < 17; i++) pts.push([rnd() * 16, rnd() * 16, rnd()]);
    const n = noise(342), C = P(['#505050', '#666666', '#7b7b7b', '#868686', '#989898']);
    put(T.COBBLE, (x, y) => {
      let d1 = 1e9, d2 = 1e9, best = null;
      for (const p of pts) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) { const d = Math.max(Math.abs(x + 0.5 - p[0] - ox), Math.abs(y + 0.5 - p[1] - oy) * 1.25); if (d < d1) { d2 = d1; d1 = d; best = [p[0] + ox, p[1] + oy, p[2]]; } else if (d < d2) d2 = d; }
      if (d2 - d1 < 0.55) return C[0];
      const lx = x + 0.5 - best[0], ly = y + 0.5 - best[1];
      if (lx + ly < -1.4) return C[4];
      if (lx + ly > 1.5) return C[1];
      return n[y * 16 + x] < 0.25 ? C[2] : best[2] > 0.5 ? C[3] : C[2];
    }); }
  // planks: four boards with dark seams, staggered joints and fine grain noise
  { const W = P(['#6e5530', '#a3824f', '#b08d59', '#b08d59', '#bb9963', '#c6a46e']), n = noise(351), joint = [5, 13, 2, 10];
    put(T.PLANKS, (x, y) => { const b = y >> 2, r = y & 3;
      if (r === 3) return W[0];
      if (x === joint[b]) return W[0];
      const v = n[y * 16 + x] * 0.6 + n[b * 16 + ((x >> 2) % 16)] * 0.4;
      return r === 0 && v > 0.45 ? W[5] : W[1 + Math.floor(clamp(v, 0, 0.999) * 4)]; }); }
  // log side: vertical bark streaks
  { const Bk = P(['#4a381f', '#5a4528', '#665030', '#665030', '#745c39']), n = noise(361);
    put(T.LOG, (x, y) => { const col = n[x], run = n[32 + x * 3 + (y >> 2)]; if (col < 0.22 || (run < 0.18 && col < 0.6)) return Bk[0]; return Bk[1 + Math.floor(clamp(col * 0.6 + n[y * 16 + x] * 0.4, 0, 0.999) * 4)]; }); }
  // log top: bark border and growth rings
  { const R = P(['#5a4528', '#b8935c', '#a8834e', '#c4a069']), n = noise(371);
    put(T.LOG_TOP, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (d > 6.6) return n[y * 16 + x] < 0.3 ? hex('#4a381f') : R[0]; return d < 1 ? R[2] : [R[1], R[2], R[1], R[3]][Math.floor(d) % 4]; }); }
  // leaves: noisy greens with single-pixel see-through holes
  { const L = P(['#285e19', '#30701f', '#3a8026', '#3a8026', '#469030', '#52a03a']), f = speckle(381, L, 0.25), n = noise(382);
    put(T.LEAVES, (x, y) => n[y * 16 + x] < 0.2 ? [0, 0, 0, 0] : f(x, y)); }
  // sand: fine speckle
  put(T.SAND, speckle(391, SAND, 0.2));
  // stone bricks: two rows of bevelled bricks with speckle
  { const S = P(['#565656', '#727272', '#7c7c7c', '#7c7c7c', '#868686', '#989898']), f = speckle(401, S.slice(1, 5), 0.4);
    put(T.BRICK, (x, y) => { const row = y < 8 ? 0 : 1, lx = (x + (row ? 8 : 0)) % 16, ly = y % 8;
      if (ly === 7 || lx === 15) return S[0];
      if (ly === 0 || lx === 0) return S[5];
      return f(x, y); }); }
  // bedrock: harsh light / dark blotches
  { const Bd = P(['#151515', '#2b2b2b', '#444444', '#5c5c5c', '#8a8a8a']); put(T.BEDROCK, speckle(411, Bd, 0.7)); }
  // obsidian: near-black purple with faint highlights
  { const O = P(['#0d0915', '#140d20', '#140d20', '#1d132e', '#2c1c45', '#3d2a5c']); put(T.OBSIDIAN, speckle(421, O, 0.5)); }
  // wool: soft fluffy noise
  const wool = (seed, base) => { const c = hex(base), n = soft(seed), m = noise(seed + 1); return (x, y) => { const k = 0.9 + n[y * 16 + x] * 0.16 + (m[y * 16 + x] > 0.9 ? 0.05 : 0); return [c[0] * k, c[1] * k, c[2] * k, 255]; }; };
  put(T.WOOL_R, wool(431, '#a82a22')); put(T.WOOL_B, wool(441, '#353d9e')); put(T.WOOL_W, wool(451, '#e4e7e7'));

  atlasTex.needsUpdate = true;
  if (typeof iconCache !== 'undefined') for (const k in iconCache) if (k.startsWith('block')) delete iconCache[k];
})();
