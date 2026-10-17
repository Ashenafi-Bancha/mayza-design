// Connects the public pages to the owner's admin: contact details, follower
// numbers and the announcement come from Settings, the Collections grid from
// Products, and the order sheet can send orders straight to the admin inbox.
(() => {
  const S = window.MayzaStore;
  if (!S) return;
  const D = S.DEFAULT_SETTINGS;
  const CACHE = "mayza-settings-cache";
  const isAm = () => document.documentElement.lang === "am";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const spaced = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : p; };
  const relang = () => setLang(document.documentElement.lang || "en");

  // ---------- settings ----------
  let applied = null;
  function applySettings(s) {
    const key = JSON.stringify(s);
    if (key === applied) return;
    applied = key;

    MAYZA.phone = s.phone || D.phone;
    MAYZA.phoneIntl = S.intlPhone(MAYZA.phone);
    MAYZA.phone2 = s.phone2 || "";
    MAYZA.whatsapp = "https://wa.me/" + S.intlPhone(s.whatsapp || MAYZA.phone);
    MAYZA.telegram = S.telegramLink(s.telegram || MAYZA.phone);
    MAYZA.facebook = s.facebook || D.facebook;
    MAYZA.tiktok = s.tiktok || D.tiktok;
    MAYZA.instagram = s.instagram || D.instagram;
    MAYZA.address_en = s.address_en || D.address_en;
    MAYZA.address_am = s.address_am || D.address_am;

    // Rewrite the numbers and links written into the page markup.
    const swaps = [
      ["tel:+" + S.intlPhone(D.phone), "tel:+" + MAYZA.phoneIntl],
      ["tel:+" + S.intlPhone(D.phone2), "tel:+" + S.intlPhone(MAYZA.phone2 || D.phone2)],
      ["https://wa.me/" + S.intlPhone(D.whatsapp), MAYZA.whatsapp],
      [S.telegramLink(D.telegram), MAYZA.telegram],
      [D.facebook, MAYZA.facebook],
      [D.tiktok, MAYZA.tiktok],
      [D.instagram, MAYZA.instagram],
    ].filter(([a, b]) => a !== b);
    const textSwaps = [
      [spaced(D.phone), spaced(MAYZA.phone)],
      [D.phone, MAYZA.phone],
      [spaced(D.phone2), spaced(MAYZA.phone2 || D.phone2)],
    ].filter(([a, b]) => a !== b);
    if (swaps.length) {
      document.querySelectorAll("main a[href]").forEach((a) => {
        let h = a.getAttribute("href");
        swaps.forEach(([from, to]) => { if (h.startsWith(from)) h = to + h.slice(from.length); });
        a.setAttribute("href", h);
      });
    }
    if (textSwaps.length) {
      const fix = (str) => textSwaps.reduce((acc, [from, to]) => acc.split(from).join(to), str);
      const walker = document.createTreeWalker(document.querySelector("main") || document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) { const n = walker.currentNode; const v = fix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
      document.querySelectorAll("main [data-am], main [data-en]").forEach((el) => {
        if (el.dataset.am) el.dataset.am = fix(el.dataset.am);
        if (el.dataset.en) el.dataset.en = fix(el.dataset.en);
      });
    }

    document.querySelectorAll("[data-stat]").forEach((el) => {
      const v = s["stat_" + el.dataset.stat];
      if (v) el.textContent = v;
    });
    const setPair = (el, en, am) => { el.dataset.en = esc(en); el.dataset.am = esc(am || en); };
    document.querySelectorAll('[data-setting="address"]').forEach((el) => setPair(el, MAYZA.address_en, MAYZA.address_am));
    document.querySelectorAll('[data-setting="hours"]').forEach((el) => setPair(el, s.hours_en || D.hours_en, s.hours_am || D.hours_am));

    // announcement bar above the header
    let bar = document.getElementById("announce-bar");
    const text = s.announce_on && (s.announce_en || s.announce_am);
    if (text) {
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "announce-bar";
        bar.className = "announce";
        bar.setAttribute("role", "note");
        document.getElementById("site-header").before(bar);
      }
      bar.innerHTML = `<span class="announce-text"></span>`;
      setPair(bar.firstChild, s.announce_en || s.announce_am, s.announce_am);
    } else if (bar) {
      bar.remove();
    }

    refreshChrome(); // header, footer, quick links and phone bar use MAYZA
  }

  try { const c = localStorage.getItem(CACHE); if (c) applySettings(JSON.parse(c)); } catch (e) {}
  S.getSettings()
    .then((s) => { applySettings(s); try { localStorage.setItem(CACHE, JSON.stringify(s)); } catch (e) {} })
    .catch(() => {});

  // ---------- Collections: product grid ----------
  const grid = document.getElementById("pieces-grid");
  const LINE = {
    cultural: ["Cultural wear", "ባህላዊ አልባሳት"],
    modern: ["Modern fashion", "ዘመናዊ ፋሽን"],
    streetwear: ["Streetwear", "ስትሪትዌር"],
    children: ["Children", "ልጆች"],
  };
  const price = (p) => p.price != null && p.price !== ""
    ? [`ETB ${Number(p.price).toLocaleString("en-US")}`, `${Number(p.price).toLocaleString("en-US")} ብር`]
    : ["Price on request", "ዋጋ ይጠይቁ"];

  if (grid) {
    S.listProducts()
      .then((list) => {
        list = list.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        if (!list.length) { document.getElementById("piece-filters").hidden = true; return; }
        grid.innerHTML = list.map((p) => {
          const [pe, pa] = price(p);
          const [le, la] = LINE[p.line] || ["", ""];
          return `<article class="piece-card" data-line="${esc(p.line)}">
            <figure class="piece-photo"><img src="${esc(S.resolveImage(p.image_url))}" alt="${esc(p.name_en)}" loading="lazy" class="zoomable"></figure>
            <div class="piece-meta">
              ${p.featured ? `<span class="piece-badge" data-am="ተመራጭ">Featured</span>` : ""}
              <p class="piece-line" data-am="${esc(la)}">${esc(le)}</p>
              <h3 data-am="${esc(p.name_am || p.name_en)}">${esc(p.name_en)}</h3>
              ${p.description_en || p.description_am ? `<p class="piece-desc" data-am="${esc(p.description_am || p.description_en)}">${esc(p.description_en || p.description_am)}</p>` : ""}
              <div class="piece-foot">
                <span class="piece-price" data-am="${esc(pa)}">${esc(pe)}</span>
                <a class="btn red small" href="custom.html?product=${encodeURIComponent(p.id)}#order" data-am="ይዘዙ">Order this</a>
              </div>
            </div>
          </article>`;
        }).join("");
        relang();
      })
      .catch(() => { document.getElementById("piece-filters").hidden = true; });

    document.getElementById("piece-filters").addEventListener("click", (e) => {
      const b = e.target.closest(".filter");
      if (!b) return;
      document.querySelectorAll("#piece-filters .filter").forEach((x) => x.setAttribute("aria-pressed", x === b));
      grid.querySelectorAll(".piece-card").forEach((c) => { c.hidden = b.dataset.line !== "all" && c.dataset.line !== b.dataset.line; });
    });
  }

  // ---------- Custom orders: chosen piece and sending to the admin ----------
  const form = document.getElementById("order-form");
  if (!form) return;
  const status = document.getElementById("order-status");
  const sendBtn = document.getElementById("send-mayza");
  const L = {
    en: { need: "Please add your name and phone number first.", sending: "Sending…", sent: "Order sent. Your reference is {ref}. We will call you to confirm.", fail: "We could not send it just now. Please use WhatsApp or call us.", change: "Change", chosen: "Your chosen piece" },
    am: { need: "እባክዎ መጀመሪያ ስምዎን እና ስልክዎን ያስገቡ።", sending: "በመላክ ላይ…", sent: "ትዕዛዝዎ ተልኳል። የመለያ ቁጥርዎ {ref} ነው። ለማረጋገጥ እንደውልልዎታለን።", fail: "አሁን መላክ አልተቻለም። እባክዎ በዋትስአፕ ይላኩ ወይም ይደውሉልን።", change: "ቀይር", chosen: "የመረጡት ልብስ" },
  };
  const t = (k, v = {}) => (L[isAm() ? "am" : "en"][k] || "").replace(/\{(\w+)\}/g, (_, x) => v[x] || "");

  const productId = new URLSearchParams(location.search).get("product");
  if (productId) {
    S.getProduct(productId).then((p) => {
      if (!p) return;
      window.MAYZA_PIECE = { id: p.id, en: p.name_en, am: p.name_am || p.name_en };
      const box = document.getElementById("picked-piece");
      box.innerHTML = `<img src="${esc(S.resolveImage(p.image_url))}" alt="">
        <div><span class="picked-label" data-am="${esc(L.am.chosen)}">${esc(L.en.chosen)}</span>
        <b data-am="${esc(p.name_am || p.name_en)}">${esc(p.name_en)}</b></div>
        <a href="collections.html#pieces" data-am="${esc(L.am.change)}">${esc(L.en.change)}</a>`;
      box.hidden = false;
      const g = form.elements.garment;
      if (g && !g.value) g.value = p.line === "streetwear" ? "street" : p.line === "children" ? "cultural" : p.line;
      if (p.line === "children" && form.elements.who && !form.elements.who.value) form.elements.who.value = "child";
      relang();
      document.dispatchEvent(new CustomEvent("piecechange"));
    }).catch(() => {});
  }

  if (sendBtn) S.ready().then(() => {
    if (!S.canTakeOrders()) return;
    sendBtn.hidden = false;
    sendBtn.addEventListener("click", async () => {
      const v = (k) => (form.elements[k] ? form.elements[k].value.trim() : "");
      if (!v("name") || !v("phone")) { status.textContent = t("need"); form.elements[v("name") ? "phone" : "name"].focus(); return; }
      if (v("company")) return; // filled only by spam bots
      const label = sendBtn.innerHTML;
      sendBtn.disabled = true;
      sendBtn.textContent = t("sending");
      try {
        const ref = await S.createOrder({
          name: v("name"), phone: v("phone"), garment: v("garment"), who: v("who"), needed_by: v("date"),
          measurements: Object.fromEntries(["chest", "waist", "hip", "height"].map((k) => [k, v(k)]).filter(([, x]) => x)),
          notes: v("notes"),
          product_id: window.MAYZA_PIECE ? window.MAYZA_PIECE.id : null,
          product_name: window.MAYZA_PIECE ? window.MAYZA_PIECE.en : null,
        });
        status.textContent = t("sent", { ref });
        sendBtn.textContent = "✓ " + ref;
        sendBtn.classList.add("sent");
      } catch (e) {
        status.textContent = t("fail");
        sendBtn.disabled = false;
        sendBtn.innerHTML = label;
      }
    });
  });
})();
