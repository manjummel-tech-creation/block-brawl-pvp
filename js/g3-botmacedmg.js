// ================= BOT MACE SMASHES HIT x2 =================
let _smashAttacker = null;
const _attackBotMaceDmg = attack;
attack = function (a, t, reach) {
  const prev = _smashAttacker; _smashAttacker = a;
  try { return _attackBotMaceDmg(a, t, reach); } finally { _smashAttacker = prev; }
};
const _smashTotalBot = smashTotal;
smashTotal = function (fall) { return _smashTotalBot(fall) * (_smashAttacker && !_smashAttacker.isPlayer ? 2 : 1); };
