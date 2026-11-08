/* =========================================================
   Coffee With KHORSHED — 3D "Wake the Beans" scene (Three.js)
   ---------------------------------------------------------
   Replaces the flat SVG in scene 1 with a real 3D bean that
   splits, grounds that fall into a glass grinder, and an
   espresso pour — all driven by scroll. The SVG stays in the
   page as a fallback and is faded out once 3D is ready.
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.querySelector(".scene-1 .visual");
const section = document.querySelector(".scene-1");

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

if (host && section && webglAvailable()) {
  try { init(); } catch (err) { console.warn("3D scene disabled:", err); }
}

function init() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const lowPower = small || (navigator.hardwareConcurrency || 8) <= 4;

  /* ---------------- renderer / scene / camera ---------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = "hero-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x6b4a33, 0.7));
  const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb27a, 1.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  /* ---------------- textures ---------------- */
  function noiseTexture(size = 256, strength = 80) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = 128 + (Math.random() - .5) * strength;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // soften so it reads as roasted texture, not static
    const s = document.createElement("canvas");
    s.width = s.height = size / 4;
    s.getContext("2d").drawImage(c, 0, 0, size / 4, size / 4);
    g.imageSmoothingEnabled = true;
    g.globalAlpha = .6;
    g.drawImage(s, 0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }
  const noise = noiseTexture();

  /* ---------------- materials ---------------- */
  const beanMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a3019, roughness: .42, metalness: 0, clearcoat: .55, clearcoatRoughness: .35,
    bumpMap: noise, bumpScale: .025, roughnessMap: noise, sheen: .3, sheenColor: new THREE.Color(0xc48a5c)
  });
  const beanInnerMat = new THREE.MeshStandardMaterial({ color: 0x3a1d0e, roughness: .85, bumpMap: noise, bumpScale: .04 });
  const groundsMat = new THREE.MeshStandardMaterial({ color: 0x3b2213, roughness: .95, bumpMap: noise, bumpScale: .03 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd9d5cf, metalness: 1, roughness: .22 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd6a44a, metalness: 1, roughness: .28 });
  const espressoMat = new THREE.MeshPhysicalMaterial({ color: 0xb8773f, roughness: .18, clearcoat: 1, clearcoatRoughness: .1 });
  // Clear glass: transparency + glossy reflections. (Physical transmission samples
  // the canvas behind it, which is transparent here and would turn the glass grey.)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: .04, metalness: 0, transparent: true, opacity: .18,
    clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false
  });

  /* ---------------- coffee bean ---------------- */
  const RX = .63, RY = .9, RZ = .5;
  const GAP = .012;
  const crease = y => .16 * Math.sin((y / RY) * Math.PI * .9);

  // Shape a unit hemisphere / cap into one half of an S-creased bean.
  function shapeHalf(geo, side) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const Y = y * RY;
      const w = 1 - Math.min(1, Math.abs(x));
      const X = x * RX + crease(Y) * w + side * GAP;
      // slightly flatter back, fuller front
      const Z = z * (z > 0 ? RZ : RZ * .85);
      pos.setXYZ(i, X, Y, Z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function makeHalf(side, detail = 64) {
    const g = new THREE.Group();
    const shell = new THREE.SphereGeometry(1, detail, Math.round(detail * .75), side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI);
    const cap = new THREE.CircleGeometry(1, detail);
    cap.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2);
    g.add(new THREE.Mesh(shapeHalf(shell, side), beanMat));
    g.add(new THREE.Mesh(shapeHalf(cap, side), beanInnerMat));
    return g;
  }

  // Each half hangs from a pivot at the bean's bottom tip, like the 2D version.
  function makeBean(detail) {
    const bean = new THREE.Group();
    const halves = [-1, 1].map(side => {
      const pivot = new THREE.Group();
      pivot.position.y = -RY;
      const half = makeHalf(side, detail);
      half.position.y = RY;
      pivot.add(half);
      bean.add(pivot);
      return pivot;
    });
    return { bean, left: halves[0], right: halves[1] };
  }

  const rig = new THREE.Group();          // everything that tilts with the mouse
  scene.add(rig);

  const hero = makeBean(lowPower ? 40 : 64);
  const beanHolder = new THREE.Group();
  beanHolder.position.y = 1.48;
  beanHolder.add(hero.bean);
  rig.add(beanHolder);

  /* ---------------- glass grinder ---------------- */
  const grinder = new THREE.Group();
  rig.add(grinder);

  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, 1.37, 64, 1, true), glassMat);
  glass.position.y = -.795;
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(.43, .16, .18, 64, 1, true), glassMat);
  funnel.position.y = -1.57;
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(.43, .012, 12, 64), steelMat);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = -.11;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.455, .455, .2, 64), steelMat);
  band.position.y = -.91;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.13, .11, .16, 32), steelMat);
  spout.position.y = -1.72;

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .36, 24), goldMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-.62, -.91, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .42, 24), goldMat);
  handle.position.set(-.82, -.91, 0);
  const knobTop = new THREE.Mesh(new THREE.SphereGeometry(.075, 24, 16), goldMat);
  knobTop.position.set(-.82, -.69, 0);
  const knobBot = knobTop.clone();
  knobBot.position.y = -1.13;

  const fillGeo = new THREE.CylinderGeometry(.41, .41, 1, 48);
  fillGeo.translate(0, .5, 0);
  const fill = new THREE.Mesh(fillGeo, groundsMat);
  fill.position.y = -1.46;
  const funnelFill = new THREE.Mesh(new THREE.CylinderGeometry(.41, .15, .16, 48), groundsMat);
  funnelFill.position.y = -1.56;

  grinder.add(fill, funnelFill, glass, funnel, rimRing, band, spout, arm, handle, knobTop, knobBot);

  /* ---------------- espresso stream ---------------- */
  const streamGeo = new THREE.CylinderGeometry(.04, .052, 1, 20, 1);
  streamGeo.translate(0, -.5, 0);
  const stream = new THREE.Mesh(streamGeo, espressoMat);
  stream.position.y = -1.8;
  rig.add(stream);

  /* ---------------- falling grounds ---------------- */
  const N = lowPower ? 140 : 260;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const grounds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.034, 0), groundsMat, N);
  grounds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const shades = [0x2b150a, 0x3d2010, 0x55301a, 0x1d0e06].map(c => new THREE.Color(c));
  const parts = [];
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(Math.random()) * .34, a = Math.random() * Math.PI * 2;
    parts.push({
      from: new THREE.Vector3(rnd(-.12, .12), 1.25 + rnd(-.12, .12), rnd(-.12, .12)),
      to: new THREE.Vector3(Math.cos(a) * r, rnd(-1.38, -.3), Math.sin(a) * r),
      wobble: rnd(-.25, .25),
      start: .16 + (i / N) * .34,
      axis: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(),
      size: rnd(.6, 1.5)
    });
    grounds.setColorAt(i, shades[i % shades.length]);
  }
  rig.add(grounds);

  /* ---------------- floating background beans ---------------- */
  const floaters = [
    [-1.25, 2.55, -3, .26], [1.3, .55, -3.6, .22], [-1.15, -1.9, -2.6, .24], [1.2, -2.5, -2.2, .2], [.15, 3.15, -5, .2]
  ].map(([x, y, z, s], i) => {
    const b = makeBean(24).bean;
    b.scale.setScalar(s);
    b.position.set(x, y, z);
    b.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    b.userData = { y, speed: rnd(.15, .35), phase: i * 1.7 };
    scene.add(b);
    return b;
  });

  /* ---------------- sizing ---------------- */
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole column visible on tall, narrow screens
    camera.position.z = camera.aspect < .55 ? 10 * (.55 / camera.aspect) * .9 : 10;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  /* ---------------- input: mouse / device tilt ---------------- */
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", e => {
    tilt.tx = (e.clientX / innerWidth - .5) * 2;
    tilt.ty = (e.clientY / innerHeight - .5) * 2;
  }, { passive: true });
  addEventListener("deviceorientation", e => {
    if (e.gamma == null) return;
    tilt.tx = clamp(e.gamma / 30, -1, 1);
    tilt.ty = clamp((e.beta - 45) / 30, -1, 1);
  }, { passive: true });

  /* ---------------- scroll progress ---------------- */
  function progress() {
    const r = section.getBoundingClientRect();
    const travel = r.height - innerHeight;
    return travel > 0 ? clamp(-r.top / travel) : 0;
  }

  /* ---------------- per-frame update ---------------- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let smoothP = progress();

  function update(time, dt) {
    const target = progress();
    smoothP += (target - smoothP) * Math.min(1, dt * 8);
    const p = smoothP;
    const t = reduceMotion ? 0 : time;

    // bean: idle turn, then split open
    const s = ease(seg(p, .06, .38));
    const lift = ease(seg(p, .55, .95)) * .25;
    hero.bean.rotation.y = (1 - s) * Math.sin(t * .6) * .7;
    hero.bean.rotation.x = (1 - s) * Math.sin(t * .45) * .12;
    beanHolder.position.y = 1.48 + Math.sin(t * 1.2) * .05 + lift;
    hero.left.position.x = -.32 * s;
    hero.right.position.x = .32 * s;
    hero.left.rotation.z = .3 * s;
    hero.right.rotation.z = -.3 * s;
    hero.left.rotation.y = -.6 * s;
    hero.right.rotation.y = .6 * s;

    // grounds in flight
    for (let i = 0; i < N; i++) {
      const g = parts[i];
      const k = seg(p, g.start, g.start + .2);
      if (k <= 0 || k >= 1) { grounds.setMatrixAt(i, zero); continue; }
      v3.x = lerp(g.from.x, g.to.x, k) + Math.sin(k * Math.PI) * g.wobble;
      v3.y = lerp(g.from.y, g.to.y, k * k);
      v3.z = lerp(g.from.z, g.to.z, k);
      q.setFromAxisAngle(g.axis, k * 9 + i);
      sc.setScalar(g.size);
      grounds.setMatrixAt(i, m4.compose(v3, q, sc));
    }
    grounds.instanceMatrix.needsUpdate = true;

    // grinder fills up
    const f = seg(p, .24, .66);
    fill.visible = f > 0;
    funnelFill.visible = f > 0;
    fill.scale.y = Math.max(.001, 1.3 * f);

    // espresso pours down past the bottom of the view
    const st = ease(seg(p, .58, .86));
    stream.visible = st > 0;
    stream.scale.set(1 + Math.sin(t * 9) * .06, Math.max(.001, 3.8 * st), 1 + Math.cos(t * 7) * .06);

    // gentle tilt toward the pointer
    tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 4);
    tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 4);
    const amt = reduceMotion ? .4 : 1;
    rig.rotation.y = tilt.x * .32 * amt;
    rig.rotation.x = tilt.y * .12 * amt;

    for (const b of floaters) {
      const u = b.userData;
      b.position.y = u.y + Math.sin(t * u.speed + u.phase) * .15 - p * 1.2 * (u.speed + .4);
      b.rotation.x += dt * u.speed * (reduceMotion ? 0 : 1);
      b.rotation.y += dt * u.speed * .7 * (reduceMotion ? 0 : 1);
    }
  }

  /* ---------------- render loop (only while visible) ---------------- */
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "100px" }).observe(section);

  const clock = new THREE.Clock();
  let first = true;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!visible || document.hidden) return;
    update(clock.elapsedTime, dt);
    renderer.render(scene, camera);
    if (first) {
      first = false;
      host.classList.add("is-3d");
      document.documentElement.classList.add("has-3d");
    }
  }
  // compile shaders up front so the first scroll doesn't stutter
  renderer.compile(scene, camera);
  frame();

  // if the GPU context is lost, fall back to the SVG
  canvas.addEventListener("webglcontextlost", e => {
    e.preventDefault();
    host.classList.remove("is-3d");
  });
}
