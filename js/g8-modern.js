// ================= MODERN LOOK: new block textures + modern UI =================

// ---------- block textures (modern-MC style: limited palettes, structured, tileable) ----------
(function () {
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
  const P = a => a.map(hex);
  // tileable smooth value-noise field 16x16 in [0,1]
  function field(seed, cells) {
    srand(seed); const g = []; for (let i = 0; i < cells * cells; i++) g.push(rnd());
    const at = (x, y) => g[((y % cells + cells) % cells) * cells + ((x % cells + cells) % cells)];
    const f = []; const s = 16 / cells;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      f.push((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
    }
    return f;
  }
  const quant = (v, pal) => pal[Math.min(pal.length - 1, Math.floor(v * pal.length))];
  function mix(seed, cellsA, cellsB, wB) { const a = field(seed, cellsA), b = field(seed + 77, cellsB); return a.map((v, i) => clamp(v * (1 - wB) + b[i] * wB, 0, 0.9999)); }

  const GRASS = P(['#4d8a2f', '#5b9c37', '#67ab40', '#73b84a', '#82c656']);
  const DIRT = P(['#6b4a30', '#79553a', '#866143', '#936c4b', '#a07b57']);
  const STONE = P(['#6c6c6c', '#777777', '#828282', '#8c8c8c', '#979797']);
  const SAND = P(['#cfc08c', '#d8ca98', '#e0d3a4', '#e8dcb0']);
  // grass top: soft patches + short blade highlights
  { const f = mix(11, 4, 8, 0.45); srand(12); const blades = new Set(); for (let i = 0; i < 22; i++) blades.add(((rnd() * 16) | 0) + ((rnd() * 16) | 0) * 16);
    makeTile(T.GRASS_TOP, (x, y) => { const i = y * 16 + x; return blades.has(i) ? GRASS[4] : blades.has(i - 16) ? GRASS[3] : quant(f[i] * 0.85, GRASS); }); }
  // dirt: clumpy with little pebbles
  { const f = mix(21, 4, 16, 0.35); srand(22); const peb = new Set(); for (let i = 0; i < 7; i++) { const x = (rnd() * 15) | 0, y = (rnd() * 15) | 0; peb.add(x + y * 16); peb.add(x + 1 + y * 16); }
    makeTile(T.DIRT, (x, y) => { const i = y * 16 + x; return peb.has(i) ? DIRT[4] : peb.has(i - 1) ? DIRT[0] : quant(f[i] * 0.8, DIRT); }); }
  // grass side: dirt with a wavy grass lip and a shadow line under it
  { const f = mix(21, 4, 16, 0.35); srand(31); const lip = []; for (let x = 0; x < 16; x++) lip[x] = 3 + ((rnd() * 2.2) | 0) + (x % 5 === 2 ? 1 : 0);
    makeTile(T.GRASS_SIDE, (x, y) => y < lip[x] ? (y === lip[x] - 1 ? GRASS[1] : quant(0.4 + 0.5 * rnd(), GRASS)) : y === lip[x] ? DIRT[0] : quant(f[y * 16 + x] * 0.8, DIRT)); }
  // stone: smooth tonal patches with a few darker streaks
  { const f = mix(41, 4, 8, 0.4); srand(42); const st = new Set(); for (let i = 0; i < 5; i++) { const x = (rnd() * 14) | 0, y = (rnd() * 16) | 0, L = 2 + ((rnd() * 4) | 0); for (let k = 0; k < L; k++) st.add(((x + k) % 16) + y * 16); }
    makeTile(T.STONE, (x, y) => st.has(y * 16 + x) ? STONE[0] : quant(f[y * 16 + x], STONE)); }
  // cobblestone: rounded stones with highlight / shadow and dark mortar
  { srand(51); const pts = []; for (let i = 0; i < 10; i++) pts.push([rnd() * 16, rnd() * 16, (rnd() * 3) | 0]);
    const C = P(['#5f5f5f', '#7a7a7a', '#8e8e8e', '#a5a5a5', '#454545']);
    makeTile(T.COBBLE, (x, y) => {
      let d1 = 1e9, d2 = 1e9, best = null;
      for (const p of pts) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) { const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy); if (d < d1) { d2 = d1; d1 = d; best = [p[0] + ox, p[1] + oy, p[2]]; } else if (d < d2) d2 = d; }
      if (d2 - d1 < 1.1) return C[4];
      const lx = x + 0.5 - best[0], ly = y + 0.5 - best[1];
      return (lx + ly < -1.6) ? C[3] : (lx + ly > 1.8) ? C[0] : C[1 + (best[2] > 1 ? 1 : 0)];
    }); }
  // oak planks: 4 boards, grain, seams
  { const W2 = P(['#7a5a32', '#9a7444', '#a98251', '#b58e5c', '#c29a68']); srand(61); const off = [3, 11, 6, 13];
    makeTile(T.PLANKS, (x, y) => { const b = y >> 2, r = y & 3;
      if (r === 3) return W2[0];
      if (x === off[b]) return W2[0];
      const grain = ((x * 3 + b * 5 + r * 7) % 9) === 0; return grain ? W2[1] : r === 0 ? W2[4] : W2[2 + ((x + b) % 2)]; }); }
  // oak log side: bark ridges
  { const B2 = P(['#4a3620', '#5c4429', '#6d5233', '#7c5e3b']); srand(71); const ridge = []; for (let x = 0; x < 16; x++) ridge[x] = rnd();
    makeTile(T.LOG, (x, y) => { const v = ridge[x]; const k = ((y + (v * 16 | 0)) % 6 === 0); return k ? B2[0] : v < 0.3 ? B2[1] : v < 0.7 ? B2[2] : B2[3]; }); }
  { const R2 = P(['#5c4429', '#b48c58', '#c39c66', '#a47d4b']);
    makeTile(T.LOG_TOP, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (d > 6.6) return R2[0]; return [R2[1], R2[2], R2[3]][Math.floor(d) % 3]; }); }
  // leaves: layered greens with see-through gaps in clusters
  { const L2 = P(['#2f6b1e', '#3b7d26', '#4a8f30', '#5aa03b']); const f = field(81, 8); srand(82);
    makeTile(T.LEAVES, (x, y) => { const v = f[y * 16 + x]; if (v < 0.22 && rnd() < 0.85) return [0, 0, 0, 0]; return quant(v, L2); }); }
  // sand
  { const f = mix(91, 8, 16, 0.5); makeTile(T.SAND, (x, y) => quant(f[y * 16 + x] * 0.95, SAND)); }
  // stone bricks: bevelled bricks
  { const S2 = P(['#5a5a5a', '#727272', '#7f7f7f', '#8c8c8c', '#9a9a9a']); const f = field(101, 8);
    makeTile(T.BRICK, (x, y) => { const row = y < 8 ? 0 : 1, bx = (x + (row ? 8 : 0)) % 16, ly = y % 8, lx = bx % 16;
      if (ly === 7 || (lx === 0)) return S2[0];
      if (ly === 0 || lx === 1) return S2[4];
      if (ly === 6 || lx === 15) return S2[1];
      return quant(0.25 + f[y * 16 + x] * 0.5, S2); }); }
  // wool: woven
  const wool = (base) => { const c = hex(base); return (x, y) => { const k = ((x + y) % 4 === 0) ? 0.86 : ((x - y + 16) % 4 === 0) ? 1.08 : 1; return [c[0] * k, c[1] * k, c[2] * k, 255]; }; };
  makeTile(T.WOOL_R, wool('#b02e26')); makeTile(T.WOOL_B, wool('#3c44aa')); makeTile(T.WOOL_W, wool('#e9ecec'));
  // bedrock / obsidian
  { const f = field(111, 8); const Bd = P(['#1f1f1f', '#3a3a3a', '#575757', '#7a7a7a']); makeTile(T.BEDROCK, (x, y) => quant(f[y * 16 + x], Bd)); }
  { const f = mix(121, 4, 16, 0.5); const O = P(['#0f0a18', '#1a1028', '#25173a', '#3b2457']); makeTile(T.OBSIDIAN, (x, y) => quant(f[y * 16 + x] * 0.9, O)); }
  atlasTex.needsUpdate = true;
  for (const k in iconCache) if (k.startsWith('block')) delete iconCache[k];
  rebuildAll();
})();
// brighter, cleaner modern lighting
scene.background.setHex(0x78a7ff);
for (const m of [matO, matX]) m.color.setScalar(1.04);

// ---------- modern UI ----------
(function () {
  const lk = document.createElement('link'); lk.rel = 'stylesheet';
  lk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'; document.head.appendChild(lk);
  const st = document.createElement('style');
  st.textContent = `
  :root{--glass:rgba(15,18,28,.72);--glass2:rgba(255,255,255,.06);--line:rgba(255,255,255,.09);--txt:#e5e7eb;--mut:#94a3b8;--acc1:#22c55e;--acc2:#3b82f6;--grad:linear-gradient(135deg,#22c55e,#3b82f6)}
  #menu,#pause,#end,#dead,#feed,#center,#tinfo,#score,#lockhint,#prep,#replayUI,.help,.sub{font-family:Inter,system-ui,sans-serif}
  #menu{background:radial-gradient(1200px 600px at 50% -10%,rgba(59,130,246,.25),transparent 60%),radial-gradient(900px 500px at 90% 110%,rgba(34,197,94,.18),transparent 60%),rgba(3,7,18,.62);backdrop-filter:blur(2px);padding:26px 16px 120px}
  .title{font-family:Inter,system-ui,-apple-system,sans-serif;font-weight:900;font-size:58px;letter-spacing:-2px;color:#fff;text-shadow:0 6px 30px rgba(59,130,246,.35);margin-top:4px}
  .title span{font-size:16px;font-weight:800;letter-spacing:2px;transform:none;vertical-align:middle;background:var(--grad);color:#fff;padding:6px 12px;border-radius:999px;text-shadow:none;margin-left:12px}
  .sub{color:var(--mut)!important;text-shadow:none!important;font-size:15px!important;font-weight:500;margin:6px 0 18px}
  #mTabs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:0 0 16px;padding:6px;background:var(--glass);border:1px solid var(--line);border-radius:14px;backdrop-filter:blur(14px)}
  #mTabs button{font:600 14px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--mut);background:transparent;border:0;padding:9px 16px;border-radius:10px;cursor:pointer;transition:.15s}
  #mTabs button:hover{color:#fff;background:var(--glass2)}#mTabs button.on{color:#fff;background:var(--grad);box-shadow:0 6px 18px rgba(59,130,246,.3)}
  #cols{max-width:760px}
  .panel{background:var(--glass);border:1px solid var(--line);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);backdrop-filter:blur(16px);padding:18px 20px;max-width:760px;flex:1 1 100%}
  .panel h2{font:800 13px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#cbd5e1;border:0;margin:0 0 10px}
  .panel h2 span{text-transform:none;letter-spacing:0;font-weight:500;color:var(--mut)!important;font-size:13px!important}
  .row{margin:12px 0;gap:8px}.row label{font:600 13px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--mut);letter-spacing:.2px}.row .val{color:#fff;background:var(--glass2);padding:1px 8px;border-radius:999px;margin-left:8px;font-size:12px}
  .mc{font:600 13px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--txt);background:var(--glass2);border:1px solid var(--line);border-radius:10px;box-shadow:none;text-shadow:none;padding:7px 13px;min-height:34px;transition:background .15s,transform .1s}
  .mc:hover{background:rgba(255,255,255,.12);color:#fff}.mc:active{transform:scale(.97)}
  .mc.on{background:var(--grad);border-color:transparent;color:#fff;box-shadow:0 6px 16px rgba(34,197,94,.25)}
  .mc:disabled{opacity:.4}
  #play.mc.big,#play{position:sticky;bottom:18px;font:800 18px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.5px;padding:16px 70px;border-radius:14px;background:var(--grad);border:0;color:#fff;box-shadow:0 12px 34px rgba(59,130,246,.45);z-index:3;margin-top:20px}
  #play:hover{filter:brightness(1.08)}
  #play{position:fixed!important;left:50%;transform:translateX(-50%);bottom:22px!important;margin:0!important}
  .row > div[style*="ffff70"],.row > div[style*="#ffff70"]{font-size:13px!important;color:#86efac!important;font-weight:600}
  #netStatus{font-size:14px!important;color:#cbd5e1}#netPlayers{font-size:14px!important;color:var(--mut)}
  input[type=range]{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:rgba(255,255,255,.12);outline:none}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(59,130,246,.35);cursor:pointer}
  .mcin,.mcsel{font:500 14px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;background:rgba(0,0,0,.35)!important;color:#fff!important;border:1px solid var(--line)!important;border-radius:10px!important;box-shadow:none!important;padding:7px 10px!important;min-height:34px}
  .bcard{background:rgba(255,255,255,.04)!important;border:1px solid var(--line)!important;border-radius:12px;padding:8px!important}
  .help{color:var(--mut)!important;font-size:13px!important;line-height:1.6!important}
  #pause,#end,#dead{background:rgba(3,7,18,.72)!important;backdrop-filter:blur(10px)}
  .scr h1{font:900 54px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:-1.5px;text-shadow:0 8px 30px rgba(0,0,0,.4)}
  #pause .mc,#end .mc,#dead .mc{font:700 16px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;min-height:50px;border-radius:14px}
  #end #again,#dead #deadRestart,#pause #resume{background:var(--grad);border:0}
  #endStats,#score{background:var(--glass)!important;border:1px solid var(--line);border-radius:16px;font:500 15px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;backdrop-filter:blur(14px)}
  #endStats th,#score th{color:var(--mut)!important;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:1px}
  #endStats td,#score td{padding:6px 12px!important}
  #feed div{background:rgba(10,12,20,.62)!important;border:1px solid var(--line);border-radius:999px;padding:5px 14px!important;font:600 13px Inter,system-ui,-apple-system,'Segoe UI',sans-serif;text-shadow:none!important;backdrop-filter:blur(8px);margin-bottom:6px!important}
  #center{font:900 68px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;letter-spacing:-2px;text-shadow:0 10px 40px rgba(0,0,0,.5)!important}
  #center small{font:600 18px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;letter-spacing:0;color:#e5e7eb!important;opacity:.9}
  #tinfo{font:700 14px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;background:rgba(10,12,20,.6);padding:8px 14px;border-radius:12px;border:1px solid var(--line);text-shadow:none!important}
  #tinfo:empty{display:none}
  #dbg{font:600 12px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;line-height:1.55!important;text-shadow:0 1px 2px #000!important;background:rgba(10,12,20,.45);padding:8px 12px;border-radius:12px;border:1px solid var(--line)}
  #dbg:empty{display:none}
  #lockhint{font:600 15px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important;background:rgba(10,12,20,.75)!important;border:1px solid var(--line);border-radius:999px!important;padding:10px 20px!important}
  #prep{background:rgba(3,7,18,.7)!important;backdrop-filter:blur(8px)}#prep h1{font:900 44px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important}#prep .t{font:700 18px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important}
  #prepBar{border-radius:14px!important;border:1px solid var(--line)!important;background:rgba(255,255,255,.06)!important;box-shadow:none!important;padding:10px!important;gap:8px!important}
  .pslot{border-radius:10px!important;background:rgba(0,0,0,.35)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)!important}
  .pslot.sel{outline:2px solid #3b82f6!important}
  #replayUI{font-family:Inter,system-ui,-apple-system,sans-serif!important}#replayUI .mc{font:600 13px Inter,system-ui,-apple-system,'Segoe UI',sans-serif!important}
  `;
  document.head.appendChild(st);
})();
// tabs: show one settings page at a time
let menuTab = (() => { try { return localStorage.getItem('bb_tab') || 'Match'; } catch (e) { return 'Match'; } })();
const _buildMenuModern = buildMenu;
buildMenu = function () {
  _buildMenuModern();
  const cols = $('#cols'); if (!cols) return;
  const panels = [...cols.children].filter(p => p.classList.contains('panel'));
  const name = p => { const h = p.querySelector('h2'); return h ? (h.childNodes[0].textContent || '').trim() : '?'; };
  const names = panels.map(name);
  if (!names.includes(menuTab)) menuTab = names.includes('Match') ? 'Match' : names[0];
  let bar = $('#mTabs');
  if (!bar) { bar = document.createElement('div'); bar.id = 'mTabs'; cols.parentNode.insertBefore(bar, cols); }
  bar.innerHTML = '';
  names.forEach(n => {
    const b = document.createElement('button'); b.textContent = n; if (n === menuTab) b.className = 'on';
    b.onclick = () => { menuTab = n; try { localStorage.setItem('bb_tab', n); } catch (e) {} buildMenu(); };
    bar.appendChild(b);
  });
  panels.forEach((p, i) => { p.style.display = names[i] === menuTab ? '' : 'none'; });
};
buildMenu();
