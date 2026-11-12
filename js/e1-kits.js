// ================= KIT GAME MODES + REAL MACE HEIGHT =================

// ---------- mace: count the real height you dropped from ----------
// A smash connects 2-3 blocks above the target's feet (that's your reach), so fallDistance alone
// under-counted big drops (15 blocks only counted ~12). Now the drop is measured from the highest
// point you reached down to the target's feet.
function groundBelowY(m) { for (let y = Math.floor(m.y); y > Math.floor(m.y) - 60; y--) if (isSolid(getB(m.x, y - 1, m.z))) return y; return m.y - 60; }
function maceHeight(m) { return Math.max(m.fallDistance, (m.apexY !== undefined ? m.apexY : m.y) - groundBelowY(m)); }
const _gameTickApex = gameTick;
gameTick = function () {
  _gameTickApex();
  for (const m of mobs) { if (m.dead || m.onGround || m.inWater || m.apexY === undefined) m.apexY = m.y; else if (m.y > m.apexY) m.apexY = m.y; }
};
const _attackMaceHeight = attack;
attack = function (a, t, reach) {
  if (a.held && a.held.k === 'mace' && !a.onGround && a.vy < 0) {
    const drop = Math.max(a.fallDistance, (a.apexY !== undefined ? a.apexY : a.y) - t.y);
    if (drop > a.fallDistance) a.fallDistance = drop;
  }
  const r = _attackMaceHeight(a, t, reach);
  if (r) a.apexY = a.y;
  return r;
};

// ---------- kit / game modes ----------
// Each mode overrides the kit for you AND the bots for that match (your custom settings are left untouched).
const OFF = { bow: false, arrows: 0, gapples: 0, blocks: 0, webs: 0, pick: false, bucket: false, mace: false, windCharges: 0, shield: false, kitAxe: false,
  totems: 0, pots: 0, strPots: 0, botGapples: 0, botWebs: 0, botPots: 0, botStrPots: 0, botTotems: 0, botItems: false, botShields: false, botBuild: false,
  botArmor: 'same', botWeapon: 'same' };
const KIT_MODES = {
  custom: { n: 'Custom (your settings)' },
  sword: { n: 'Sword', d: 'Diamond sword + diamond armour. Pure aim, spacing and crits.',
    set: Object.assign({}, OFF, { wtype: 'sword', tier: 'diamond', sharp: 1, armor: 'diamond', prot: 2 }) },
  webs: { n: 'Cobweb', d: 'Sword, bow, cobwebs, water bucket, blocks, golden apples — web traps & bucket clutches.',
    set: Object.assign({}, OFF, { wtype: 'sword', tier: 'diamond', sharp: 1, armor: 'diamond', prot: 2, bow: true, arrows: 12, gapples: 3, webs: 12, bucket: true, blocks: 64, pick: true,
      botGapples: 3, botWebs: 8, botItems: true, botBuild: true }) },
  mace: { n: 'Mace', d: 'Netherite sword, mace, wind charges, shield + axe, golden apples, a totem.',
    set: Object.assign({}, OFF, { wtype: 'sword', tier: 'netherite', sharp: 2, armor: 'netherite', prot: 3, mace: true, windCharges: 16, shield: true, kitAxe: true, gapples: 4, totems: 1,
      botGapples: 4, botTotems: 1, botShields: true, botItems: true }) },
  axe: { n: 'Axe & Shield', d: 'Diamond axe + shield. Break shields, punish openings.',
    set: Object.assign({}, OFF, { wtype: 'axe', tier: 'diamond', sharp: 1, armor: 'diamond', prot: 2, shield: true, botShields: true }) },
  pot: { n: 'Pot PvP', d: 'Sharp sword, 8 healing pots (Y), 2 strength pots (U). No golden apples.',
    set: Object.assign({}, OFF, { wtype: 'sword', tier: 'diamond', sharp: 3, armor: 'diamond', prot: 2, pots: 8, strPots: 2, botPots: 8, botStrPots: 2 }) },
  uhc: { n: 'UHC', d: 'Natural regen OFF. Sword, bow, axe + shield, blocks, water, 6 golden apples.',
    set: Object.assign({}, OFF, { wtype: 'sword', tier: 'diamond', sharp: 2, armor: 'diamond', prot: 2, bow: true, arrows: 16, gapples: 6, blocks: 64, pick: true, bucket: true, shield: true, kitAxe: true,
      noRegen: true, botGapples: 6, botItems: true, botShields: true, botBuild: true }) },
  smp: { n: 'Full SMP kit', d: 'Everything: netherite, mace, wind charges, webs, pots, totems, shields.',
    set: Object.assign({}, OFF, { wtype: 'sword', tier: 'netherite', sharp: 3, armor: 'netherite', prot: 4, bow: true, arrows: 16, gapples: 4, blocks: 64, webs: 8, pick: true, bucket: true,
      mace: true, windCharges: 8, shield: true, kitAxe: true, totems: 1, pots: 2, strPots: 1,
      botGapples: 4, botWebs: 4, botPots: 2, botStrPots: 1, botTotems: 1, botItems: true, botShields: true, botBuild: true }) }
};
if (CFG.kitMode === undefined) CFG.kitMode = 'custom'; DEF.kitMode = 'custom';
const _startGameKit = startGame;
startGame = function () {
  const mode = KIT_MODES[CFG.kitMode];
  if (!mode || !mode.set) return _startGameKit();
  const saved = {}; for (const k in mode.set) saved[k] = CFG[k];
  Object.assign(CFG, mode.set);
  try { _startGameKit(); }
  finally { for (const k in saved) { if (saved[k] === undefined) delete CFG[k]; else CFG[k] = saved[k]; } }
  if (game) game.noRegen = !!mode.set.noRegen;
  feed(`Game mode: ${mode.n}`, '#ffff70');
};
G.startGame = startGame;
// UHC: no natural regeneration (golden apples / potions / totems still heal)
const _tickHealthKit = tickHealth;
tickHealth = function (e) {
  if (game && game.noRegen && !e.dead) { if (e.regenFx > 0) { e.regenFx--; if (e.regenFx % 25 === 0) e.health = Math.min(20, e.health + 1); } return; }
  _tickHealthKit(e);
};
(function () {
  const rows = MENU[0].rows, i = rows.findIndex(x => x[0] === 'mode');
  rows.splice(i + 1, 0, ['kitMode', 'Game mode / kit (for duels & fights)', 'ch', Object.entries(KIT_MODES).map(([k, v]) => [k, v.n])]);
})();
const _buildMenuKit = buildMenu;
buildMenu = function () {
  _buildMenuKit();
  const row = [...document.querySelectorAll('#cols .row')].find(r => r.querySelector('label') && r.querySelector('label').textContent.startsWith('Game mode / kit'));
  if (!row) return;
  const m = KIT_MODES[CFG.kitMode];
  const d = document.createElement('div'); d.style.cssText = 'width:100%;font-size:19px;color:#ffff70';
  d.textContent = m && m.d ? m.d + ' (overrides "Your kit" and bot kit for the match)' : 'Uses everything you set in "Your kit" and "Bots & settings".';
  row.appendChild(d);
};
buildMenu();
