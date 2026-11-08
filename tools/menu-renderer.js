/* =========================================================
   Coffee With KHORSHED — Menu Image Studio
   Builds each menu item as a 3D model, lights it in one shared
   studio setup and renders an 800×800 WebP. With ?save=1 each
   image is posted to save-render.php → assets/menu/<slug>.webp
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const SIZE = 800;
const BG = 0xefe6d9;               // matches --cream in styles.css
const V2 = (x, y) => new THREE.Vector2(x, y);
const lerp = (a, b, t) => a + (b - a) * t;
let seed = 7;
const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * ((seed - 1) / 2147483646); };

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

/* ---------------- textures ---------------- */
function canvasTex(size, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function speckle(g, s, n, colors, rMin, rMax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    g.arc(rnd(0, s), rnd(0, s), rnd(rMin, rMax), 0, Math.PI * 2);
    g.fill();
  }
}
const noiseTex = (strength = 70, repeat = [2, 2]) => canvasTex(256, (g, s) => {
  const img = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = 128 + (rnd() - .5) * strength;
    img.data.set([v, v, v, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
}, { srgb: false, repeat });

function heartPath(g, cx, cy, w) {
  g.beginPath();
  g.moveTo(cx, cy + w * .75);
  g.bezierCurveTo(cx - w * 1.15, cy + w * .05, cx - w * .8, cy - w * .95, cx, cy - w * .38);
  g.bezierCurveTo(cx + w * .8, cy - w * .95, cx + w * 1.15, cy + w * .05, cx, cy + w * .75);
  g.fill();
}

// Coffee surface: crema / latte art / black coffee / caramel foam
function surfaceTex(kind) {
  return canvasTex(512, (g, s) => {
    const c = s / 2;
    const grad = g.createRadialGradient(c, c, 0, c, c, c);
    if (kind === "crema") {
      grad.addColorStop(0, "#d9a462"); grad.addColorStop(.55, "#b9763a");
      grad.addColorStop(.88, "#7a3f17"); grad.addColorStop(1, "#4a220b");
    } else if (kind === "black") {
      grad.addColorStop(0, "#2b160b"); grad.addColorStop(.85, "#170a04"); grad.addColorStop(1, "#5a3017");
    } else if (kind === "caramel") {
      grad.addColorStop(0, "#f5ead9"); grad.addColorStop(.7, "#ecdcc4"); grad.addColorStop(.92, "#c99360"); grad.addColorStop(1, "#a4683a");
    } else {
      grad.addColorStop(0, "#cf9a66"); grad.addColorStop(.72, "#b47a45"); grad.addColorStop(.9, "#86471f"); grad.addColorStop(1, "#5e2f12");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);

    g.filter = "blur(3px)";
    g.fillStyle = "#f7ecdc";
    g.strokeStyle = "#f7ecdc";
    if (kind === "heart") {
      heartPath(g, c, c + 6, 150);
      g.lineWidth = 5; g.beginPath(); g.moveTo(c, c + 118); g.lineTo(c, c + 175); g.stroke();
    }
    if (kind === "rosetta") {
      for (let k = 0; k < 8; k++) {
        const y = c + 135 - k * 34, w = 150 - k * 14;
        g.beginPath(); g.moveTo(c - w, y);
        g.quadraticCurveTo(c, y - 86, c + w, y);
        g.quadraticCurveTo(c, y - 42, c - w, y);
        g.fill();
      }
      heartPath(g, c, c - 150, 34);
      g.lineWidth = 5; g.beginPath(); g.moveTo(c, c + 178); g.lineTo(c, c - 140); g.stroke();
    }
    if (kind === "tulip") {
      [[c + 92, 110], [c + 10, 92], [c - 62, 74], [c - 122, 54]].forEach(([y, w]) => heartPath(g, c, y, w));
      g.lineWidth = 5; g.beginPath(); g.moveTo(c, c + 170); g.lineTo(c, c - 150); g.stroke();
    }
    if (kind === "caramel") {
      g.filter = "blur(1.5px)";
      g.strokeStyle = "#b8702c"; g.lineWidth = 11; g.lineCap = "round";
      g.beginPath();
      for (let i = 0; i <= 8; i++) { const x = 120 + i * 34, y = i % 2 ? 160 : 350; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.lineWidth = 6;
      g.beginPath(); g.arc(c, c, 95, 0, Math.PI * 2); g.stroke();
    }
    g.filter = "none";
    if (kind === "crema") speckle(g, s, 900, ["rgba(90,40,12,.35)", "rgba(240,190,120,.35)"], .6, 2.2);
    else speckle(g, s, 400, ["rgba(255,255,255,.12)", "rgba(80,40,15,.12)"], .5, 1.6);
  });
}

const woodTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = "#7c4a26"; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 46; i++) {
    g.strokeStyle = i % 3 ? "rgba(60,30,12,.35)" : "rgba(170,110,60,.35)";
    g.lineWidth = rnd(1, 3);
    g.beginPath();
    const y = rnd(0, s);
    g.moveTo(0, y);
    for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * .05 + i) * 4);
    g.stroke();
  }
}, { repeat: [1, 3] });

const crumbTex = () => canvasTex(512, (g, s) => {
  g.fillStyle = "#b47b3c"; g.fillRect(0, 0, s, s);
  speckle(g, s, 2600, ["#b07a3d", "#d6a663", "#a46a33", "#dcb06e"], 1, 4);
  speckle(g, s, 60, ["#6b3b18", "#4e2a10"], 1.5, 4);
  g.fillStyle = "#e9d290";
  for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(rnd(40, s - 40), rnd(40, s - 40), rnd(10, 22), rnd(6, 12), rnd(0, 3), 0, Math.PI * 2); g.fill(); }
  speckle(g, s, 260, ["rgba(70,35,12,.45)"], 1, 3);
});

const brownieTopTex = () => canvasTex(512, (g, s) => {
  g.fillStyle = "#3a1d0f"; g.fillRect(0, 0, s, s);
  g.strokeStyle = "rgba(160,110,80,.55)"; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    g.beginPath(); let x = rnd(0, s), y = rnd(0, s); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += rnd(-40, 40); y += rnd(-40, 40); g.lineTo(x, y); }
    g.stroke();
  }
  speckle(g, s, 500, ["rgba(110,60,35,.4)", "rgba(20,8,3,.4)"], 1, 3);
});

const latteSideTex = (stops) => canvasTex(256, (g, s) => {
  const grad = g.createLinearGradient(0, s, 0, 0);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  g.filter = "blur(6px)";
  for (let i = 0; i < 26; i++) {
    g.fillStyle = i % 2 ? "rgba(245,232,210,.35)" : "rgba(90,45,18,.3)";
    g.beginPath(); g.ellipse(rnd(0, s), rnd(s * .35, s * .7), rnd(20, 50), rnd(4, 10), 0, 0, Math.PI * 2); g.fill();
  }
});

/* ---------------- materials ---------------- */
const mat = {
  ceramic: (color = 0xf4efe8) => new THREE.MeshPhysicalMaterial({ color, roughness: .26, clearcoat: .7, clearcoatRoughness: .12 }),
  stoneware: () => new THREE.MeshPhysicalMaterial({
    color: 0xcfc6ba, roughness: .55, clearcoat: .3,
    map: canvasTex(256, (g, s) => { g.fillStyle = "#d9d1c6"; g.fillRect(0, 0, s, s); speckle(g, s, 500, ["#7a6e62", "#5f554b", "#a59a8d"], .6, 1.8); }, { repeat: [3, 2] })
  }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, transmission: 1, thickness: .05, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.3 }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0xd8d4ce, metalness: 1, roughness: .2 }),
  coffee: (color = 0x24110a) => new THREE.MeshPhysicalMaterial({ color, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }),
  ice: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .42, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false }),
  drop: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: .32, clearcoat: 1, envMapIntensity: 1.6 })
};

const shadowed = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const lathe = (pts, material, seg = 128) => new THREE.Mesh(new THREE.LatheGeometry(pts, seg), material);

/* ---------------- shared builders ---------------- */
// Profile helper: radius function R(y), wall thickness, base thickness.
function vessel(R, h, { wall = .035, base = .07, steps = 30 } = {}) {
  const pts = [V2(0, 0), V2(R(0) * .85, 0), V2(R(0), .025)];
  for (let i = 1; i <= steps; i++) { const y = .025 + (h - .025) * i / steps; pts.push(V2(R(y), y)); }
  pts.push(V2(R(h) - wall * .5, h + .012));
  for (let i = steps; i >= 0; i--) { const y = base + (h - base) * i / steps; pts.push(V2(R(y) - wall, y)); }
  pts.push(V2(0, base));
  return pts;
}

function cup({ rb, rt, h, power = .5, material, art, fill = .86, handle = true }) {
  const g = new THREE.Group();
  const R = y => rb + (rt - rb) * Math.pow(Math.min(1, y / h), power);
  g.add(lathe(vessel(R, h), material));
  const yl = .07 + (h - .07) * fill;
  const surf = new THREE.Mesh(new THREE.CircleGeometry(R(yl) - .036, 96),
    new THREE.MeshPhysicalMaterial({ map: surfaceTex(art), roughness: art === "black" ? .06 : .55, clearcoat: art === "black" ? 1 : .2 }));
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = yl;
  g.add(surf);
  if (handle) {
    const hy = h * .58, rw = R(hy), Rh = h * .26;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(Rh, h * .055, 20, 64, Math.PI * 1.15), material);
    torus.rotation.z = -Math.PI * .575;
    torus.position.set(rw + Rh * .2, hy, 0);
    g.add(torus);
  }
  return g;
}

function saucer(r, material = mat.ceramic()) {
  return lathe([V2(0, 0), V2(r * .55, 0), V2(r * .62, .02), V2(r * .95, .075), V2(r, .1), V2(r * .97, .108),
    V2(r * .62, .055), V2(r * .36, .05), V2(r * .34, .062), V2(0, .062)], material);
}

function plate(r) {
  return lathe([V2(0, 0), V2(r * .48, 0), V2(r * .52, .015), V2(r * .86, .05), V2(r, .1), V2(r * 1.02, .12),
    V2(r * .99, .125), V2(r * .84, .075), V2(r * .5, .038), V2(0, .038)], mat.ceramic(0xf6f2ec));
}

function bean(scale = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x4a2412, roughness: .35, clearcoat: .7 }));
  m.scale.set(.075 * scale, .05 * scale, .11 * scale);
  const crease = new THREE.Mesh(new THREE.BoxGeometry(.012 * scale, .01 * scale, .17 * scale), new THREE.MeshStandardMaterial({ color: 0x1c0c05 }));
  crease.position.y = .048 * scale;
  const g = new THREE.Group(); g.add(m, crease);
  return g;
}

function glassVessel({ rb, rt, h, wall = .028, base = .1 }) {
  const R = y => lerp(rb, rt, Math.min(1, y / h));
  return { R, mesh: lathe(vessel(R, h, { wall, base }), mat.glass()) };
}

// Liquid as a tapered cylinder that sits inside a glass vessel.
function liquidIn(R, base, top, sideMat, topMat, wall = .028) {
  const hgt = top - base;
  const geo = new THREE.CylinderGeometry(R(top) - wall - .006, R(base) - wall - .006, hgt, 96, 1);
  const m = new THREE.Mesh(geo, [sideMat, topMat, sideMat]);
  m.position.y = base + hgt / 2;
  return m;
}

function iceCubes(R, yTop, n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = rnd(.24, .3);
    const c = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 4, .055), mat.ice());
    const a = (i / n) * Math.PI * 2 + rnd(-.3, .3), r = R(yTop) * rnd(.25, .5);
    c.position.set(Math.cos(a) * r, yTop - rnd(-.04, .12), Math.sin(a) * r);
    c.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1));
    g.add(c);
  }
  return g;
}

function droplets(R, yMin, yMax, n) {
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const inst = new THREE.InstancedMesh(geo, mat.drop(), n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const y = rnd(yMin, yMax), a = rnd(-1.4, 1.4) + Math.PI / 2, r = R(y) + .004, s = rnd(.005, .011);
    m4.compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.3, s * .6));
    inst.setMatrixAt(i, m4);
  }
  return inst;
}

function crystals(n, spread, y, size = .022) {
  const g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, transparent: true, opacity: .85, clearcoat: 1 });
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(size, size * .8, size), m);
    c.position.set(rnd(-spread, spread), y, rnd(-spread, spread));
    c.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    g.add(c);
  }
  return g;
}

/* ---------------- the 13 items ---------------- */
const ITEMS = {
  "espresso"() {
    const g = new THREE.Group();
    g.add(saucer(.68));
    const c = cup({ rb: .26, rt: .38, h: .44, power: .6, material: mat.ceramic(), art: "crema", fill: .8 });
    c.position.y = .062; c.rotation.y = -.5;
    g.add(c);
    [[.55, .08, .35, .3], [.62, .07, -.05, 2.1], [-.48, .07, .52, 1.2]].forEach(([x, y, z, r]) => {
      const b = bean(1.1); b.position.set(x, y + .02, z); b.rotation.set(0, r, .1); g.add(b);
    });
    return g;
  },
  "americano"() {
    const g = new THREE.Group();
    g.add(saucer(.82));
    const c = cup({ rb: .3, rt: .47, h: .7, power: .75, material: mat.ceramic(0xefe7dc), art: "black", fill: .84 });
    c.position.y = .062; c.rotation.y = -.5;
    g.add(c);
    return g;
  },
  "cappuccino"() {
    const g = new THREE.Group();
    g.add(saucer(.9));
    const c = cup({ rb: .28, rt: .6, h: .5, power: .45, material: mat.ceramic(), art: "heart", fill: .93 });
    c.position.y = .062; c.rotation.y = -.5;
    g.add(c);
    return g;
  },
  "flat-white"() {
    const g = new THREE.Group();
    g.add(saucer(.78, mat.stoneware()));
    const c = cup({ rb: .3, rt: .47, h: .48, power: .55, material: mat.stoneware(), art: "rosetta", fill: .92 });
    c.position.y = .062; c.rotation.y = -.5;
    g.add(c);
    return g;
  },
  "khorsheds-latte"() {
    const g = new THREE.Group();
    g.add(saucer(.72));
    const { R, mesh } = glassVessel({ rb: .27, rt: .34, h: 1.0 });
    const v = new THREE.Group(); v.position.y = .062;
    v.add(mesh);
    const side = new THREE.MeshPhysicalMaterial({ map: latteSideTex([[0, "#7e431c"], [.4, "#b07038"], [.66, "#dcc09a"], [1, "#f4eadb"]]), roughness: .4 });
    v.add(liquidIn(R, .1, .92, side, new THREE.MeshPhysicalMaterial({ map: surfaceTex("caramel"), roughness: .5 })));
    const salt = crystals(14, .14, .935, .026); v.add(salt);
    // caramel drip on the rim
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(.022, .16, 6, 12), mat.coffee(0xb06a2a));
    drip.position.set(R(.86) + .004, .86, .08); v.add(drip);
    g.add(v);
    return g;
  },
  "v60-pour-over"() {
    const g = new THREE.Group();
    // glass server
    const prof = y => (y < .36 ? lerp(.3, .5, Math.sin((y / .36) * Math.PI / 2))
      : y < .74 ? lerp(.5, .36, (y - .36) / .38) : lerp(.36, .4, (y - .74) / .08));
    g.add(lathe(vessel(prof, .82, { wall: .024, base: .03 }), mat.glass()));
    const fillY = .44, pts = [V2(0, .035)];
    for (let i = 0; i <= 20; i++) { const y = .035 + (fillY - .035) * i / 20; pts.push(V2(prof(y) - .032, y)); }
    pts.push(V2(0, fillY));
    g.add(lathe(pts, mat.coffee(0x2a1208)));
    // terracotta dripper
    const clay = new THREE.MeshPhysicalMaterial({ color: 0x9c4529, roughness: .5, clearcoat: .3 });
    const cone = y => .09 + ((y - .92) / .42) * .43;
    const dp = [V2(0, .82), V2(.44, .82), V2(.45, .845), V2(.44, .865), V2(.15, .865), V2(.14, .9)];
    for (let i = 1; i <= 12; i++) { const y = .9 + .44 * i / 12; dp.push(V2(cone(y) + .05, y)); }
    dp.push(V2(.6, 1.36), V2(.57, 1.375));
    for (let i = 12; i >= 0; i--) { const y = .92 + .42 * i / 12; dp.push(V2(cone(y), y)); }
    dp.push(V2(0, .92));
    g.add(lathe(dp, clay));
    const paper = lathe([V2(cone(1.2) - .005, 1.2), V2(.555, 1.36), V2(.59, 1.44), V2(.58, 1.445), V2(.545, 1.365), V2(cone(1.2) - .01, 1.2)],
      new THREE.MeshStandardMaterial({ color: 0xf1e6d0, roughness: .9, side: THREE.DoubleSide }));
    g.add(paper);
    const bed = new THREE.Mesh(new THREE.CircleGeometry(cone(1.2) - .01, 64), new THREE.MeshStandardMaterial({
      map: canvasTex(256, (c, s) => { c.fillStyle = "#4a2614"; c.fillRect(0, 0, s, s); speckle(c, s, 900, ["#2e160a", "#6b3a1c", "#8a5530"], 1, 3); speckle(c, s, 40, ["rgba(220,170,110,.6)"], 3, 7); }),
      roughness: .9
    }));
    bed.rotation.x = -Math.PI / 2; bed.position.y = 1.2;
    g.add(bed);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.15, .045, 16, 48, Math.PI * 1.1), clay);
    handle.rotation.z = -Math.PI * .55; handle.position.set(cone(1.12) + .1, 1.12, 0);
    g.add(handle);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(.012, .014, .82 - fillY, 12), mat.coffee(0x5a2c10));
    stream.position.y = (.82 + fillY) / 2;
    g.add(stream);
    g.rotation.y = -.5;
    return g;
  },
  "french-press"() {
    const g = new THREE.Group();
    const steel = mat.steel(), wood = new THREE.MeshPhysicalMaterial({ map: woodTex(), roughness: .45, clearcoat: .5 });
    const R = () => .4;
    const glass = lathe(vessel(R, 1.22, { wall: .02, base: .04 }), mat.glass());
    glass.position.y = .07; g.add(glass);
    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .84, 64), mat.coffee(0x1e0d05));
    coffee.position.y = .12 + .42; g.add(coffee);
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .05, 64), new THREE.MeshPhysicalMaterial({ color: 0x8a5228, roughness: .5 }));
    foam.position.y = .985; g.add(foam);
    const plunger = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .02, 64), steel);
    plunger.position.y = 1.06; g.add(plunger);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .9, 12), steel);
    rod.position.y = 1.5; g.add(rod);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.43, .44, .09, 64), steel);
    base.position.y = .045; g.add(base);
    const ringT = new THREE.Mesh(new THREE.TorusGeometry(.42, .02, 12, 64), steel);
    ringT.rotation.x = Math.PI / 2; ringT.position.y = 1.2; g.add(ringT);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .07, 64), steel);
    lid.position.y = 1.33; g.add(lid);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.085, 32, 24), wood);
    knob.position.y = 1.97; g.add(knob);
    [Math.PI * .85, Math.PI * 1.15, 0].forEach(a => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.14, .014), steel);
      band.position.set(Math.cos(a) * .425, .66, Math.sin(a) * .425);
      band.rotation.y = -a + Math.PI / 2;
      g.add(band);
    });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.44, 1.12, 0), new THREE.Vector3(.72, 1.1, 0), new THREE.Vector3(.82, .82, 0),
      new THREE.Vector3(.74, .36, 0), new THREE.Vector3(.44, .3, 0)
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .06, 16), wood));
    g.rotation.y = -.6;
    return g;
  },
  "cold-brew"() {
    const g = new THREE.Group();
    const { R, mesh } = glassVessel({ rb: .29, rt: .37, h: 1.3 });
    g.add(mesh);
    const amber = new THREE.MeshPhysicalMaterial({ color: 0x5c2a0c, roughness: .1, clearcoat: 1, sheen: .4, sheenColor: new THREE.Color(0xc0763a) });
    g.add(liquidIn(R, .1, 1.1, amber, mat.coffee(0x3a1906)));
    g.add(iceCubes(R, 1.1, 5));
    g.add(droplets(R, .18, 1.2, 70));
    return g;
  },
  "iced-spanish-latte"() {
    const g = new THREE.Group();
    const { R, mesh } = glassVessel({ rb: .31, rt: .38, h: 1.2 });
    g.add(mesh);
    const side = new THREE.MeshPhysicalMaterial({
      map: latteSideTex([[0, "#f1e5d0"], [.42, "#e8d2ae"], [.58, "#c08650"], [.8, "#8a4e24"], [1, "#6a3818"]]), roughness: .3, clearcoat: .6
    });
    g.add(liquidIn(R, .1, 1.04, side, new THREE.MeshPhysicalMaterial({ color: 0x7a4522, roughness: .3 })));
    g.add(iceCubes(R, 1.04, 4));
    g.add(droplets(R, .2, 1.1, 50));
    return g;
  },
  "butter-croissant"() {
    const g = new THREE.Group();
    g.add(plate(1.0));
    const stripes = canvasTex(256, (c, s) => {
      for (let y = 0; y < s; y += 4) {
        const k = Math.sin(y * .18);
        c.fillStyle = k > .55 ? "#6e300c" : k > 0 ? "#a85f1f" : "#cf8a38";
        c.fillRect(0, y, s, 4);
      }
      speckle(c, s, 300, ["rgba(255,230,180,.25)", "rgba(90,45,15,.25)"], .5, 1.5);
    });
    const gold = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: .42, clearcoat: .55, clearcoatRoughness: .3, bumpMap: noiseTex(90, [3, 3]), bumpScale: .015 });
    const cr = new THREE.Group();
    const R = .6;
    for (let i = -3; i <= 3; i++) {
      const a = i * .32, s = 1 - Math.abs(i) * .16;
      const geo = new THREE.SphereGeometry(1, 48, 32);
      geo.rotateX(Math.PI / 2);
      const lobe = new THREE.Mesh(geo, gold);
      lobe.scale.set(.27 * s, .3 * s, .42 * s);
      lobe.position.set(Math.sin(a) * R, .26 * s + .03, R - Math.cos(a) * R + Math.abs(i) * .025);
      lobe.rotation.y = -a;
      cr.add(lobe);
    }
    [-1, 1].forEach(side => {
      const tip = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .22, 8, 16), gold);
      const a = side * 1.15;
      tip.position.set(Math.sin(a) * R * 1.02, .1, R - Math.cos(a) * R + .1);
      tip.rotation.set(Math.PI / 2, 0, side * .9);
      cr.add(tip);
    });
    cr.position.set(0, .04, -.25);
    cr.rotation.y = .3;
    g.add(cr);
    return g;
  },
  "banana-bread"() {
    const g = new THREE.Group();
    g.add(plate(1.0));
    const sh = new THREE.Shape();
    const w = .6, hs = .5;
    sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(w, hs);
    sh.quadraticCurveTo(w, hs + .36, 0, hs + .38);
    sh.quadraticCurveTo(-w, hs + .36, -w, hs); sh.lineTo(-w, 0);
    const crumb = crumbTex(); crumb.wrapS = crumb.wrapT = THREE.RepeatWrapping; crumb.repeat.set(.8, .8);
    const crumbMat = new THREE.MeshPhysicalMaterial({ map: crumb, roughness: .85, bumpMap: noiseTex(120, [2, 2]), bumpScale: .03 });
    const crustMat = new THREE.MeshPhysicalMaterial({ color: 0x6b3615, roughness: .5, clearcoat: .3, bumpMap: noiseTex(90, [4, 4]), bumpScale: .02 });
    const mk = () => {
      const geo = new THREE.ExtrudeGeometry(sh, { depth: .26, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 3, curveSegments: 24 });
      geo.center();
      return new THREE.Mesh(geo, [crumbMat, crustMat]);
    };
    const lying = mk();
    lying.rotation.set(-Math.PI / 2, 0, .35);
    lying.position.set(.05, .19, .12);
    g.add(lying);
    const standing = mk();
    standing.rotation.set(-.12, .25, 0);
    standing.position.set(-.18, .5, -.42);
    g.add(standing);
    const butter = new THREE.Mesh(new RoundedBoxGeometry(.34, .1, .26, 4, .03),
      new THREE.MeshPhysicalMaterial({ color: 0xf3d98a, roughness: .25, clearcoat: .6 }));
    butter.position.set(.12, .37, .18); butter.rotation.y = .5;
    g.add(butter);
    return g;
  },
  "chocolate-brownie"() {
    const g = new THREE.Group();
    g.add(plate(.95));
    const top = new THREE.MeshPhysicalMaterial({ map: brownieTopTex(), roughness: .28, clearcoat: .9, clearcoatRoughness: .2, bumpMap: noiseTex(110, [2, 2]), bumpScale: .025 });
    const side = new THREE.MeshPhysicalMaterial({ color: 0x2c1509, roughness: .85, bumpMap: noiseTex(160, [3, 3]), bumpScale: .05 });
    const mk = () => new THREE.Mesh(new RoundedBoxGeometry(.78, .38, .78, 6, .05), [side, side, top, side, side, side]);
    const a = mk(); a.position.set(-.08, .23, .12); a.rotation.y = .4; g.add(a);
    const b = mk(); b.position.set(.22, .6, -.08); b.rotation.set(.06, -.35, .04); g.add(b);
    const salt = crystals(16, .22, .8, .03); salt.position.set(.22, 0, -.08); g.add(salt);
    return g;
  },
  "cheesecake"() {
    const g = new THREE.Group();
    g.add(plate(1.05));
    const R = 1.0, th = .68;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(R, 0); sh.absarc(0, 0, R, 0, th, false); sh.lineTo(0, 0);
    const opts = d => ({ depth: d, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 3, curveSegments: 48 });
    const body = new THREE.ExtrudeGeometry(sh, opts(.6));
    body.rotateX(-Math.PI / 2);
    const crustGeo = new THREE.ExtrudeGeometry(sh, opts(.1));
    crustGeo.rotateX(-Math.PI / 2);
    const cream = new THREE.MeshPhysicalMaterial({ color: 0xead2a2, roughness: .55, clearcoat: .15, bumpMap: noiseTex(40, [3, 3]), bumpScale: .006 });
    const topMat = new THREE.MeshPhysicalMaterial({ color: 0xc98f4a, roughness: .4, clearcoat: .4 });
    const crust = new THREE.MeshPhysicalMaterial({ color: 0xa8713a, roughness: .9, bumpMap: noiseTex(160, [4, 4]), bumpScale: .04 });
    const slice = new THREE.Group();
    const cb = new THREE.Mesh(crustGeo, crust); cb.position.y = .05;
    const bd = new THREE.Mesh(body, [topMat, cream]); bd.position.y = .17;
    slice.add(cb, bd);
    // centre the wedge on the plate, tip pointing to the front-left
    slice.position.set(-R * .55, 0, R * .3);
    const holder = new THREE.Group(); holder.add(slice); holder.rotation.y = -.35 + Math.PI * .85;
    g.add(holder);
    const sauce = new THREE.MeshPhysicalMaterial({ color: 0xa9601f, roughness: .05, clearcoat: 1 });
    [[.55, .25, .1], [.68, -.05, .07], [.6, .45, .05]].forEach(([x, z, r]) => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), sauce);
      d.scale.y = .35; d.position.set(x, .04, z); g.add(d);
    });
    return g;
  }
};

/* ---------------- studio ---------------- */
const blobTex = canvasTex(256, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, "rgba(70,40,20,.55)"); gr.addColorStop(.55, "rgba(70,40,20,.22)"); gr.addColorStop(1, "rgba(70,40,20,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

function renderItem(slug) {
  seed = 11 + [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.environment = envMap;

  const item = shadowed(ITEMS[slug]());
  scene.add(item);

  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x8a6a50, .35));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(-3.5, 6, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: .5, far: 20 });
  key.shadow.bias = -.0004;
  key.shadow.normalBias = .02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffdcb8, .5); fill.position.set(5, 2.5, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, .9); rim.position.set(1, 4, -5); scene.add(rim);

  const box = new THREE.Box3().setFromObject(item);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = box.min.y; ground.receiveShadow = true;
  scene.add(ground);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(Math.max(size.x, size.z) * .66, 64),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = box.min.y + .002;
  scene.add(blob);

  const camera = new THREE.PerspectiveCamera(28, 1, .05, 100);
  const dir = new THREE.Vector3(0, .5, 1).normalize();
  const radius = size.length() / 2;
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(28) / 2);
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.lookAt(center);

  renderer.render(scene, camera);

  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach(m => { m.map?.dispose(); m.bumpMap?.dispose(); m.dispose(); });
  });
  return new Promise(res => renderer.domElement.toBlob(res, "image/webp", .88));
}

/* ---------------- run ---------------- */
const out = document.getElementById("out");
const status = document.getElementById("status");
const params = new URLSearchParams(location.search);
const save = params.has("save");
const only = params.get("only");
const slugs = Object.keys(ITEMS).filter(s => !only || s === only);
const results = {};

const blobToDataURL = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

for (const slug of slugs) {
  status.textContent = `Rendering ${slug}…`;
  await new Promise(r => setTimeout(r, 30));
  const blob = await renderItem(slug);
  const url = URL.createObjectURL(blob);
  const fig = document.createElement("figure");
  fig.innerHTML = `<img alt="${slug}" src="${url}"><figcaption><span>${slug}</span><a download="${slug}.webp" href="${url}">Download</a></figcaption>`;
  out.appendChild(fig);
  results[slug] = { bytes: blob.size };
  if (save) {
    const res = await fetch("save-render.php", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, data: await blobToDataURL(blob) })
    });
    results[slug].saved = res.ok;
  }
}
status.textContent = `Done — ${slugs.length} image${slugs.length > 1 ? "s" : ""} rendered${save ? " and saved" : ""}.`;
window.__renderResults = results;
