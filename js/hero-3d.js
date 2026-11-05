(function(){
  if(typeof THREE === 'undefined') return;

  var canvas = document.getElementById('hero-3d');
  var host = canvas && canvas.closest('.hero-visual');
  if(!canvas || !host) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  }catch(e){ return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);

  var group = new THREE.Group();
  scene.add(group);

  var coreGeo = new THREE.TorusKnotGeometry(1.05, 0.34, 140, 20, 2, 3);
  var coreMat = new THREE.MeshStandardMaterial({
    color: 0x6366F1, metalness: 0.38, roughness: 0.3, transparent: true, opacity: 0.94
  });
  var core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  var shellGeo = new THREE.IcosahedronGeometry(2.2, 1);
  var shellMat = new THREE.MeshBasicMaterial({
    color: 0x10B981, wireframe: true, transparent: true, opacity: 0.4
  });
  var shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 4, 5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  function readVar(name, fallback){
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function setColors(){
    coreMat.color.set(readVar('--accent', '#6366F1'));
    shellMat.color.set(readVar('--accent-2', '#10B981'));
  }
  setColors();

  function resize(){
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if('ResizeObserver' in window){
    new ResizeObserver(resize).observe(canvas);
  }else{
    window.addEventListener('resize', resize);
  }

  var target = { x: 0, y: 0 };
  if(!reduced){
    host.addEventListener('mousemove', function(e){
      var r = host.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width - 0.5;
      target.y = (e.clientY - r.top) / r.height - 0.5;
    });
    host.addEventListener('mouseleave', function(){ target.x = 0; target.y = 0; });
  }

  function render(){
    renderer.render(scene, camera);
  }

  if(reduced){
    render();
  }else{
    (function loop(){
      group.rotation.y += 0.0032;
      group.rotation.x += (target.y * 0.5 - group.rotation.x) * 0.04;
      group.rotation.z += (target.x * -0.3 - group.rotation.z) * 0.04;
      core.rotation.x += 0.006;
      core.rotation.y -= 0.004;
      shell.rotation.y -= 0.0016;
      render();
      requestAnimationFrame(loop);
    })();
  }

  window.__vinthraHero3D = { setColor: function(){ setColors(); if(reduced) render(); } };
})();
