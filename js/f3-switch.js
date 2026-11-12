// ================= SWITCHING ITEMS KEEPS YOUR ATTACK CHARGE =================
// Swapping to cobwebs / blocks / anything and back no longer empties the attack bar,
// so sword -> cobweb -> sword lets you hit straight away if the bar was already charged.
const _selectKeep = Mob.prototype.select;
Mob.prototype.select = function (i) {
  const keep = this.ticksSinceSwing;
  _selectKeep.call(this, i);
  this.ticksSinceSwing = keep;
};
