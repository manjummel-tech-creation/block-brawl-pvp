// ================= A BIT MORE KNOCKBACK · KNOCKBACK CHOICE (ALSO FOR ONLINE PARTIES) · THE BIG HOUSE MAP =================

// ---------- knockback: a little more by default, and easy to choose ----------
if (!CFG._v11) { if (CFG.kbAmount === 20 || CFG.kbAmount === undefined) CFG.kbAmount = 28; CFG._v11 = 1; saveCfg(); }
DEF.kbAmount = 28;
const KB_PRESETS = [[15, 'Very low'], [28, 'Normal'], [45, 'Medium'], [70, 'High'], [100, 'Vanilla (full)']];
(function () {                                       // a quick knockback picker at the top of the Match settings
  const rows = MENU[0].rows, i = rows.findIndex(x => x[0] === 'mode');
  rows.splice(i + 1, 0, ['kbPreset', 'Knockback', 'ch', KB_PRESETS.map(([v, n]) => [String(v), `${n} (${v}%)`])]);
})();
Object.defineProperty(CFG, 'kbPreset', { configurable: true, enumerable: false, get() { return String(CFG.kbAmount); }, set(v) { CFG.kbAmount = +v; } });

// ---------- online: the host picks mode, map and knockback for the party right in the Online panel ----------
const _buildMenuHostOpts = buildMenu;
buildMenu = function () {
  _buildMenuHostOpts();
  const panel = document.querySelector('#netHost') && document.querySelector('#netHost').closest('.panel'); if (!panel || panel.querySelector('#netOpts')) return;
  const modeRow = MENU[0].rows.find(x => x[0] === 'mode'), mapRow = MENU[0].rows.find(x => x[0] === 'map');
  const opt = (list, cur) => list.map(([v, n]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${n}</option>`).join('');
  const d = document.createElement('div'); d.id = 'netOpts';
  d.innerHTML = `<div style="font-size:19px;color:#ffff70;margin-top:8px">Party settings (the host's are used for everyone)</div>
    <div class="row"><label>Mode</label><select class="mcin" id="netMode">${opt(modeRow[3], CFG.mode)}</select></div>
    <div class="row"><label>Map</label><select class="mcin" id="netMap">${opt(mapRow[3], CFG.map)}</select></div>
    <div class="row"><label>Knockback <span class="val" id="netKbV">${CFG.kbAmount}%</span></label><input type="range" id="netKb" min="0" max="100" step="1" value="${CFG.kbAmount}"></div>`;
  panel.appendChild(d);
  d.querySelector('#netMode').onchange = e => { CFG.mode = e.target.value; saveCfg(); buildMenu(); };
  d.querySelector('#netMap').onchange = e => { CFG.map = e.target.value; saveCfg(); buildMenu(); };
  const kb = d.querySelector('#netKb'); kb.oninput = () => { CFG.kbAmount = +kb.value; d.querySelector('#netKbV').textContent = kb.value + '%'; saveCfg(); };
  kb.onchange = () => buildMenu();
  d.querySelectorAll('select,input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
};
buildMenu();

// ---------- the Big House: fight inside a mansion ----------
function genHouse(seed) {
  srand(seed); allocWorld(84, 32, 68); VOID_Y = -30;
  const G = 3, SB = B.BRICK, PL = B.PLANKS, LG = B.LOG, GL = B.GLASS, WR = B.WOOL_R, WW = B.WOOL_W, WB = B.WOOL_B, LT = B.GLOWSTONE;
  const fill = (x0, x1, y0, y1, z0, z1, id) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) rawSet(x, y, z, id); };
  // ground + garden
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) { rawSet(x, 0, z, B.BEDROCK); rawSet(x, 1, z, B.DIRT); rawSet(x, 2, z, B.DIRT); rawSet(x, G, z, B.GRASS); }
  const tree = (x, z) => { for (let y = 1; y <= 5; y++) rawSet(x, G + y, z, LG); for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) for (let y = 4; y <= 6; y++) if (Math.abs(a) + Math.abs(c) + (y - 4) < 4 && !getB(x + a, G + y, z + c)) rawSet(x + a, G + y, z + c, B.LEAVES); };
  for (const [x, z] of [[3, 3], [3, 30], [3, 62], [80, 3], [80, 34], [80, 62], [40, 2], [20, 64], [62, 64]]) tree(x, z);
  for (let i = 0; i < 260; i++) { const x = (rnd() * WX) | 0, z = (rnd() * WZ) | 0; if ((x < 7 || x > 76 || z < 7 || z > 60) && getB(x, G, z) === B.GRASS && !getB(x, G + 1, z)) rawSet(x, G + 1, z, [B.POPPY, B.DANDELION, B.CORNFLOWER, B.TALLGRASS][(rnd() * 4) | 0]); }
  // shell: outer walls (stone brick, log pillars, two rows of windows), floors, flat roof with parapet + skylight over the hall
  const X0 = 8, X1 = 75, Z0 = 8, Z1 = 59, F2 = 11, TOP = 19;
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
    rawSet(x, G, z, x >= 28 && x <= 51 ? SB : PL);
    if (edge) for (let y = G + 1; y <= TOP; y++) {
      const pillar = (x - X0) % 6 === 0 || (z - Z0) % 6 === 0, win = !pillar && ((y >= 6 && y <= 8) || (y >= 13 && y <= 16));
      rawSet(x, y, z, pillar ? LG : win ? GL : SB);
    }
    rawSet(x, TOP, z, x >= 32 && x <= 47 && z >= 14 && z <= 53 && (x + z) % 3 === 0 ? GL : SB);
    if (edge && (x + z) % 2 === 0) rawSet(x, TOP + 1, z, B.NETHER_BRICK);
  }
  // front door (south)
  fill(38, 41, G + 1, G + 5, Z1, Z1, 0);
  // the hall is double height; the wings get a second floor
  for (const [a0, a1] of [[X0 + 1, 27], [52, X1 - 1]]) fill(a0, a1, F2, F2, Z0 + 1, Z1 - 1, PL);
  // wing walls (hall | wings) with doorways on both floors
  for (const wx of [27, 52]) for (let z = Z0 + 1; z < Z1; z++) for (let y = G + 1; y < TOP; y++) {
    const door = ((z >= 19 && z <= 21) || (z >= 43 && z <= 45)) && (y <= G + 4 || (y >= F2 + 1 && y <= F2 + 4));
    rawSet(wx, y, z, door ? 0 : ((z - Z0) % 6 === 0 ? LG : PL));
  }
  // rooms: split each wing at z=33 (door in the middle)
  for (const [a0, a1] of [[X0 + 1, 26], [53, X1 - 1]]) for (let x = a0; x <= a1; x++) for (let y = G + 1; y < TOP; y++) if (y !== F2) {
    const door = Math.abs(x - (a0 + a1) / 2) <= 1.5 && (y <= G + 4 || (y >= F2 + 1 && y <= F2 + 4));
    rawSet(x, y, 33, door ? 0 : PL);
  }
  // galleries in the hall at the second-floor level (with railings) + two grand staircases up to them
  for (const [g0, g1, rail] of [[28, 31, 31], [48, 51, 48]]) for (let z = Z0 + 1; z <= 49; z++) for (let x = g0; x <= g1; x++) { rawSet(x, F2, z, PL); if (x === rail && z % 2 === 0) rawSet(x, F2 + 1, z, LG); }
  for (const [s0, s1] of [[28, 31], [48, 51]]) for (let k = 0; k <= 7; k++) { const z = 57 - k; fill(s0, s1, G + 1, G + 1 + k, z, z, k === 7 ? PL : SB); fill(s0, s1, G + 2 + k, F2 + 4, z, z, 0); }
  // ---------- decor ----------
  // HALL: red carpet, chandeliers, statues, plants, a grand piano
  for (let z = Z0 + 1; z < Z1; z++) for (let x = 37; x <= 42; x++) rawSet(x, G, z, x === 37 || x === 42 ? B.GOLD_ORE : WR);
  for (const cz of [20, 34, 48]) { for (let y = 15; y < TOP; y++) rawSet(39, y, cz, LG); for (const [a, c] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) rawSet(39 + a, 14, cz + c, LT); }
  for (const z of [14, 26, 40, 52]) for (const x of [34, 45]) { rawSet(x, G + 1, z, SB); rawSet(x, G + 2, z, SB); rawSet(x, G + 3, z, B.GOLD_ORE); }
  for (const [x, z] of [[29, 10], [50, 10], [33, 57], [46, 57]]) { rawSet(x, G + 1, z, PL); rawSet(x, G + 2, z, B.LEAVES); rawSet(x, G + 3, z, B.LEAVES); }
  fill(43, 46, G + 1, G + 1, 10, 12, B.OBSIDIAN); fill(43, 46, G + 2, G + 2, 10, 10, B.OBSIDIAN); rawSet(44, G + 1, 13, WB);
  // LIVING ROOM (west, south half... z 9-32): sofas, coffee table, rug, fireplace, bookshelf, lamps
  for (let x = 12; x <= 22; x++) for (let z = 15; z <= 26; z++) rawSet(x, G, z, (x === 12 || x === 22 || z === 15 || z === 26) ? WR : WW);
  fill(13, 21, G + 1, G + 1, 24, 24, WB); fill(13, 13, G + 1, G + 1, 17, 23, WB); fill(21, 21, G + 1, G + 1, 17, 23, WB);
  fill(16, 18, G + 1, G + 1, 19, 20, PL);
  fill(X0 + 1, X0 + 1, G + 1, G + 1, 18, 22, 20); rawSet(X0 + 1, G + 2, 20, LT); fill(X0 + 1, X0 + 1, G + 2, G + 5, 17, 17, SB); fill(X0 + 1, X0 + 1, G + 2, G + 5, 23, 23, SB); fill(X0 + 1, X0 + 1, G + 6, G + 6, 17, 23, SB);
  for (let x = 10; x <= 25; x++) for (let y = G + 1; y <= G + 4; y++) rawSet(x, y, Z0 + 1, x % 4 === 0 ? LG : PL);
  for (const [x, z] of [[11, 12], [24, 30]]) { rawSet(x, G + 1, z, LG); rawSet(x, G + 2, z, LG); rawSet(x, G + 3, z, LT); }
  // LIBRARY (west, z 34-58): shelf rows with aisles, reading tables
  for (const x of [11, 15, 19, 23]) for (let z = 37; z <= 52; z++) if (z !== 44 && z !== 45) for (let y = G + 1; y <= G + 4; y++) rawSet(x, y, z, z % 5 === 0 || y === G + 4 ? LG : PL);
  for (const [x, z] of [[13, 55], [21, 55]]) { fill(x - 1, x + 1, G + 1, G + 1, z, z, PL); rawSet(x - 2, G + 1, z, WR); rawSet(x + 2, G + 1, z, WR); rawSet(x, G + 2, z, LT); }
  // DINING ROOM (east, z 9-32): long table + chairs, chandelier, sideboard
  fill(57, 70, G + 1, G + 1, 19, 21, PL); for (let x = 57; x <= 70; x += 2) { rawSet(x, G + 1, 18, WR); rawSet(x, G + 1, 22, WR); }
  for (const x of [60, 67]) rawSet(x, G + 2, 20, LT);
  for (let y = 7; y < F2; y++) rawSet(63, y, 20, LG); for (const [a, c] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) rawSet(63 + a, 7, 20 + c, LT);
  fill(56, 71, G + 1, G + 1, Z0 + 1, Z0 + 1, LG); fill(56, 71, G + 2, G + 2, Z0 + 1, Z0 + 1, PL);
  // KITCHEN (east, z 34-58): counters along the walls, a sink, a stove, a pantry of crates
  for (let x = 54; x <= 73; x++) { rawSet(x, G + 1, Z1 - 1, SB); rawSet(x, G + 1, 35, x > 58 && x < 69 ? 0 : SB); }
  for (let z = 36; z <= 57; z++) rawSet(X1 - 1, G + 1, z, SB);
  rawSet(64, G + 1, Z1 - 1, B.WATER); rawSet(69, G + 1, Z1 - 1, 20); rawSet(69, G + 2, Z1 - 1, LT);
  fill(55, 58, G + 1, G + 2, 38, 41, PL); fill(55, 56, G + 3, G + 3, 38, 39, LG);
  fill(62, 66, G + 1, G + 1, 45, 47, SB); fill(62, 66, G + 2, G + 2, 45, 47, PL);
  // UPSTAIRS: bedrooms (beds, wardrobes, rugs), a study, lights
  for (const [bx, bz] of [[12, 14], [12, 40], [58, 14], [58, 40]]) {
    fill(bx, bx + 1, F2 + 1, F2 + 1, bz, bz + 2, WR); fill(bx, bx + 1, F2 + 1, F2 + 1, bz - 1, bz - 1, WW);
    fill(bx + 6, bx + 7, F2 + 1, F2 + 3, bz - 1, bz - 1, LG); fill(bx + 3, bx + 8, F2, F2, bz + 4, bz + 8, WB);
    rawSet(bx + 4, TOP - 1, bz + 4, LT);
  }
  fill(18, 22, F2 + 1, F2 + 1, 52, 53, PL); rawSet(20, F2 + 1, 54, WR); for (let z = 47; z <= 56; z++) for (let y = F2 + 1; y <= F2 + 4; y++) rawSet(X0 + 1, y, z, z % 3 ? PL : LG);
  for (const [x, z] of [[17, 20], [17, 45], [63, 45], [63, 27]]) rawSet(x, F2 - 1, z, LT);
  // spawns: west side first, then east (teams split on order)
  spawns = [[17.5, G + 1, 29.5], [17.5, G + 1, 47.5], [13.5, F2 + 1, 26.5], [30.5, F2 + 1, 30.5], [33.5, G + 1, 24.5], [33.5, G + 1, 44.5],
            [63.5, G + 1, 28.5], [63.5, G + 1, 50.5], [66.5, F2 + 1, 26.5], [49.5, F2 + 1, 30.5], [46.5, G + 1, 24.5], [46.5, G + 1, 44.5]];
}
NEW_MAPS.house = genHouse;
ATMO.house = { bg: 0x8ab8ff, fog: 0xb4d2ff, near: 60, far: 140, sky: true, tint: 1, light: 0.9 };
(function () { const r = MENU[0].rows.find(x => x[0] === 'map'); r[3].push(['house', 'Big House (fight indoors)']); })();
buildMenu();
