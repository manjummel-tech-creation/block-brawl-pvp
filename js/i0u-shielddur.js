// ================= SHIELDS BREAK IN DUELS / 1v1 =================
// In Duel 1v1 (and any moment when only two fighters are left alive) a shield can block 15 melee hits before it breaks for good:
//   - each sword / axe / other melee hit it blocks costs 1 durability, a mace smash costs 2, arrows cost nothing
//   - at 15 it breaks: the shield is gone (you / the bot stop being able to block) until the next life
//   - your own shield durability shows on the HUD next to the shield slot (e.g. 11/15)
// With three or more fighters alive shields stay unbreakable (an axe still disables them for 5 s).
const SHIELD_HITS = 15;
const shieldDuelOn = () => !!(game && !game.mafia && !game.over && (CFG.mode === 'duel' || mobs.filter(m => !m.dead).length === 2));
function breakShield(t, by) {
  t.shield = false; lowerShield(t); t.shieldHits = 0;
  sfx('shieldBreak', t.x, t.y, t.z);
  burst(t.x, t.y + 1.2, t.z, 18, ['#c8a060', '#8a8a8a', '#ffffff'], 3, 0.5, 0.07, 8);
  if (t === player) feed('Your shield broke!', '#ff7070'); else if (by === player) feed(`You broke ${t.name}'s shield!`, '#70ff70');
}
const _hurtShieldDur = hurt;
hurt = function (t, amount, src) {
  const b0 = t.blocks || 0;
  const r = _hurtShieldDur(t, amount, src);
  if (r === false && (t.blocks || 0) > b0 && src && src.kind === 'melee' && t.shield && shieldDuelOn()) {
    const key = (src.att ? src.att.id : -1) + ':' + tick;                     // one swing = one durability, however many times the hit code runs in that tick
    if (t._shKey === key) return r;
    t._shKey = key;
    const w = src.att && src.att.held;
    t.shieldHits = (t.shieldHits || 0) + (w && w.k === 'mace' ? 2 : 1);
    if (t.shieldHits >= SHIELD_HITS) breakShield(t, src.att);
  }
  return r;
};
const _startGameShDur = startGame;
startGame = function () { _startGameShDur(); for (const m of mobs) m.shieldHits = 0; };
G.startGame = startGame;
const _respawnShDur = respawn;
respawn = function (m) { _respawnShDur(m); m.shieldHits = 0; m.shield = m.isPlayer ? !!CFG.shield : !!CFG.botShields; };
const _drawHUDShDur = drawHUD;
drawHUD = function (a) {
  _drawHUDShDur(a);
  const p = player; if (state !== 'play' || !game || !p || p.dead || !p.shield || !shieldDuelOn()) return;
  const g = hctx, gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4), hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4, sx = hx - 29 * gs;
  const left = Math.max(0, SHIELD_HITS - (p.shieldHits || 0)), k = left / SHIELD_HITS;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(sx + gs, hy + hh - 3 * gs, hh - 2 * gs, 2 * gs);
  g.fillStyle = k > 0.5 ? '#7dff6a' : k > 0.25 ? '#ffe45a' : '#ff5a5a'; g.fillRect(sx + gs, hy + hh - 3 * gs, (hh - 2 * gs) * k, 2 * gs);
  txt(`${left}/${SHIELD_HITS}`, sx + hh / 2, hy - 14 * gs, 8 * gs, k > 0.25 ? '#ffffff' : '#ff8a8a', 'center');
};
