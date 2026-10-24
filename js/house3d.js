// 우리 가족의 집: 기록(summary)에 따라 소품이 바뀌는 로우폴리 3D 디오라마.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createHouse(canvas, host, { mobile, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(.4, .7, 1.4);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 11; controls.maxDistance = 36;
  controls.minPolarAngle = .5; controls.maxPolarAngle = 1.2;
  controls.minAzimuthAngle = -.35; controls.maxAzimuthAngle = 1.9;
  controls.autoRotate = !reduced; controls.autoRotateSpeed = .35;
  { const r = mobile ? 29 : 25, ph = .95, az = .7, t = controls.target;
    camera.position.set(t.x + r * Math.sin(ph) * Math.sin(az), t.y + r * Math.cos(ph), t.z + r * Math.sin(ph) * Math.cos(az)); }
  let resumeAt = 0;
  controls.addEventListener('start', () => { controls.autoRotate = false; resumeAt = Infinity; });
  controls.addEventListener('end', () => { resumeAt = performance.now() + 4000; });

  const hemi = new THREE.HemisphereLight(0xe8f3ff, 0x8aa07f, 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4); sun.castShadow = !mobile;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 60 });
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
  scene.add(sun); scene.add(sun.target);

  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .88, metalness: 0, flatShading: true }, o));
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: new THREE.Color(c), emissiveIntensity: i });
  function add(parent, geo, mat, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    m.castShadow = shadow && !mobile; m.receiveShadow = !mobile; parent.add(m); return m;
  }
  const props = [];
  function prop(o, base = 1) { o.userData.base = base; o.userData.on = false; o.scale.setScalar(.0001); o.visible = false; props.push(o); return o; }
  function setOn(o, on, base) { if (base !== undefined) o.userData.base = base; o.userData.on = on; }
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function makeTree(parent) {
    const g = new THREE.Group(); parent.add(g);
    add(g, new THREE.CylinderGeometry(.12, .2, 1.6, 7), M('#7a5639'), 0, .8, 0);
    add(g, new THREE.IcosahedronGeometry(.95, 1), M('#5f9e5a'), 0, 2.05, 0);
    add(g, new THREE.IcosahedronGeometry(.7, 1), M('#6fae62'), -.6, 1.75, .2);
    add(g, new THREE.IcosahedronGeometry(.65, 1), M('#558f50'), .6, 1.85, -.15);
    const fm = M('#e8754f', { flatShading: false, roughness: .45 });
    const dirs = [[.6, .5, .62], [-.5, .3, .8], [.1, .9, .45], [.85, -.1, .5], [-.8, .2, .4], [.3, .2, .93], [-.2, -.25, .95], [.7, .6, -.2], [-.6, .6, .3], [.05, .55, .83]];
    const fruits = dirs.map(([x, y, z]) => { const v = new THREE.Vector3(x, y, z).normalize(); return prop(add(g, new THREE.SphereGeometry(.12, 10, 8), fm, v.x, 2.05 + v.y, v.z)); });
    return { g, fruits };
  }
  function flagTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#d9962b'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#fff';
    x.font = '700 46px "Gowun Batang", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('30일 완주', 128, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  const world = new THREE.Group(); scene.add(world);
  let W = null, buildKey = '';

  function build(home) {
    props.length = 0; world.clear();
    const apt = home.type === 'apt', R = { apt }; W = R;
    const H = 2.6, h2 = 1.25;
    if (!apt) {
      add(world, new THREE.CylinderGeometry(13.5, 14, .6, 40), M('#8fbf7a'), 0, -.32, 0, false);
      add(world, B(10.5, .3, 8.5), M('#d9cbb5'), 0, -.12, 0);
      [[-8.5, -3], [8.6, -2.4], [-8, 3.4], [9.6, 1.6], [-3, -7.6], [4, -7.4], [-9.8, -.2]].forEach(([x, z], i) =>
        add(world, new THREE.IcosahedronGeometry(.55 + (i % 3) * .18, 0), M(i % 2 ? '#6aa35c' : '#5b934f'), x, .35, z));
      for (let i = 0; i < 5; i++) add(world, new THREE.CylinderGeometry(.42, .46, .06, 8), M('#bdb3a2'), (i % 2 ? .25 : -.25), .02, 4.6 + i * .95, false);
    } else {
      add(world, B(10.5, .4, 8.5), M('#c9c9c4'), 0, -.2, 0);
      add(world, B(10.5, .25, 2.4), M('#c9c9c4'), 0, -.12, 5.4);
      add(world, B(10.4, .9, .05), new THREE.MeshStandardMaterial({ color: '#bfe0ea', transparent: true, opacity: .35, roughness: .1 }), 0, .45, 6.55, false);
      add(world, B(10.5, .06, .1), M('#9aa0a6'), 0, .92, 6.55);
      const ghostM = new THREE.MeshBasicMaterial({ color: '#dfe6ee', transparent: true, opacity: .07, depthWrite: false });
      const edgeM = new THREE.LineBasicMaterial({ color: '#aab4c0', transparent: true, opacity: .35 });
      [[0, 4.25, 0], [0, -1.65, 0], [10.7, 1.3, 0], [10.7, 4.25, 0], [10.7, -1.65, 0]].forEach(([x, y, z]) => {
        const g = B(10.5, 2.9, 8.5); const m = new THREE.Mesh(g, ghostM); m.position.set(x, y, z); world.add(m);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeM); e.position.set(x, y, z); world.add(e);
      });
    }
    // floors
    const tint = new THREE.Color(home.theme).lerp(new THREE.Color('#ffffff'), .35);
    add(world, B(6, .06, 4), M('#d6b289'), -2, .03, 2, false);
    add(world, B(4, .06, 4), M('#ebe5d8'), 3, .03, 2, false);
    add(world, B(5, .06, 4), M(tint), -2.5, .03, -2, false);
    add(world, B(5, .06, 4), M('#c79c74'), 2.5, .03, -2, false);
    // walls
    const wallIn = apt ? '#eeeeea' : '#f4ecdf';
    add(world, B(10.3, H, .16), M(wallIn), 0, H / 2, -4.08);
    add(world, B(.16, H, 8.3), M(wallIn), -5.08, H / 2, 0);
    add(world, B(4.9, H - .02, .02), M(new THREE.Color(home.theme).lerp(new THREE.Color('#ffffff'), .15)), -2.5, H / 2, -3.99, false);
    if (!apt) {
      const sh = new THREE.Shape(); sh.moveTo(-5.2, 0); sh.lineTo(5.2, 0); sh.lineTo(0, 2.1); sh.closePath();
      add(world, new THREE.ExtrudeGeometry(sh, { depth: .18, bevelEnabled: false }), M('#b8665a'), 0, H, -4.17);
      add(world, B(.5, 1.1, .5), M('#8c6a5a'), 2.4, H + 1.2, -4.05);
      add(world, B(.18, .3, 8.3), M('#b8665a'), -5.08, H + .15, 0);
    } else {
      add(world, B(10.5, .2, .4), M('#bfc3c7'), 0, H + .1, -4.1);
    }
    const part = M('#ece3d4');
    [[-4, 2], [0, 4], [4, 2]].forEach(([cx, len]) => add(world, B(len, h2, .12), part, cx, h2 / 2, 0));
    add(world, B(.12, h2, 4), part, 0, h2 / 2, -2);
    // windows
    R.windows = [];
    [[-1.0, 1.55, -3.98, 0], [1.7, 1.55, -3.98, 0], [-5.0, 1.55, -1.0, Math.PI / 2], [-5.0, 1.55, 1.0, Math.PI / 2]].forEach(([x, y, z, ry]) => {
      const fr = add(world, B(1.2, 1.0, .04), M('#ffffff'), x, y, z, false); fr.rotation.y = ry;
      const wm = new THREE.MeshStandardMaterial({ color: '#9fc6e0', emissive: new THREE.Color('#ffc070'), emissiveIntensity: .2, roughness: .3 });
      const p = add(world, new THREE.PlaneGeometry(1.0, .8), wm, x + (ry ? .03 : 0), y, z + (ry ? 0 : .03), false); p.rotation.y = ry; R.windows.push(wm);
    });
    // room lights
    R.lights = []; R.bulbs = [];
    [[-2, 2], [3, 2], [-2.5, -2], [2.5, -2]].forEach(([x, z]) => {
      const L = new THREE.PointLight(0xffc070, 0, 7, 2); L.position.set(x, 2.3, z); world.add(L); R.lights.push(L);
      const bm = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: new THREE.Color('#ffc070'), emissiveIntensity: 0 });
      add(world, new THREE.SphereGeometry(.12, 10, 8), bm, x, 2.4, z, false); R.bulbs.push(bm);
    });

    /* living room */
    add(world, new THREE.CylinderGeometry(1.3, 1.3, .02, 24), M('#c98f6b'), -3.3, .07, 2.2, false);
    const sofa = M('#6f8fb5');
    add(world, B(.8, .4, 2), sofa, -1.6, .25, 2.1); add(world, B(.22, .55, 2), sofa, -1.25, .6, 2.1);
    add(world, B(.8, .3, .2), sofa, -1.6, .5, 1.15); add(world, B(.8, .3, .2), sofa, -1.6, .5, 3.05);
    add(world, B(.5, .45, 1.4), M('#8a6a4f'), -4.7, .25, 2.7);
    add(world, B(.08, .75, 1.25), M('#22262c'), -4.78, .9, 2.7);
    R.tvMat = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color('#7fb2ff'), emissiveIntensity: 1 });
    add(world, new THREE.PlaneGeometry(1.1, .62), R.tvMat, -4.73, .9, 2.7, false).rotation.y = Math.PI / 2;
    add(world, new THREE.CylinderGeometry(.25, .19, .4, 10), M('#c0704f'), -4.5, .25, .45);
    R.plant = [];
    { const g = new THREE.Group(); g.position.set(-4.5, .45, .45); world.add(g);
      add(g, new THREE.ConeGeometry(.06, .25, 5), M('#79b85c'), -.05, .12, 0); add(g, new THREE.ConeGeometry(.05, .2, 5), M('#79b85c'), .06, .1, .03); R.plant.push(prop(g)); }
    { const g = new THREE.Group(); g.position.set(-4.5, .45, .45); world.add(g);
      add(g, new THREE.IcosahedronGeometry(.38, 0), M('#5f9e5a'), 0, .35, 0); add(g, new THREE.IcosahedronGeometry(.26, 0), M('#6fae62'), .18, .6, .05); R.plant.push(prop(g)); }
    { const g = new THREE.Group(); g.position.set(-4.5, .45, .45); world.add(g);
      add(g, new THREE.IcosahedronGeometry(.38, 0), M('#5f9e5a'), 0, .35, 0);
      [[.2, .7, .15], [-.18, .62, .2], [.05, .85, -.1], [-.1, .5, -.25]].forEach(([x, y, z]) => add(g, new THREE.SphereGeometry(.08, 8, 6), M('#f29ab0', { flatShading: false }), x, y, z)); R.plant.push(prop(g)); }
    const r = rng(11); R.clutter = [];
    [[-2.7, 3.5], [-3.9, 1.3], [-.4, 3.6], [-2.9, .7], [.3, 1.4], [-4.2, 3.6]].forEach(([x, z], i) => {
      const c = ['#e5604f', '#3f8fd9', '#f2b544', '#7a5bd1'][i % 4];
      const m = i % 3 === 0 ? add(world, new THREE.SphereGeometry(.14, 10, 8), M(c, { flatShading: false }), x, .2, z) : add(world, B(.3, .08 + .1 * (i % 2), .22), M(c), x, .12, z);
      m.rotation.y = r() * 3; R.clutter.push(prop(m));
    });
    { const g = new THREE.Group(); g.position.set(-3.3, .1, 2.2); world.add(g);
      add(g, B(.7, .04, .7), M('#f4e3b5'), 0, 0, 0);
      [[.15, .15, '#e5604f'], [-.2, .1, '#3f8fd9'], [.1, -.2, '#2c9c8c'], [-.1, -.1, '#f2b544']].forEach(([x, z, c]) => add(g, new THREE.CylinderGeometry(.05, .06, .12, 8), M(c), x, .08, z));
      R.board = prop(g); }
    R.cushions = [[-3.3, 1.2], [-3.3, 3.2]].map(([x, z]) => { const g = new THREE.SphereGeometry(.32, 10, 6); g.scale(1, .35, 1); return prop(add(world, g, M('#e7b06a'), x, .14, z)); });

    /* kitchen */
    add(world, B(.6, .9, 2.5), M('#efe9df'), 4.6, .5, 2.35); add(world, B(.64, .05, 2.54), M('#b9a58c'), 4.6, .97, 2.35);
    add(world, B(.7, 1.8, .7), M('#e3e6e8'), 4.6, .95, .5);
    add(world, B(1.6, .08, 1), M('#a07a56'), 2.6, .78, 2.4);
    [[1.9, 1.98], [3.3, 1.98], [1.9, 2.82], [3.3, 2.82]].forEach(([x, z]) => add(world, B(.07, .74, .07), M('#8a6a4f'), x, .4, z));
    [[2.1, 1.7], [3.1, 1.7], [2.6, 3.15]].forEach(([x, z]) => { add(world, B(.42, .06, .42), M('#c99a6a'), x, .48, z); add(world, B(.42, .5, .06), M('#c99a6a'), x, .75, z + (z < 2 ? -.2 : .2)); });
    [[2.1, 2.15], [3.1, 2.15], [2.6, 2.68]].forEach(([x, z]) => add(world, new THREE.CylinderGeometry(.16, .13, .03, 14), M('#ffffff', { flatShading: false }), x, .84, z, false));
    R.phones = [[2.45, 2.4], [2.85, 2.25], [3.25, 2.55]].map(([x, z], i) => {
      const g = new THREE.Group(); g.position.set(x, .83, z); g.rotation.y = i * .6 - .3; world.add(g);
      add(g, B(.14, .02, .26), M('#22262c'), 0, 0, 0, false);
      const p = add(g, new THREE.PlaneGeometry(.12, .22), new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#8ec5ff'), emissiveIntensity: 1.6 }), 0, .012, 0, false);
      p.rotation.x = -Math.PI / 2; return prop(g);
    });

    /* child room */
    add(world, B(1.2, .35, 2.1), M('#b08560'), -4.3, .2, -2.9);
    add(world, B(1.1, .15, 2), M('#fbfaf6'), -4.3, .45, -2.9);
    add(world, B(.7, .12, .35), M('#ffffff'), -4.3, .58, -3.65);
    R.blanket = add(world, B(1.14, .08, 1.4), M(home.theme), -4.3, .56, -2.5);
    const wood = M('#a7805c');
    add(world, B(1.7, 1.6, .04), wood, -1.6, .8, -3.97);
    add(world, B(.05, 1.6, .35), wood, -2.45, .8, -3.82); add(world, B(.05, 1.6, .35), wood, -.75, .8, -3.82);
    [.05, .55, 1.05, 1.55].forEach(y => add(world, B(1.7, .04, .35), wood, -1.6, y + .02, -3.82));
    const BC = ['#e5604f', '#3f8fd9', '#f2b544', '#7a5bd1', '#2c9c8c', '#f08bb0', '#5a6c8a'];
    const rb = rng(5); R.books = [];
    for (let i = 0; i < 24; i++) {
      const sh = Math.floor(i / 8), k = i % 8, h = .28 + rb() * .12;
      R.books.push(prop(add(world, B(.15, h, .24), M(BC[(i * 3) % BC.length]), -2.33 + k * .195, .09 + sh * .5 + h / 2, -3.82, false)));
    }
    add(world, B(.95, .05, .55), M('#d9c3a5'), -.6, .72, -1.2);
    [[-1, -1.4], [-.18, -1.4], [-1, -.98], [-.18, -.98]].forEach(([x, z]) => add(world, B(.05, .7, .05), M('#b49a7a'), x, .37, z));
    add(world, B(.62, .38, .46), M(new THREE.Color(home.theme).multiplyScalar(.8)), -3.0, .22, -3.65);
    R.boxToys = [[-3.15, -3.6], [-2.88, -3.72], [-3.05, -3.5], [-2.85, -3.52], [-3.2, -3.75]].map(([x, z], i) => prop(add(world, new THREE.SphereGeometry(.1, 8, 6), M(BC[i]), x, .44, z, false)));
    const rt = rng(9); R.toys = [];
    [[-2.8, -1.2], [-1.6, -2.5], [-3.4, -.8], [-2.1, -.9], [-1.2, -1.9], [-3.1, -2.1], [-.5, -2.6], [-2.3, -2.9], [-3.6, -1.6], [-1.6, -.6]].forEach(([x, z], i) => {
      const c = BC[i % BC.length];
      const m = i % 2 ? add(world, B(.2, .2, .2), M(c), x, .16, z) : add(world, new THREE.CylinderGeometry(.12, .12, .16, 8), M(c), x, .14, z);
      m.rotation.set(rt() * .5, rt() * 3, 0); R.toys.push(prop(m));
    });
    add(world, new THREE.CylinderGeometry(.01, .01, .5, 4), M('#dddddd'), -4.3, 2.3, -2.9, false);
    R.stars = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, rr = .25 + (i % 2) * .22;
      R.stars.push(prop(add(world, new THREE.OctahedronGeometry(.07, 0), glow('#ffd166', 1.2), -4.3 + Math.cos(a) * rr, 1.85 + (i % 3) * .1, -2.9 + Math.sin(a) * rr, false)));
    }

    /* parent bedroom */
    add(world, B(1.8, .35, 2.1), M('#8a6a4f'), 3.7, .2, -2.9); add(world, B(1.7, .15, 2), M('#fbfaf6'), 3.7, .45, -2.9);
    add(world, B(1.74, .08, 1.3), M('#7d9bc8'), 3.7, .56, -2.45);
    [3.3, 4.1].forEach(x => add(world, B(.6, .12, .32), M('#ffffff'), x, .58, -3.65));
    add(world, B(1.2, 2, .55), M('#d9c3a5'), .9, 1.05, -3.7);
    add(world, B(.45, .5, .45), M('#a07a56'), 4.75, .27, -1.5);
    add(world, new THREE.ConeGeometry(.18, .25, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#fff1d0', emissive: new THREE.Color('#ffc070'), emissiveIntensity: .6, side: THREE.DoubleSide }), 4.75, .75, -1.5, false);

    /* yard or balcony */
    R.tree = makeTree(world);
    if (apt) { R.tree.g.position.set(3.9, .35, 5.3); add(world, new THREE.CylinderGeometry(.6, .48, .6, 12), M('#c0704f'), 3.9, .18, 5.3); }
    else R.tree.g.position.set(6.7, 0, 5.6);
    prop(R.tree.g);
    { const g = new THREE.Group(); world.add(g);
      add(g, new THREE.CylinderGeometry(.04, .05, 2.4, 6), M('#777777'), 0, 1.2, 0);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .6), new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: .8 }));
      cloth.position.set(.62, 2.05, 0); g.add(cloth); R.cloth = cloth;
      if (apt) g.position.set(-4.4, .05, 6.2); else g.position.set(-6.3, 0, 5.4);
      R.flag = prop(g); }
    R.lanterns = [];
    for (let i = 0; i < 20; i++) {
      const g = new THREE.Group(); world.add(g);
      if (apt) { g.position.set(-4.8 + i * .5, .95, 6.55); add(g, new THREE.SphereGeometry(.07, 8, 6), glow('#ffc070'), 0, 0, 0, false); }
      else {
        const t = i / 19; g.position.set(-6.4 + t * 11.6, 0, 7.4 + Math.sin(t * Math.PI) * .9);
        add(g, new THREE.CylinderGeometry(.03, .03, .7, 5), M('#5a5a5a'), 0, .35, 0); add(g, new THREE.SphereGeometry(.1, 8, 6), glow('#ffc070'), 0, .75, 0, false);
      }
      R.lanterns.push(prop(g));
    }
    // soft haze over a room on a missed day
    R.haze = {};
    const hz = (k, x, z, w, d) => { const m = new THREE.MeshBasicMaterial({ color: '#eef2f5', transparent: true, opacity: 0, depthWrite: false }); m.userData.target = 0;
      const me = new THREE.Mesh(B(w, 2.4, d), m); me.position.set(x, 1.2, z); me.visible = false; world.add(me); R.haze[k] = m; m.userData.mesh = me; };
    hz('child', -2.5, -2, 4.9, 3.9); hz('bedroom', 2.5, -2, 4.9, 3.9); hz('kitchen', 3, 2, 3.9, 3.9); hz('living', -2, 2, 5.9, 3.9);
    // fireflies
    const N = mobile ? 12 : 40, fp = new Float32Array(N * 3), fr = rng(3);
    for (let i = 0; i < N; i++) { fp[i * 3] = apt ? -4.5 + fr() * 9 : -9 + fr() * 18; fp[i * 3 + 1] = .4 + fr() * 1.8; fp[i * 3 + 2] = apt ? 4.6 + fr() * 1.6 : 4.5 + fr() * 4.5; }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    R.flyMat = new THREE.PointsMaterial({ color: '#ffe9a0', size: .12, transparent: true, opacity: 0, depthWrite: false });
    R.fly = new THREE.Points(fg, R.flyMat); R.flyBase = fp.slice(); world.add(R.fly);
    // family
    R.people = [makePerson('#4b70ad', 1), makePerson('#cf6b69', .74)];
    const yardKid = apt ? [2.6, 5.5] : [5.4, 5.3];
    const pPath = [[3, -2.2], [2.5, -.3], [2.5, 1.0], [1.3, 1.0], [1.2, 2.7], [-.6, 3.3], [-.6, 5.3], [2.8, 5.5], [4, 4.2], [4, 1.2], [2.5, 1.0], [2.5, -.3]];
    const cPath = [[-2.4, -2.1], [-2.5, -.3], [-2.5, 1.6], [-3.4, 2.4], [-1.0, 4.4], [-.5, 5.5], yardKid, [.6, 3.6], [-2.5, 1.6], [-2.5, -.3]];
    R.paths = [pPath, cPath].map(p => {
      const pts = p.map(([x, z]) => new THREE.Vector3(x, 0, z)); pts.push(pts[0].clone());
      let len = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); seg.push(l); len += l; }
      return { pts, seg, len };
    });
    R.walk = [{ t: 0, pause: 0 }, { t: R.paths[1].len * .3, pause: 0 }];
  }
  function makePerson(color, sc) {
    const g = new THREE.Group(); world.add(g);
    add(g, new THREE.CapsuleGeometry(.22, .42, 4, 10), M(color, { flatShading: false }), 0, .45, 0);
    add(g, new THREE.SphereGeometry(.21, 14, 10), M('#f2c9a0', { flatShading: false }), 0, 1.08, 0);
    add(g, new THREE.SphereGeometry(.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), M('#3b2a22', { flatShading: false }), 0, 1.12, -.02).rotation.x = -.3;
    [-.09, .09].forEach(x => add(g, new THREE.SphereGeometry(.025, 6, 4), M('#22302a'), x, 1.1, .19, false));
    g.scale.setScalar(sc); return g;
  }

  let D = null, mix = 1, mixTarget = 1;
  function update(app, d, tod) {
    const key = app.home.type + '|' + app.home.theme;
    let snap = D === null;
    if (key !== buildKey) { buildKey = key; build(app.home); snap = true; }
    const R = W;
    R.books.forEach((b, i) => setOn(b, i < d.books));
    R.toys.forEach((t, i) => setOn(t, i < d.toysFloor));
    R.boxToys.forEach((t, i) => setOn(t, i < Math.min(5, Math.round((10 - d.toysFloor) / 2))));
    R.stars.forEach((t, i) => setOn(t, i < d.stars));
    R.blanket.rotation.y = d.bedMade ? 0 : .35; R.blanket.position.x = d.bedMade ? -4.3 : -4.15; R.blanket.position.z = d.bedMade ? -2.5 : -2.3;
    R.phones.forEach((p, i) => setOn(p, i < d.phones));
    R.tvMat.emissiveIntensity = .05 + 1.6 * d.tv;
    setOn(R.board, d.board); R.cushions.forEach(c => setOn(c, d.cushions));
    R.lanterns.forEach((l, i) => setOn(l, i < d.lanterns));
    R.clutter.forEach((c, i) => setOn(c, i < d.clutter));
    R.plant.forEach((p, i) => setOn(p, i === d.plant));
    setOn(R.tree.g, true, d.tree * (R.apt ? .75 : 1));
    R.tree.fruits.forEach((f, i) => setOn(f, i < d.fruits));
    setOn(R.flag, d.flag);
    for (const k in R.haze) R.haze[k].userData.target = (k === 'child' && d.hazeChild) || k === d.hazeParent ? .3 : 0;
    mixTarget = tod === 'evening' ? 1 : 0;
    if (snap) {
      mix = mixTarget;
      props.forEach(o => { o.scale.setScalar(o.userData.on ? o.userData.base : .0001); o.visible = o.userData.on; });
      for (const k in R.haze) R.haze[k].opacity = R.haze[k].userData.target;
    }
    D = d;
  }

  const C = h => new THREE.Color(h);
  const PAL = { bg: [C('#d4e7ef'), C('#2b3453')], hs: [C('#eef6ff'), C('#6c7bb0')], hg: [C('#8aa07f'), C('#2c3326')], sun: [C('#fff1d6'), C('#ff9b5e')] };
  const coolL = C('#cdd8ff'), warmL = C('#ffbf6e'), skyWin = C('#a9d2ea'), nightWin = C('#3a3f55'), warmWin = C('#ffb357'), dimWin = C('#8c93a8');
  const bg = new THREE.Color(), lc = new THREE.Color();
  scene.background = bg;

  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  function walkStep(person, path, st, dt, clock) {
    if (st.pause > 0) { st.pause -= dt; return; }
    st.t += dt * (reduced ? 0 : .55); if (st.t > path.len) st.t -= path.len;
    let t = st.t, i = 0; while (i < path.seg.length - 1 && t > path.seg[i]) { t -= path.seg[i]; i++; }
    const a = path.pts[i], b = path.pts[i + 1], f = Math.min(1, t / path.seg[i]);
    person.position.set(a.x + (b.x - a.x) * f, reduced ? 0 : Math.abs(Math.sin(clock * 9)) * .05, a.z + (b.z - a.z) * f);
    person.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    if (f > .98 && Math.random() < .004) st.pause = 1.2 + Math.random() * 1.5;
  }

  let last = performance.now(), clock = 0, prevAz = controls.getAzimuthalAngle(), raf = 0, running = true;
  function tick(nowT) {
    if (!running) return;
    const dt = Math.min(.05, (nowT - last) / 1000); last = nowT; clock += dt;
    if (!reduced && !controls.autoRotate && nowT > resumeAt) controls.autoRotate = true;
    const az = controls.getAzimuthalAngle();
    if (controls.autoRotate && ((az > 1.5 && az > prevAz) || (az < .05 && az < prevAz))) controls.autoRotateSpeed *= -1;
    prevAz = az; controls.update();
    if (W && D) {
      mix += (mixTarget - mix) * Math.min(1, dt * 2.2);
      const m = mix, w = D.warmth;
      bg.copy(PAL.bg[0]).lerp(PAL.bg[1], m);
      hemi.color.copy(PAL.hs[0]).lerp(PAL.hs[1], m); hemi.groundColor.copy(PAL.hg[0]).lerp(PAL.hg[1], m); hemi.intensity = 1.5 - .95 * m;
      sun.color.copy(PAL.sun[0]).lerp(PAL.sun[1], m); sun.intensity = 2.6 - 1.9 * m; sun.position.set(9 - 17 * m, 14 - 10 * m, 9);
      lc.copy(coolL).lerp(warmL, w);
      const roomI = (.4 + 7 * m) * (.3 + .7 * w);
      W.lights.forEach(L => { L.color.copy(lc); L.intensity = roomI; });
      W.bulbs.forEach(b => { b.emissive.copy(lc); b.emissiveIntensity = m * (.4 + 1.6 * w); });
      W.windows.forEach(wm => { wm.color.copy(skyWin).lerp(nightWin, m); wm.emissive.copy(dimWin).lerp(warmWin, w); wm.emissiveIntensity = m * (.3 + 1.8 * w); });
      W.flyMat.opacity = m * .9 * (.4 + .6 * w);
      if (!reduced) {
        const a = W.fly.geometry.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) { a[i + 1] = W.flyBase[i + 1] + Math.sin(clock * 1.3 + i) * .18; a[i] = W.flyBase[i] + Math.sin(clock * .7 + i * .3) * .2; }
        W.fly.geometry.attributes.position.needsUpdate = true;
        W.cloth.rotation.y = Math.sin(clock * 2.2) * .18;
      }
      for (const k in W.haze) { const h = W.haze[k]; h.opacity += (h.userData.target - h.opacity) * Math.min(1, dt * 3); h.userData.mesh.visible = h.opacity > .01; }
      W.people.forEach((p, i) => walkStep(p, W.paths[i], W.walk[i], dt, clock));
    }
    for (const o of props) {
      const t = o.userData.on ? o.userData.base : .0001; let s = o.scale.x;
      s += (t - s) * Math.min(1, dt * (reduced ? 30 : 5)); o.scale.setScalar(s); o.visible = s > .002;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  if (document.fonts) document.fonts.ready.then(() => { if (W) { W.cloth.material.map = flagTexture(); W.cloth.material.needsUpdate = true; } });

  return {
    update,
    destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}
