/* =========================================================
   Coffee With KHORSHED — customer reviews
   Talks to api/reviews.php. If that isn't available (e.g. the
   site is opened as a plain file), reviews are kept in this
   browser instead so the section still works.
   ========================================================= */
(() => {
  const API = "api/reviews.php";
  const LOCAL_KEY = "cwk-reviews";
  const MINE_KEY = "cwk-my-reviews";
  const PAGE = 6;
  const WORDS = ["Tap a star", "Poor", "Fair", "Good", "Very good", "Excellent"];
  const AVATAR = ["#8a4b23", "#b8763e", "#5c4a3d", "#c46a46", "#2a1a10", "#7a5418", "#6b3a1c"];
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z"/></svg>';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  let mode = "server";
  let all = [];
  let starFilter = 0;
  let sort = "new";
  let shown = PAGE;
  let mine = new Set(store.get(MINE_KEY, []));
  let fresh = null; // id of a review just posted, to highlight

  const el = {
    avg: $("#rvAverage"), avgStars: $("#rvAvgStars"), count: $("#rvCount"), bars: $("#rvBars"),
    list: $("#reviewList"), empty: $("#rvEmpty"), more: $("#rvMore"), showing: $("#rvShowing"),
    clear: $("#rvClear"), sort: $("#rvSort"), note: $("#rvNote"),
    form: $("#reviewForm"), starInput: $("#starInput"), starWord: $("#starWord"), starError: $("#starError"),
    chars: $("#rvChars"), submit: $("#rvSubmit"), status: $("#rvStatus")
  };

  /* ---------------- helpers ---------------- */
  function starsHTML(value, size = 16) {
    const gap = 2;
    const full = Math.floor(value);
    const w = full * (size + gap) + (value - full) * size;
    const row = STAR.repeat(5);
    return `<span class="s-base">${row}</span><span class="s-top" style="width:${w}px">${row}</span>`;
  }
  function stars(value, size) {
    return `<span class="stars${size > 16 ? " stars-lg" : ""}" role="img" aria-label="${value} out of 5 stars">${starsHTML(value, size)}</span>`;
  }
  function colorFor(name) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return AVATAR[h % AVATAR.length];
  }
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  function ago(iso) {
    const d = new Date(iso);
    const s = (d - Date.now()) / 1000;
    const steps = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.345, "week"], [12, "month"], [Infinity, "year"]];
    let v = s;
    for (const [n, unit] of steps) {
      if (Math.abs(v) < n) return Math.abs(v) < 45 && unit === "second" ? "just now" : rtf.format(Math.round(v), unit);
      v /= n;
    }
  }
  function stats() {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of all) { dist[r.rating]++; sum += r.rating; }
    return { count: all.length, average: all.length ? sum / all.length : 0, dist };
  }

  /* ---------------- render ---------------- */
  function renderSummary() {
    const st = stats();
    el.avg.textContent = st.average.toFixed(1);
    el.avgStars.innerHTML = starsHTML(Math.round(st.average * 10) / 10, 22);
    el.avgStars.setAttribute("aria-label", `${st.average.toFixed(1)} out of 5 stars`);
    el.count.textContent = st.count ? `Based on ${st.count} review${st.count > 1 ? "s" : ""}` : "No reviews yet";
    el.bars.innerHTML = [5, 4, 3, 2, 1].map(n => {
      const c = st.dist[n];
      const pct = st.count ? (c / st.count) * 100 : 0;
      return `<li><button type="button" data-star="${n}" class="${starFilter === n ? "active" : ""}" ${c ? "" : "disabled"}
        aria-pressed="${starFilter === n}" aria-label="Show ${n}-star reviews (${c})">
        <span>${n} ★</span><span class="bar"><i style="width:${pct}%"></i></span><span class="n">${c}</span></button></li>`;
    }).join("");
  }

  function visible() {
    let list = starFilter ? all.filter(r => r.rating === starFilter) : [...all];
    if (sort === "new") list.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "high") list.sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date));
    if (sort === "low") list.sort((a, b) => a.rating - b.rating || b.date.localeCompare(a.date));
    return list;
  }

  function card(r) {
    const li = document.createElement("li");
    li.className = "rv-card" + (mine.has(r.id) ? " mine" : "");
    li.dataset.id = r.id;
    li.innerHTML = `
      <div class="rv-head">
        <span class="rv-avatar"></span>
        <div class="rv-who"><b></b><time></time></div>
        ${mine.has(r.id) ? '<span class="rv-badge">Your review</span>' : ""}
      </div>
      ${stars(r.rating, 16)}
      <p class="rv-text"></p>`;
    // user content goes in as text only
    const name = r.name;
    $(".rv-avatar", li).textContent = name.trim().charAt(0).toUpperCase();
    $(".rv-avatar", li).style.background = colorFor(name);
    $(".rv-who b", li).textContent = name;
    const t = $("time", li);
    t.dateTime = r.date;
    t.textContent = ago(r.date);
    t.title = new Date(r.date).toLocaleString();
    const p = $(".rv-text", li);
    p.textContent = r.text;
    if (r.text.length > 260 || r.text.split("\n").length > 5) {
      p.classList.add("clamped");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rv-read";
      b.textContent = "Read more";
      b.addEventListener("click", () => {
        const open = p.classList.toggle("clamped");
        b.textContent = open ? "Read more" : "Show less";
      });
      li.appendChild(b);
    }
    return li;
  }

  function renderList() {
    const list = visible();
    el.list.replaceChildren(...list.slice(0, shown).map(card));
    el.empty.hidden = all.length > 0;
    el.more.hidden = list.length <= shown;
    el.clear.hidden = !starFilter;
    el.showing.textContent = !all.length ? "" :
      `Showing ${Math.min(shown, list.length)} of ${list.length}${starFilter ? ` ${starFilter}-star` : ""} review${list.length === 1 ? "" : "s"}`;
    if (fresh) {
      const c = el.list.querySelector(`[data-id="${fresh}"]`);
      if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
      fresh = null;
    }
  }

  function render() { renderSummary(); renderList(); }

  /* ---------------- data ---------------- */
  async function load(quiet = false) {
    try {
      const res = await fetch(API, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) throw new Error("no api");
      const data = await res.json();
      if (!Array.isArray(data.reviews)) throw new Error("bad data");
      const changed = data.reviews.length !== all.length || data.reviews[0]?.id !== visible()[0]?.id;
      mode = "server";
      all = data.reviews;
      el.note.hidden = true;
      if (!quiet || changed) render();
    } catch {
      if (quiet && mode === "server" && all.length) return; // temporary blip, keep what we have
      mode = "local";
      all = store.get(LOCAL_KEY, []);
      el.note.hidden = false;
      el.note.textContent = "Preview mode: reviews are saved on this device only.";
      render();
    }
  }

  /* ---------------- star input ---------------- */
  const starLabels = $$(".star-row label", el.form);
  let rating = 0;
  function light(n) { starLabels.forEach((l, i) => l.classList.toggle("lit", i < n)); }
  starLabels.forEach((l, i) => {
    l.addEventListener("mouseenter", () => { light(i + 1); el.starWord.textContent = WORDS[i + 1]; });
  });
  $(".star-row", el.form).addEventListener("mouseleave", () => { light(rating); el.starWord.textContent = WORDS[rating]; });
  el.form.addEventListener("change", e => {
    if (e.target.name !== "rating") return;
    rating = +e.target.value;
    light(rating);
    el.starWord.textContent = WORDS[rating];
    el.starError.textContent = "";
    el.starInput.classList.remove("invalid");
    const lab = starLabels[rating - 1];
    lab.classList.remove("pop"); void lab.offsetWidth; lab.classList.add("pop");
  });

  const textArea = el.form.elements.text;
  textArea.addEventListener("input", () => {
    el.chars.textContent = textArea.value.length;
    el.chars.parentElement.classList.toggle("warn", textArea.value.length > 560);
  });

  /* ---------------- submit ---------------- */
  function fieldError(input, msg) {
    const f = input.closest(".field");
    f.classList.toggle("invalid", !!msg);
    $("em", f).textContent = msg || "";
    input.setAttribute("aria-invalid", !!msg);
  }
  function status(msg, kind) {
    el.status.textContent = msg;
    el.status.className = "rv-status " + (kind || "");
  }

  function validate() {
    const f = el.form.elements;
    const errs = {};
    if (!rating) errs.rating = "Please choose a star rating.";
    if (f.name.value.trim().length < 2) errs.name = "Please enter your name (at least 2 letters).";
    if (f.text.value.trim().length < 10) errs.text = "Please write at least 10 characters.";
    showErrors(errs);
    return !Object.keys(errs).length;
  }
  function showErrors(errs) {
    const f = el.form.elements;
    el.starError.textContent = errs.rating || "";
    el.starInput.classList.toggle("invalid", !!errs.rating);
    fieldError(f.name, errs.name);
    fieldError(f.text, errs.text);
    if (errs.rating) f.rating[0].focus();
    else if (errs.name) f.name.focus();
    else if (errs.text) f.text.focus();
  }

  function remember(review) {
    mine.add(review.id);
    store.set(MINE_KEY, [...mine]);
    const saved = store.get("cwk-customer", {});
    store.set("cwk-customer", { ...saved, name: review.name });
  }

  function afterPost(review) {
    remember(review);
    all = [review, ...all.filter(r => r.id !== review.id)];
    starFilter = 0;
    sort = "new";
    el.sort.value = "new";
    shown = Math.max(shown, PAGE);
    fresh = review.id;
    el.form.reset();
    el.form.elements.name.value = review.name;
    rating = 0;
    light(0);
    el.starWord.textContent = WORDS[0];
    el.chars.textContent = "0";
    render();
    status("Thank you! Your review is now live. ☕", "ok");
    setTimeout(() => { if (el.status.classList.contains("ok")) status(""); }, 6000);
  }

  el.form.addEventListener("submit", async e => {
    e.preventDefault();
    status("");
    if (!validate()) return;
    const f = el.form.elements;
    const payload = { name: f.name.value.trim(), rating, text: f.text.value.trim(), website: f.website.value };

    if (mode === "local") {
      const review = { id: Math.random().toString(16).slice(2, 14), name: payload.name.slice(0, 40), rating, text: payload.text.slice(0, 600), date: new Date().toISOString() };
      store.set(LOCAL_KEY, [review, ...store.get(LOCAL_KEY, [])]);
      return afterPost(review);
    }

    el.submit.setAttribute("aria-busy", "true");
    el.submit.textContent = "Posting…";
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data.review) afterPost(data.review);
      else if (res.status === 422 && data.fields) { showErrors(data.fields); status(data.error, "err"); }
      else status(data.error || "Sorry, something went wrong. Please try again.", "err");
    } catch {
      status("Couldn't reach the server. Check your connection and try again.", "err");
    } finally {
      el.submit.removeAttribute("aria-busy");
      el.submit.textContent = "Post Review";
    }
  });

  // clear a field's error as soon as the person types
  el.form.addEventListener("input", e => {
    const f = e.target.closest(".field.invalid");
    if (f) { f.classList.remove("invalid"); $("em", f).textContent = ""; }
  });

  /* ---------------- filters ---------------- */
  el.bars.addEventListener("click", e => {
    const b = e.target.closest("[data-star]");
    if (!b || b.disabled) return;
    const n = +b.dataset.star;
    starFilter = starFilter === n ? 0 : n;
    shown = PAGE;
    render();
  });
  el.clear.addEventListener("click", () => { starFilter = 0; shown = PAGE; render(); });
  el.sort.addEventListener("change", () => { sort = el.sort.value; shown = PAGE; renderList(); });
  el.more.addEventListener("click", () => { shown += PAGE; renderList(); });

  /* ---------------- init ---------------- */
  const saved = store.get("cwk-customer", {});
  if (saved.name) el.form.elements.name.value = saved.name;
  render();
  load();
  // pick up other customers' new reviews while the page is open
  setInterval(() => { if (mode === "server" && !document.hidden) load(true); }, 60000);
  // keep "2 minutes ago" labels fresh
  setInterval(() => $$("time", el.list).forEach(t => (t.textContent = ago(t.dateTime))), 60000);
})();
