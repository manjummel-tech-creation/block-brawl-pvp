// ================= YOUR INVENTORY LAYOUT IS REMEMBERED =================
// Wherever you put things (hotbar + backpack), the next game starts with them in the same slots — every mode,
// and also after a Mafia kit swap. Saved in this browser.
const LAYOUT_KEY = 'bbInvLayout';
const layoutKey = it => it && !(it.n !== undefined && it.n <= 0) ? it.k + (it.id !== undefined ? ':' + it.id : '') : '';
function loadLayout() { try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); } catch (e) { return null; } }
function saveLayout(p) {
  if (!p || !p.inv) return;
  const keys = [...p.inv, ...(p.bag || new Array(27).fill(null))].map(layoutKey);
  if (!keys.some(Boolean)) return;
  const s = JSON.stringify(keys); if (s === saveLayout._last) return; saveLayout._last = s;
  try { localStorage.setItem(LAYOUT_KEY, s); } catch (e) {}
}
function applyLayout(p) {
  const L = loadLayout(); if (!L || !p || !p.inv) return;
  if (!p.bag) p.bag = new Array(27).fill(null);
  const all = [...p.inv, ...p.bag], pool = all.filter(Boolean), out = new Array(36).fill(null);
  L.forEach((k, i) => { if (!k || i >= 36) return; const j = pool.findIndex(it => layoutKey(it) === k); if (j >= 0) { out[i] = pool[j]; pool.splice(j, 1); } });
  for (const it of pool) { const j = out.findIndex((s, i) => !s && (i < 9 || true)); if (j >= 0) out[j] = it; }
  p.inv = out.slice(0, 9); p.bag = out.slice(9, 36);
  p.sel = -1; p.select(0); setHeldVisual(p);
  p.kitProto = JSON.parse(JSON.stringify({ inv: p.inv, arrows: p.arrows }));
  saveLayout._last = JSON.stringify(out.map(layoutKey));
}
const _startGameLayout = startGame;
startGame = function () { _startGameLayout(); if (game && player) applyLayout(player); };
G.startGame = startGame;
if (typeof applyKit === 'function') { const _applyKitLayout = applyKit; applyKit = function (rk, fresh) { _applyKitLayout(rk, fresh); applyLayout(player); }; }
const _gameTickLayout = gameTick;
gameTick = function () { const t0 = tick; _gameTickLayout(); if (tick !== t0 && tick % 40 === 0 && player && !player.dead) saveLayout(player); };
