// ================= FRIENDLY FIRE =================
// With friendly fire on (default) you can hit, shoot and kill your own teammates. Team kills don't score.
if (CFG.friendlyFire === undefined) CFG.friendlyFire = true; DEF.friendlyFire = true;
const _hurtFF = hurt;
hurt = function (t, amount, src) {
  const a = src && src.att;
  if (CFG.friendlyFire && a && a !== t && a.team === t.team) {
    const keep = a.team; a.team = '__ff_' + a.id;
    try { return _hurtFF(t, amount, src); } finally { a.team = keep; }
  }
  return _hurtFF(t, amount, src);
};
// you can target teammates with your crosshair (bots still only go after enemies)
const _pickEntityFF = pickEntity;
pickEntity = function (e, reach, dir) {
  if (!CFG.friendlyFire || e !== player || CFG.mode !== 'teams') return _pickEntityFF(e, reach, dir);
  const keep = e.team; e.team = '__ff_self';
  try { return _pickEntityFF(e, reach, dir); } finally { e.team = keep; }
};
// team kills don't count as kills
const _dieFF = die;
die = function (t, src) {
  const k = src && src.att, before = k ? k.kills : 0;
  _dieFF(t, src);
  if (t.dead && k && k !== t && k.team === t.team && k.kills > before) { k.kills--; feed(`(team kill — doesn't count)`, '#ff9a5a'); }
};
(function () {
  const rows = MENU[0].rows, i = rows.findIndex(x => x[0] === 'mode');
  rows.splice(i + 1, 0, ['friendlyFire', 'Friendly fire (you can hit your own teammates)', 'tg']);
})();
buildMenu();
