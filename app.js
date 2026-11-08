/* =========================================================
   Coffee With KHORSHED — ordering, booking & site behaviour
   ---------------------------------------------------------
   Edit CONFIG below to put in your real details.
   ========================================================= */
const CONFIG = {
  // WhatsApp number in international format, digits only (e.g. "8801712345678").
  // Leave empty to send orders & bookings by email instead.
  whatsapp: "8801764701566",
  email: "sheikhkhorshed1668@gmail.com",
  address: "KUET, Khulna, Bangladesh",
  currency: "৳",
  deliveryFee: 60,
  // 0 = Sunday … 6 = Saturday. Times are 24h "HH:MM".
  hours: {
    0: ["08:00", "22:00"], 1: ["08:00", "22:00"], 2: ["08:00", "22:00"], 3: ["08:00", "22:00"],
    4: ["08:00", "22:00"], 5: ["15:00", "23:00"], 6: ["08:00", "22:00"]
  },
  lastBookingBeforeClose: 60 // minutes
};

// img: 800×800 WebP in assets/menu/. To use a different photo, replace the file (same name).
const MENU = [
  { id: "espresso", cat: "espresso", name: "Espresso", desc: "Double shot, house blend", price: 180,
    img: "assets/menu/espresso.webp", alt: "Small white espresso cup with golden crema on a saucer, with roasted coffee beans" },
  { id: "americano", cat: "espresso", name: "Americano", desc: "Espresso stretched with hot water", price: 220,
    img: "assets/menu/americano.webp", alt: "Ceramic cup of black Americano coffee on a saucer" },
  { id: "cappuccino", cat: "espresso", name: "Cappuccino", desc: "Equal parts shot, milk and foam", price: 280,
    img: "assets/menu/cappuccino.webp", alt: "Wide ceramic cup of cappuccino with heart latte art" },
  { id: "flatwhite", cat: "espresso", name: "Flat White", desc: "Velvet microfoam, stronger finish", price: 300,
    img: "assets/menu/flat-white.webp", alt: "Speckled stoneware cup of flat white with rosetta latte art" },
  { id: "khorshed-latte", cat: "espresso", name: "Khorshed's Latte", desc: "Our signature with caramel & sea salt", price: 320,
    img: "assets/menu/khorsheds-latte.webp", alt: "Layered latte in a glass with caramel drizzle and sea-salt crystals on the foam" },
  { id: "v60", cat: "slow", name: "V60 Pour Over", desc: "Single origin, brewed by hand", price: 350,
    img: "assets/menu/v60-pour-over.webp", alt: "Terracotta V60 dripper on a glass server, with coffee dripping into it" },
  { id: "frenchpress", cat: "slow", name: "French Press", desc: "Full-bodied, serves two", price: 330,
    img: "assets/menu/french-press.webp", alt: "Glass French press of dark coffee with a steel frame and wooden handle" },
  { id: "coldbrew", cat: "slow", name: "Cold Brew", desc: "Steeped for 18 hours", price: 300,
    img: "assets/menu/cold-brew.webp", alt: "Tall glass of amber cold brew with ice cubes and condensation" },
  { id: "spanish-latte", cat: "slow", name: "Iced Spanish Latte", desc: "Condensed milk, double shot, ice", price: 340,
    img: "assets/menu/iced-spanish-latte.webp", alt: "Glass of iced Spanish latte with milk and espresso layers and ice" },
  { id: "croissant", cat: "sweet", name: "Butter Croissant", desc: "Baked every morning", price: 200,
    img: "assets/menu/butter-croissant.webp", alt: "Golden layered butter croissant on a white plate" },
  { id: "bananabread", cat: "sweet", name: "Banana Bread", desc: "Toasted, with whipped butter", price: 180,
    img: "assets/menu/banana-bread.webp", alt: "Two slices of banana bread on a plate with a pat of butter" },
  { id: "brownie", cat: "sweet", name: "Chocolate Brownie", desc: "Dark chocolate, sea salt", price: 220,
    img: "assets/menu/chocolate-brownie.webp", alt: "Two glossy chocolate brownies topped with sea-salt crystals" },
  { id: "cheesecake", cat: "sweet", name: "Cheesecake", desc: "Baked New York style", price: 280,
    img: "assets/menu/cheesecake.webp", alt: "Slice of New York cheesecake with a golden crust and caramel sauce" }
];
const CATS = { espresso: "Espresso Bar", slow: "Slow Brew", sweet: "Sweet Things" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => CONFIG.currency + n.toLocaleString("en-US");
  const byId = Object.fromEntries(MENU.map(m => [m.id, m]));
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt12 = t => {
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`;
  };

  /* ---------------- storage (safe) ---------------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------------- toast ---------------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------------- sending (WhatsApp or email) ---------------- */
  const channelName = CONFIG.whatsapp ? "WhatsApp" : "your email app";
  $$("[data-channel]").forEach(n => (n.textContent = channelName));
  function sendLink(subject, text) {
    if (CONFIG.whatsapp) return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
    return `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }
  function openLink(url) {
    if (url.startsWith("mailto:")) window.location.href = url;
    else window.open(url, "_blank", "noopener");
  }

  /* =================================================
     MENU
     ================================================= */
  const grid = $("#menuGrid");
  let filter = "all";

  // Shown in place of a product image that fails to load.
  const FALLBACK = `<svg class="mi-fallback" viewBox="90 38 220 220" aria-hidden="true">
    <path d="M200 50 C170 110 230 190 200 250 A70 100 0 0 1 200 50 Z" transform="translate(-14 0) rotate(-12 200 250)"/>
    <path d="M200 50 C170 110 230 190 200 250 A70 100 0 0 0 200 50 Z" transform="translate(14 0) rotate(12 200 250)"/></svg>`;

  function renderMenu() {
    const cats = filter === "all" ? Object.keys(CATS) : [filter];
    grid.innerHTML = cats.map(cat => {
      const items = MENU.filter(m => m.cat === cat);
      return `
      <section class="menu-cat" aria-labelledby="cat-${cat}">
        <header class="menu-cat-head">
          <h3 id="cat-${cat}">${CATS[cat]}</h3>
          <span>${items.length} items</span>
        </header>
        <ul class="mi-grid">
          ${items.map((m, i) => `
            <li class="mi" style="--i:${i}">
              <div class="mi-img">
                <img src="${m.img}" alt="${m.alt}" width="800" height="800" loading="lazy" decoding="async">
              </div>
              <div class="mi-body">
                <div class="mi-top">
                  <h4>${m.name}</h4>
                  <b>${money(m.price)}</b>
                </div>
                <p>${m.desc}</p>
              </div>
              <button type="button" class="add" data-add="${m.id}" aria-label="Add ${m.name} to order">+</button>
            </li>`).join("")}
        </ul>
      </section>`;
    }).join("");
    syncAddButtons();
  }

  // swap any image that fails to load for the bean mark
  grid.addEventListener("error", e => {
    const img = e.target;
    if (img.tagName !== "IMG") return;
    const box = img.closest(".mi-img");
    box.classList.add("is-fallback");
    box.innerHTML = FALLBACK;
  }, true);

  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    $$(".tab").forEach(t => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab);
    });
    renderMenu();
  }));

  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    addToCart(btn.dataset.add);
  });

  /* =================================================
     CART
     ================================================= */
  let cart = store.get("cwk-cart", {});
  // drop anything that no longer exists on the menu
  for (const id of Object.keys(cart)) if (!byId[id] || cart[id] < 1) delete cart[id];

  const cartCount = $("#cartCount");
  const cartBtn = $(".cart-btn");
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = () => Object.entries(cart).reduce((s, [id, q]) => s + byId[id].price * q, 0);

  function saveCart() {
    store.set("cwk-cart", cart);
    const c = count();
    cartCount.textContent = c;
    cartCount.classList.toggle("has", c > 0);
    cartBtn.setAttribute("aria-label", c ? `Open your order (${c} item${c > 1 ? "s" : ""})` : "Open your order");
    syncAddButtons();
    renderCart();
  }

  function syncAddButtons() {
    $$("[data-add]", grid).forEach(b => {
      const q = cart[b.dataset.add] || 0;
      b.classList.toggle("in", q > 0);
      b.textContent = q > 0 ? q : "+";
    });
  }

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    cartBtn.classList.remove("bump");
    void cartBtn.offsetWidth;
    cartBtn.classList.add("bump");
    toast(`${byId[id].name} added · ${count()} in your order`);
  }

  function setQty(id, q) {
    if (q < 1) delete cart[id]; else cart[id] = Math.min(q, 20);
    saveCart();
  }

  /* ---------- drawer ---------- */
  const drawer = $("#cart");
  const overlay = $("#overlay");
  const list = $("#cartList");
  const empty = $("#cartEmpty");
  const foot = $("#cartFoot");
  const nextBtn = $("#nextBtn");
  const backBtn = $("#backBtn");
  const orderForm = $("#orderForm");
  let step = "items";

  function renderCart() {
    const entries = Object.entries(cart);
    empty.hidden = entries.length > 0;
    list.innerHTML = entries.map(([id, q]) => `
      <li>
        <div class="ci-name">${byId[id].name}<small>${money(byId[id].price)} each</small></div>
        <div class="qty">
          <button type="button" data-dec="${id}" aria-label="One less ${byId[id].name}">−</button>
          <span aria-live="polite">${q}</span>
          <button type="button" data-inc="${id}" aria-label="One more ${byId[id].name}">+</button>
        </div>
        <div class="ci-price">${money(byId[id].price * q)}</div>
      </li>`).join("");
    updateTotals();
  }

  function orderType() { return orderForm.elements.type.value; }
  function fee() { return orderType() === "Delivery" && count() ? CONFIG.deliveryFee : 0; }

  function updateTotals() {
    const s = subtotal();
    $("#subtotal").textContent = money(s);
    $("#deliveryRow").hidden = fee() === 0;
    $("#deliveryFee").textContent = money(fee());
    $("#total").textContent = money(s + fee());
    nextBtn.disabled = count() === 0;
    if (step === "details" && count() === 0) showStep("items");
  }

  list.addEventListener("click", e => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (inc) setQty(inc.dataset.inc, cart[inc.dataset.inc] + 1);
    if (dec) setQty(dec.dataset.dec, cart[dec.dataset.dec] - 1);
  });

  function showStep(s) {
    step = s;
    $$("[data-step]", drawer).forEach(n => (n.hidden = n.dataset.step !== s));
    foot.hidden = s === "done";
    backBtn.hidden = s !== "details";
    nextBtn.textContent = s === "items" ? "Continue" : `Place Order · ${$("#total").textContent}`;
    $("#cartTitle").textContent = s === "details" ? "Your Details" : s === "done" ? "Thank You" : "Your Order";
    $(".drawer-body", drawer).scrollTop = 0;
    if (s === "details") setTimeout(() => orderForm.elements.name.focus(), 50);
  }

  // order type toggles extra fields
  orderForm.addEventListener("change", e => {
    if (e.target.name !== "type") return;
    const t = orderType();
    $("[data-delivery]", orderForm).hidden = t !== "Delivery";
    $("[data-table]", orderForm).hidden = t !== "Dine-in";
    updateTotals();
    nextBtn.textContent = `Place Order · ${$("#total").textContent}`;
  });

  // remember the customer's details for next time
  const savedCustomer = store.get("cwk-customer", {});
  ["name", "phone", "address"].forEach(k => { if (savedCustomer[k]) orderForm.elements[k].value = savedCustomer[k]; });

  backBtn.addEventListener("click", () => showStep("items"));
  nextBtn.addEventListener("click", () => {
    if (step === "items") return showStep("details");
    if (step === "details") placeOrder();
  });
  orderForm.addEventListener("submit", e => { e.preventDefault(); placeOrder(); });

  /* ---------- validation ---------- */
  function setError(input, msg) {
    const field = input.closest(".field");
    field.classList.toggle("invalid", !!msg);
    $("em", field).textContent = msg || "";
    input.setAttribute("aria-invalid", !!msg);
    return !msg;
  }
  const validPhone = v => { const d = v.replace(/[^\d]/g, ""); return /^[+\d][\d\s\-()]*$/.test(v.trim()) && d.length >= 7 && d.length <= 15; };

  function checkName(i) { return setError(i, i.value.trim().length < 2 ? "Please enter your name." : ""); }
  function checkPhone(i) { return setError(i, !validPhone(i.value) ? "Please enter a valid phone number." : ""); }

  // clear errors while typing
  document.addEventListener("input", e => {
    const f = e.target.closest(".field.invalid");
    if (f) { f.classList.remove("invalid"); $("em", f).textContent = ""; }
  });

  function placeOrder() {
    const f = orderForm.elements;
    let ok = checkName(f.name) & checkPhone(f.phone);
    if (orderType() === "Delivery") ok &= setError(f.address, f.address.value.trim().length < 6 ? "Please enter a delivery address." : "");
    if (!ok) { $(".field.invalid input, .field.invalid textarea", orderForm)?.focus(); return; }

    const no = "CWK-" + Date.now().toString().slice(-5);
    const lines = Object.entries(cart).map(([id, q]) => `• ${q} × ${byId[id].name} — ${money(byId[id].price * q)}`);
    const t = orderType();
    const text = [
      `☕ New order ${no} — Coffee With KHORSHED`,
      "",
      ...lines,
      "",
      `Subtotal: ${money(subtotal())}`,
      fee() ? `Delivery: ${money(fee())}` : null,
      `Total: ${money(subtotal() + fee())}`,
      "",
      `Type: ${t}`,
      `Name: ${f.name.value.trim()}`,
      `Phone: ${f.phone.value.trim()}`,
      t === "Delivery" ? `Address: ${f.address.value.trim()}` : null,
      t === "Dine-in" && f.table.value.trim() ? `Table: ${f.table.value.trim()}` : null,
      f.notes.value.trim() ? `Notes: ${f.notes.value.trim()}` : null
    ].filter(l => l !== null).join("\n");

    const url = sendLink(`Order ${no}`, text);
    store.set("cwk-customer", { name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim() });
    $("#orderNo").textContent = no;
    $("#resend").href = url;
    openLink(url);

    cart = {};
    saveCart();
    f.notes.value = "";
    f.table.value = "";
    showStep("done");
  }

  /* =================================================
     BOOKING
     ================================================= */
  const booking = $("#booking");
  const bookForm = $("#bookForm");
  const dateIn = bookForm.elements.date;
  const timeIn = bookForm.elements.time;
  const pad = n => String(n).padStart(2, "0");
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function bookingWindow(dateStr) {
    const d = new Date(dateStr + "T00:00");
    const [open, close] = CONFIG.hours[d.getDay()];
    const last = toMin(close) - CONFIG.lastBookingBeforeClose;
    return { day: d.getDay(), open, close, openMin: toMin(open), lastMin: last, last: `${pad(Math.floor(last / 60))}:${pad(last % 60)}` };
  }

  function updateHint() {
    if (!dateIn.value) return;
    const w = bookingWindow(dateIn.value);
    $("#hoursHint").textContent = `${DAYS[w.day]}: tables from ${fmt12(w.open)} to ${fmt12(w.last)}`;
    timeIn.min = w.open;
    timeIn.max = w.last;
  }
  dateIn.addEventListener("change", updateHint);

  function checkBooking() {
    const f = bookForm.elements;
    let ok = checkName(f.name) & checkPhone(f.phone);
    const now = new Date();
    let dErr = "";
    if (!dateIn.value) dErr = "Pick a date.";
    else if (dateIn.value < isoDate(now)) dErr = "That date has passed.";
    else if (dateIn.value > dateIn.max) dErr = "We take bookings up to 60 days ahead.";
    ok &= setError(dateIn, dErr);

    let tErr = "";
    if (!timeIn.value) tErr = "Pick a time.";
    else if (!dErr) {
      const w = bookingWindow(dateIn.value);
      const m = toMin(timeIn.value);
      if (m < w.openMin || m > w.lastMin) tErr = `Choose ${fmt12(w.open)} – ${fmt12(w.last)}.`;
      else if (dateIn.value === isoDate(now) && m < now.getHours() * 60 + now.getMinutes() + 30) tErr = "Please pick a time at least 30 min from now.";
    }
    ok &= setError(timeIn, tErr);
    return !!ok;
  }

  bookForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!checkBooking()) { $(".field.invalid input, .field.invalid select", bookForm)?.focus(); return; }
    const f = bookForm.elements;
    const d = new Date(dateIn.value + "T00:00");
    const dateNice = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const guests = f.guests.value;
    const text = [
      "📅 Table booking request — Coffee With KHORSHED",
      "",
      `Name: ${f.name.value.trim()}`,
      `Phone: ${f.phone.value.trim()}`,
      `Date: ${dateNice}`,
      `Time: ${fmt12(timeIn.value)}`,
      `Guests: ${guests}`,
      f.notes.value.trim() ? `Request: ${f.notes.value.trim()}` : null
    ].filter(l => l !== null).join("\n");
    const url = sendLink("Table booking request", text);
    store.set("cwk-customer", { ...store.get("cwk-customer", {}), name: f.name.value.trim(), phone: f.phone.value.trim() });
    $("#bookSummary").textContent = `Table for ${guests} on ${dateNice} at ${fmt12(timeIn.value)}.`;
    $("#bookResend").href = url;
    openLink(url);
    $$("[data-step]", booking).forEach(n => (n.hidden = n.dataset.step !== "done"));
  });

  function resetBooking() {
    const today = new Date();
    const max = new Date(); max.setDate(max.getDate() + 60);
    dateIn.min = isoDate(today);
    dateIn.max = isoDate(max);
    // default: today if there's still time, otherwise tomorrow
    const w = bookingWindow(isoDate(today));
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const start = new Date(today);
    if (nowMin + 30 > w.lastMin) start.setDate(start.getDate() + 1);
    if (!dateIn.value || dateIn.value < dateIn.min) dateIn.value = isoDate(start);
    updateHint();
    const c = store.get("cwk-customer", {});
    if (c.name && !bookForm.elements.name.value) bookForm.elements.name.value = c.name;
    if (c.phone && !bookForm.elements.phone.value) bookForm.elements.phone.value = c.phone;
    $$("[data-step]", booking).forEach(n => (n.hidden = n.dataset.step !== "form"));
  }

  /* =================================================
     OPEN / CLOSE LAYERS
     ================================================= */
  let openLayer = null;
  let returnFocus = null;

  function open(layer) {
    if (openLayer) close();
    closeMobile();
    returnFocus = document.activeElement;
    openLayer = layer;
    layer.hidden = false;
    overlay.hidden = layer === booking ? true : false;
    if (layer === booking) layer.style.background = "rgba(29, 18, 11, .45)";
    document.body.classList.add("locked");
    const first = layer === drawer && step === "details" ? orderForm.elements.name : $("button, input, a[href]", layer);
    setTimeout(() => first?.focus(), 60);
  }
  function close() {
    if (!openLayer) return;
    if (openLayer === drawer && step === "done") showStep("items");
    openLayer.hidden = true;
    overlay.hidden = true;
    openLayer = null;
    document.body.classList.remove("locked");
    returnFocus?.focus?.({ preventScroll: true });
  }

  $$("[data-open-cart]").forEach(b => b.addEventListener("click", () => { renderCart(); showStep(step === "done" ? "items" : step); open(drawer); }));
  $$("[data-open-booking]").forEach(b => b.addEventListener("click", () => { resetBooking(); open(booking); }));
  overlay.addEventListener("click", close);
  booking.addEventListener("click", e => { if (e.target === booking) close(); });
  document.addEventListener("click", e => { if (e.target.closest("[data-close]")) close(); });

  // nav "Order Now": open the order if there is one, otherwise go to the menu
  $(".nav-order").addEventListener("click", e => {
    if (count() > 0) { e.preventDefault(); renderCart(); showStep("items"); open(drawer); }
  });

  // keyboard: Esc closes, Tab stays inside the open layer
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (openLayer) close(); else closeMobile(); }
    if (e.key === "Tab" && openLayer) {
      const f = $$("button, input, select, textarea, a[href]", openLayer).filter(n => !n.disabled && n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* =================================================
     MOBILE MENU
     ================================================= */
  const burger = $(".burger");
  const mobile = $("#mobileMenu");
  function closeMobile() {
    if (mobile.hidden) return;
    mobile.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    if (!openLayer) document.body.classList.remove("locked");
  }
  burger.addEventListener("click", () => {
    if (!mobile.hidden) return closeMobile();
    mobile.hidden = false;
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
    document.body.classList.add("locked");
  });
  $$("a", mobile).forEach(a => a.addEventListener("click", closeMobile));
  window.addEventListener("resize", () => { if (innerWidth > 900) closeMobile(); });

  /* =================================================
     ACTIVE NAV LINK
     ================================================= */
  const navLinks = $$(".nav-links a");
  const sections = ["menu", "story", "reviews", "visit"].map(id => document.getElementById(id));
  function markActive() {
    const y = innerHeight * .4;
    let current = "top";
    for (const s of sections) if (s.getBoundingClientRect().top <= y) current = s.id;
    navLinks.forEach(a => a.classList.toggle("active", a.dataset.section === current));
  }
  window.addEventListener("scroll", markActive, { passive: true });

  /* =================================================
     VISIT: directions + open now
     ================================================= */
  $("#directions").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CONFIG.address);
  function openStatus() {
    const now = new Date();
    const [o, c] = CONFIG.hours[now.getDay()];
    const m = now.getHours() * 60 + now.getMinutes();
    const el = $("#openStatus");
    if (m >= toMin(o) && m < toMin(c)) {
      el.textContent = `Open now · until ${fmt12(c)}`;
      el.classList.add("open");
    } else {
      const tomorrow = m >= toMin(c);
      const nd = tomorrow ? (now.getDay() + 1) % 7 : now.getDay();
      el.textContent = `Closed now · opens ${tomorrow ? (nd === now.getDay() ? "" : DAYS[nd] + " ") : "today "}at ${fmt12(CONFIG.hours[nd][0])}`;
      el.classList.remove("open");
    }
  }
  openStatus();
  setInterval(openStatus, 60000);

  /* ---------------- init ---------------- */
  renderMenu();
  saveCart();
  showStep("items");
  markActive();
})();
