// ================= SIMPLE SHADER LOOK · SLIGHTLY WIDER CHARACTERS =================
// Soft sun shadows cast by blocks and players, a warmer / richer colour grade with a gentle vignette, and water
// that ripples. Toggle: Settings -> "Shaders". Automatically off in "Fast" graphics and on maps without a sun.
if (CFG.shader === undefined) CFG.shader = true; DEF.shader = true;
const SHD = { R: 44, on: false, mat: new THREE.ShadowMaterial({ opacity: 0.34, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), uT: { value: 0 } };
const SHD_DIR = new THREE.Vector3(120, 160, 60).normalize();          // same direction as the sun in the sky
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sunL.shadow.mapSize.set(2048, 2048);
sunL.shadow.camera.left = -SHD.R; sunL.shadow.camera.right = SHD.R; sunL.shadow.camera.top = SHD.R; sunL.shadow.camera.bottom = -SHD.R;
sunL.shadow.camera.near = 1; sunL.shadow.camera.far = 260; sunL.shadow.camera.updateProjectionMatrix();
sunL.shadow.bias = -0.0006; sunL.shadow.normalBias = 0.06;
scene.add(sunL.target);

// ---------- blocks: every solid chunk casts, and gets a see-through "shadow catcher" copy that receives ----------
const _toGeoShd = toGeo;
toGeo = function (g) { const geo = _toGeoShd(g); geo.computeVertexNormals(); return geo; };
const _buildChunkShd = buildChunk;
buildChunk = function (ch) {
  if (ch.ms) { scene.remove(ch.ms); ch.ms = null; }
  _buildChunkShd(ch);
  if (ch.mo) {
    ch.mo.castShadow = SHD.on;
    ch.ms = new THREE.Mesh(ch.mo.geometry, SHD.mat); ch.ms.receiveShadow = true; ch.ms.renderOrder = 1; ch.ms.visible = SHD.on;
    scene.add(ch.ms);
  }
};
const _rebuildAllShd = rebuildAll;
rebuildAll = function () { for (const ch of chunks) if (ch.ms) { scene.remove(ch.ms); ch.ms = null; } _rebuildAllShd(); };

// ---------- water ripples ----------
matW.onBeforeCompile = sh => {
  sh.uniforms.uT = SHD.uT;
  sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n if (fract(position.y) > 0.5) transformed.y += (sin(position.x * 1.3 + uT * 1.7) + cos(position.z * 1.1 + uT * 1.3)) * 0.035 - 0.02;');
};
matW.needsUpdate = true;

// ---------- colour grade + vignette (pure CSS, no extra render pass) ----------
const shdVig = document.createElement('div');
shdVig.style.cssText = 'position:fixed;inset:0;pointer-events:none;display:none;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(10,6,0,.34) 100%)';
document.body.insertBefore(shdVig, document.querySelector('#hud'));

function applyShader() {
  const sky = typeof skyDome === 'undefined' || skyDome.visible;
  const on = !!CFG.shader && CFG.gfx !== 'fast' && sky;
  SHD.on = on;
  sunL.castShadow = on;
  for (const ch of chunks) { if (ch.mo) ch.mo.castShadow = on; if (ch.ms) ch.ms.visible = on; }
  const grade = !!CFG.shader && CFG.gfx !== 'fast';
  document.querySelector('#gl').style.filter = grade ? 'saturate(1.22) contrast(1.07) brightness(1.03) sepia(0.06)' : '';
  shdVig.style.display = grade ? 'block' : 'none';
  SHD.mat.opacity = (CFG.map === 'house') ? 0.2 : 0.34;      // indoors: lighter, so rooms don't go gloomy
}
const _startGameShd = startGame;
startGame = function () { _startGameShd(); applyShader(); };
G.startGame = startGame;
const _buildMenuShd = buildMenu;
buildMenu = function () { _buildMenuShd(); applyShader(); };

// ---------- per frame: the shadow box follows you, players cast shadows, characters are a touch wider ----------
const _updateModelsShd = updateModels;
updateModels = function (alpha) {
  _updateModelsShd(alpha);
  SHD.uT.value = performance.now() / 1000;
  for (const m of mobs) {
    const pr = m.parts; if (!pr) continue;
    if (!pr._wide) { pr._wide = true; pr.body.scale.set(1.12, 1, 1.12); }
    if (pr._shd !== SHD.on) { pr._shd = SHD.on; pr.body.traverse(o => { if (o.isMesh) o.castShadow = SHD.on; }); }
  }
  if (!SHD.on) return;
  // centre the shadow box a little ahead of the camera, snapped to whole blocks so shadows don't shimmer
  const c = camera.position, tx = Math.round(c.x), ty = Math.round(c.y) - 4, tz = Math.round(c.z);
  sunL.target.position.set(tx, ty, tz);
  sunL.position.set(tx + SHD_DIR.x * 120, ty + SHD_DIR.y * 120, tz + SHD_DIR.z * 120);
  sunL.target.updateMatrixWorld();
};
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'gfx'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['shader', 'Shaders (sun shadows, richer colours, rippling water)', 'tg']); break; } }
})();
buildMenu();
try { rebuildAll(); } catch (e) {}
