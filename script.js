(() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = s => document.querySelector(s);

  // seeded random so the art looks the same on every load
  let seed = 42;
  const rand = (a = 0, b = 1) => {
    seed = (seed * 16807) % 2147483647;
    return a + (b - a) * ((seed - 1) / 2147483646);
  };

  /* ---------- build falling grounds ---------- */
  const groundsG = $("#grounds");
  const grounds = [];
  const groundColors = ["#2b150a", "#3d2010", "#55301a", "#1d0e06"];
  for (let i = 0; i < 54; i++) {
    const el = document.createElementNS(SVGNS, "ellipse");
    const r = rand(1.8, 3.6);
    el.setAttribute("rx", r);
    el.setAttribute("ry", r * rand(.55, .8));
    el.setAttribute("fill", groundColors[i % groundColors.length]);
    el.setAttribute("opacity", 0);
    groundsG.appendChild(el);
    grounds.push({
      el,
      x0: 200 + rand(-14, 14), y0: rand(196, 236),
      x1: 200 + rand(-38, 38), y1: rand(420, 500),
      wob: rand(-18, 18), rot: rand(0, 360),
      start: .16 + (i / 54) * .34
    });
  }

  /* ---------- speckles on the ceramic cup ---------- */
  const speckG = $("#speckles");
  for (let i = 0; i < 90; i++) {
    const y = rand(8, 165);
    const half = 140 * Math.sqrt(1 - Math.pow(y / 178, 2)) - 6;
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", rand(-half, half));
    c.setAttribute("cy", y);
    c.setAttribute("r", rand(.7, 1.8));
    c.setAttribute("fill", "#6f5f50");
    c.setAttribute("opacity", rand(.25, .6));
    speckG.appendChild(c);
  }

  /* ---------- ribbon lengths ---------- */
  const ribbons = ["#ribbonA", "#ribbonB"].map(s => {
    const el = $(s);
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    return { el, len };
  });

  /* ---------- element refs ---------- */
  const el = {
    beanL: $("#beanLeft"), beanR: $("#beanRight"),
    gFill: $("#groundsFill"), gTop: $("#groundsTop"), stream1: $("#stream1"),
    heroTitle: $(".hero-title"), heroSide: $(".scene-1 .side"), explore: $(".explore"),
    streamIn: $("#streamIn"), kettle: $("#kettleG"), water: $("#water"), bed: $("#bedTop"),
    drip: $("#drip"), brew: $("#brewFill"), bloomTitle: $(".bloom-title"), bloomSide: $(".side-bottom"),
    num2: $(".num-corner"),
    marble: $("#marbleG"), cup: $("#cup"), art: $("#art"), drops: $("#drops"),
    cards: [...document.querySelectorAll(".card")], tasteCopy: $(".taste-copy"),
    nav: $(".nav"), fabRing: $("#fabRing")
  };
  const cardRot = [-9, 7, 5];

  /* ---------- scene updates ---------- */
  function scene1(p) {
    const s = ease(seg(p, .06, .38));
    const up = ease(seg(p, .55, .95)) * -20;
    el.beanL.setAttribute("transform", `translate(${-34 * s} ${10 * s + up}) rotate(${-24 * s} 200 250)`);
    el.beanR.setAttribute("transform", `translate(${34 * s} ${10 * s + up}) rotate(${24 * s} 200 250)`);

    for (const g of grounds) {
      const t = seg(p, g.start, g.start + .2);
      if (t <= 0 || t >= 1) { g.el.setAttribute("opacity", 0); continue; }
      const k = t * t; // gravity
      const x = lerp(g.x0, g.x1, t) + Math.sin(t * Math.PI) * g.wob;
      const y = lerp(g.y0, g.y1, k);
      g.el.setAttribute("cx", x);
      g.el.setAttribute("cy", y);
      g.el.setAttribute("transform", `rotate(${g.rot + t * 200} ${x} ${y})`);
      g.el.setAttribute("opacity", 1);
    }

    const f = seg(p, .24, .66);
    const h = 128 * f;
    el.gFill.setAttribute("y", 514 - h);
    el.gFill.setAttribute("height", h);
    el.gTop.setAttribute("y", 514 - h - 3);
    el.gTop.setAttribute("opacity", f > 0 ? 1 : 0);

    const st = ease(seg(p, .58, .86));
    el.stream1.setAttribute("height", (720 - 528) * st);

    el.heroTitle.style.transform = `translateY(${p * -6}vh)`;
    el.heroSide.style.transform = `translateY(${p * -10}vh)`;
    el.explore.style.opacity = 1 - seg(p, .1, .3);
  }

  function scene2(p) {
    const cut = 190 * seg(p, .04, .3);
    el.streamIn.setAttribute("y", cut);
    el.streamIn.setAttribute("height", Math.max(0, 190 - cut));

    const k = ease(seg(p, 0, .22));
    el.kettle.setAttribute("transform", `translate(${(1 - k) * 120} ${(1 - k) * -60})`);
    el.water.style.strokeDashoffset = 120 * (1 - seg(p, .18, .3));
    el.water.style.opacity = 1 - seg(p, .9, .98);

    el.bed.setAttribute("ry", 13 + 5 * Math.sin(seg(p, .2, .45) * Math.PI));

    const fill = seg(p, .3, .95);
    const fh = 200 * ease(fill);
    const surface = 632 - fh;
    el.brew.setAttribute("y", surface);
    el.brew.setAttribute("height", fh);
    const d = seg(p, .24, .34);
    el.drip.setAttribute("height", Math.max(0, (surface - 312) * d));

    const t = ease(seg(p, .02, .32));
    el.bloomTitle.style.transform = `translateY(${(1 - t) * 50}vh)`;
    el.bloomSide.style.opacity = seg(p, .3, .5);
    el.bloomSide.style.transform = `translateY(${(1 - seg(p, .3, .5)) * 30}px)`;
    el.num2.style.opacity = seg(p, 0, .15);
  }

  function scene3(p) {
    const r = ease(seg(p, 0, .45));
    for (const rb of ribbons) rb.el.style.strokeDashoffset = rb.len * (1 - r);
    const dr = seg(p, .15, .5);
    el.drops.style.opacity = dr > 0 && dr < 1 ? Math.sin(dr * Math.PI) : 0;
    el.drops.setAttribute("transform", `translate(0 ${dr * 120})`);

    const c = ease(seg(p, 0, .4));
    el.cup.setAttribute("transform", `translate(300 ${lerp(540, 470, c)}) scale(${lerp(.82, 1, c)})`);
    const a = ease(seg(p, .32, .55));
    el.art.style.opacity = a;
    el.art.setAttribute("transform", `scale(${lerp(.4, 1, a)} ${.43 * lerp(.4, 1, a)})`);

    el.marble.style.transform = `rotate(${p * 10}deg) scale(${1.15 + p * .1})`;

    el.cards.forEach((card, i) => {
      const t = ease(seg(p, .5 + i * .08, .68 + i * .08));
      card.style.opacity = t;
      card.style.transform = `translateY(${(1 - t) * 50}px) rotate(${cardRot[i] * t}deg)`;
    });

    const tc = ease(seg(p, 0, .3));
    el.tasteCopy.style.opacity = .15 + .85 * tc;
    el.tasteCopy.style.transform = `translateX(${(1 - tc) * 40}px)`;
  }

  const scenes = [...document.querySelectorAll(".scene")].map(node => ({
    node,
    fn: { 1: scene1, 2: scene2, 3: scene3 }[node.dataset.scene]
  }));

  /* ---------- scroll loop ---------- */
  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    for (const s of scenes) {
      const r = s.node.getBoundingClientRect();
      const travel = r.height - vh;
      if (!(travel > 0) || r.bottom < -vh || r.top > vh * 2) continue;
      s.fn(clamp(-r.top / travel));
    }
    const max = document.documentElement.scrollHeight - vh;
    const prog = max > 0 ? window.scrollY / max : 0;
    el.fabRing.style.strokeDashoffset = 119.4 * (1 - prog);
    el.nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  /* ---------- reveals & counters ---------- */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(e.target);
    }
  }, { threshold: .2 });
  document.querySelectorAll(".reveal").forEach(n => io.observe(n));

  function countUp(node) {
    const target = +node.dataset.count;
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / 1400);
      node.textContent = Math.round(target * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  $("#year").textContent = new Date().getFullYear();
})();
