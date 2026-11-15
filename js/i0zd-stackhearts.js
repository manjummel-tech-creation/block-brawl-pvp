// ================= GOLDEN HEARTS STACK =================
// Before: a golden apple SET your extra hearts to 4 (wiping a totem's 12), and when a totem's hearts timed out they
// zeroed every extra heart, apple ones included. Now they add up:
//   each golden apple adds +4 (2 hearts); a totem pop adds +12 (6 hearts) for 8 s; when the totem's time is up only ITS hearts go,
//   the apple hearts stay until damage eats them. Total extra hearts are capped at 32 (16 hearts).
const ABS_CAP = 32;
const _eatGappleStack = eatGapple;
eatGapple = function (e) {
  const it = e.held, n0 = it && it.k === 'gapple' ? it.n : -1, a0 = e.absorption || 0;
  _eatGappleStack(e);
  if (n0 > 0 && it.n < n0) e.absorption = Math.min(ABS_CAP, a0 + 4);
};
const _dieStack = die;
die = function (t, src) {
  const a0 = t.absorption || 0, tot0 = t.totems || 0;
  _dieStack(t, src);
  if (!t.dead && (t.totems || 0) < tot0) {                         // a totem popped: its hearts go ON TOP of what you had
    const gave = Math.max(0, t.absorption - 0);
    t.absorption = Math.min(ABS_CAP, a0 + gave); t._totemAmt = (t._totemAmt || 0) + gave;
  }
};
const _gameTickStack = gameTick;
gameTick = function () {
  for (const m of mobs) m._abPre = m.totemAbsUntil ? { keep: Math.max(0, m.absorption - (m._totemAmt || 0)) } : null;
  _gameTickStack();
  for (const m of mobs) if (m._abPre && !m.totemAbsUntil) { m.absorption = m._abPre.keep; m._totemAmt = 0; }   // the totem's time ran out: only ITS hearts go
};
