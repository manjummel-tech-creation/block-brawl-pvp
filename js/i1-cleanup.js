// ================= SAVED SETTINGS FROM REMOVED MODES FALL BACK SAFELY =================
(function () {
  const modes = MENU[0].rows.find(x => x[0] === 'mode'), maps = MENU[0].rows.find(x => x[0] === 'map');
  if (modes && !modes[3].some(o => o[0] === CFG.mode)) CFG.mode = 'ffa';
  if (maps && !maps[3].some(o => o[0] === CFG.map)) CFG.map = 'arena';
  saveCfg(); buildMenu();
})();
