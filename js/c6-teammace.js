// ================= TEAM FIGHT MACE =================
// In Team fight the mace smash does 1 full heart per block fallen (so a bounce-mace chain one-shots).
// Other modes keep 0.6 hearts per block.
const _smashTotalTeam = smashTotal;
smashTotal = function (fall) { return CFG.mode === 'teams' ? fall * 2 : _smashTotalTeam(fall); };
