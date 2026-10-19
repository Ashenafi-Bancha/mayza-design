// Data layer shared by the public pages and the admin.
// Live mode talks to the Mayza API (Node.js + Express + PostgreSQL, see /api).
// Demo mode keeps everything in this browser's localStorage, so the admin can
// be tried before a database is connected. The mode is picked automatically:
// live when /api/health reports a connected database, demo otherwise.
(() => {
  const cfg = window.MAYZA_CONFIG || {};
  const API = (cfg.apiBase || "/api").replace(/\/$/, "");
  const DEMO_KEY = "mayza-demo-v1";
  const DEMO_FLAG = "mayza-demo-on";
  let LIVE = false;

  let readyPromise = null;
  function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (cfg.forceDemo) return;
        try {
          const cached = sessionStorage.getItem("mayza-api-live");
          if (cached !== null) { LIVE = cached === "1"; return; }
        } catch (e) {}
        try {
          const r = await fetch(API + "/health", { cache: "no-store", credentials: "same-origin" });
          const j = r.ok ? await r.json() : null;
          LIVE = Boolean(j && j.configured);
        } catch (e) {
          LIVE = false;
        }
        try { sessionStorage.setItem("mayza-api-live", LIVE ? "1" : "0"); } catch (e) {}
      })();
    }
    return readyPromise;
  }

  async function api(path, { method = "GET", body, raw } = {}) {
    const headers = {};
    if (raw) headers["Content-Type"] = raw.type;
    else if (body !== undefined) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(API + path, { method, headers, credentials: "same-origin", body: raw || (body !== undefined ? JSON.stringify(body) : undefined) });
    } catch (e) {
      throw new Error("Could not reach the server. Check the internet connection and try again.");
    }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || `The server answered with an error (${res.status}).`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const DEFAULT_SETTINGS = {
    phone: "0912070949",
    phone2: "0924968631",
    whatsapp: "0912070949",
    telegram: "0912070949",
    address_en: "Summit Fiyel Bet, just off the main road",
    address_am: "ሰሚት ፍየል ቤት ትንሽ ገባ ብሎ",
    hours_en: "Always open. A quick call before you visit is appreciated.",
    hours_am: "ሁልጊዜ ክፍት፤ ከመምጣትዎ በፊት ቢደውሉ ይመረጣል።",
    facebook: "https://web.facebook.com/sidamaCulture",
    tiktok: "https://www.tiktok.com/@mayza_design",
    instagram: "https://www.instagram.com/mayza__design",
    stat_facebook: "82K",
    stat_tiktok: "27.2K",
    stat_likes: "248.3K",
    announce_on: false,
    announce_en: "",
    announce_am: "",
  };

  const P = (id, image, line, name_en, name_am, featured, sort) => ({
    id, image_url: `images/${image}.jpg`, line, name_en, name_am,
    description_en: "", description_am: "", price: null,
    featured, visible: true, sort, created_at: "2026-10-01T09:00:00Z",
  });
  const SEED_PRODUCTS = [
    P("seed-01", "cultural-trio", "cultural", "Woven panel jacket sets", "ጥለት ያላቸው የጃኬት ሙሉ ልብሶች", true, 1),
    P("seed-02", "embroidered-set", "cultural", "Embroidered white set", "ጥልፍ ያለው ነጭ ሙሉ ልብስ", true, 2),
    P("seed-03", "cultural-duo", "cultural", "Cultural trim jackets", "የባህል ጥለት ያላቸው ጃኬቶች", false, 3),
    P("seed-04", "trim-shirt", "cultural", "Woven trim shirt", "የባህል ጥለት ያለው ሸሚዝ", false, 4),
    P("seed-05", "child-dress", "children", "Children's cultural dress", "የልጆች የባህል ቀሚስ", true, 5),
    P("seed-06", "backdrop-duo", "modern", "White vest and trouser set", "ነጭ ሰደርያ እና ሱሪ", false, 6),
    P("seed-07", "burgundy-jacket", "modern", "Burgundy leather jacket", "ቡርጋንዲ የቆዳ ጃኬት", false, 7),
    P("seed-08", "backdrop-trio", "modern", "Studio looks", "የስቱዲዮ ልብሶች", false, 8),
    P("seed-09", "stripe-bomber", "streetwear", "Stripe-panel bomber", "ጥለት ያለው ቦምበር ጃኬት", true, 9),
    P("seed-10", "denim-set", "streetwear", "Denim set", "የጂንስ ሙሉ ልብስ", false, 10),
    P("seed-11", "leather-jacket", "streetwear", "Black leather jacket", "ጥቁር የቆዳ ጃኬት", false, 11),
    P("seed-12", "stripe-fleece", "streetwear", "Cultural band fleece jacket", "የባህል ጥለት ያለው ፍሊስ ጃኬት", false, 12),
  ];

  const SEED_COLLECTIONS = [
    {
      "slug": "cultural",
      "name_en": "Cultural wear",
      "name_am": "ባህላዊ አልባሳት",
      "tagline_en": "Line one",
      "tagline_am": "መስመር አንድ",
      "summary_en": "Dresses and sets finished with red, black and yellow woven bands.",
      "summary_am": "በቀይ፣ በጥቁር እና በቢጫ ጥለት ያጌጡ የባህል ልብሶች።",
      "description_en": "The colours and woven bands of Ethiopian cultural dress, Sidama among them, worked into dresses, jackets and sets.",
      "description_am": "የሲዳማን ጨምሮ የኢትዮጵያ ባህላዊ ቀለሞችና ጥለቶች፣ በቀሚስ፣ በጃኬት እና በሙሉ ልብስ ላይ በጥንቃቄ ተሰርተው።",
      "tags_en": "Women's dresses, Stripe-panel jackets, Men's sets, Couples' outfits, Holiday and wedding",
      "tags_am": "የሴቶች ቀሚስ, ጥለት ያላቸው ጃኬቶች, የወንዶች ሙሉ ልብስ, የጥንዶች ልብስ, ለበዓል እና ለሰርግ",
      "image_url": "images/cultural-trio.jpg",
      "sort": 1,
      "visible": true,
      "on_home": true,
      "id": "col-cultural",
      "created_at": "2026-10-01T09:00:00Z"
    },
    {
      "slug": "modern",
      "name_en": "Modern fashion",
      "name_am": "ዘመናዊ ፋሽን",
      "tagline_en": "Line two",
      "tagline_am": "መስመር ሁለት",
      "summary_en": "Clean, contemporary cuts for everyday wear and for occasions.",
      "summary_am": "ንጹህ ቅርጽ ያላቸው፣ ለዕለት ተዕለት እና ለዝግጅት የሚሆኑ ልብሶች።",
      "description_en": "Simple, sharply cut contemporary pieces for work, events and the stage.",
      "description_am": "ቀላል እና ንጹህ ቅርጽ ያላቸው ዘመናዊ ልብሶች፤ ለስራ፣ ለዝግጅት እና ለመድረክ።",
      "tags_en": "Matching sets, Vests and trousers, Dresses, Artist styling",
      "tags_am": "ሙሉ ልብሶች, ሰደርያ እና ሱሪ, ቀሚሶች, ለአርቲስቶች",
      "image_url": "images/backdrop-duo.jpg",
      "sort": 2,
      "visible": true,
      "on_home": true,
      "id": "col-modern",
      "created_at": "2026-10-01T09:00:00Z"
    },
    {
      "slug": "streetwear",
      "name_en": "Streetwear and custom apparel",
      "name_am": "ስትሪትዌር እና ልዩ ህትመት",
      "tagline_en": "Line three",
      "tagline_am": "መስመር ሶስት",
      "summary_en": "Tees and casual pieces carrying the Mayza mark.",
      "summary_am": "የማይዛ ምልክት ያረፈባቸው ቲሸርቶች እና የዕለት ልብሶች።",
      "description_en": "Everyday pieces carrying the Mayza mark, plus apparel made to your own design for teams, companies and events.",
      "description_am": "የማይዛ ምልክት ያረፈባቸው የዕለት ልብሶች፤ እንዲሁም ለቡድን፣ ለድርጅት እና ለዝግጅት በራስዎ ዲዛይን የሚዘጋጁ።",
      "tags_en": "T-shirts, Hoodies, Group orders, Your own artwork",
      "tags_am": "ቲሸርት, ሁዲ, የቡድን ልብስ, የራስዎ ዲዛይን",
      "image_url": "images/leather-jacket.jpg",
      "sort": 3,
      "visible": true,
      "on_home": true,
      "id": "col-streetwear",
      "created_at": "2026-10-01T09:00:00Z"
    },
    {
      "slug": "children",
      "name_en": "Children and family",
      "name_am": "የልጆች እና የቤተሰብ",
      "tagline_en": "Line four",
      "tagline_am": "መስመር አራት",
      "summary_en": "",
      "summary_am": "",
      "description_en": "Cultural dresses scaled down for little ones, and matching outfits a whole family can wear together.",
      "description_am": "ለልጆች የተዘጋጁ ትናንሽ የባህል ቀሚሶች፣ እና መላ ቤተሰብ አንድ ላይ የሚለብሳቸው ተመሳሳይ ልብሶች።",
      "tags_en": "Girls' dresses, Boys' sets, Family matching",
      "tags_am": "የልጆች ቀሚስ, የወንድ ልጆች ልብስ, የቤተሰብ ተመሳሳይ ልብስ",
      "image_url": "images/child-dress.jpg",
      "sort": 4,
      "visible": true,
      "on_home": false,
      "id": "col-children",
      "created_at": "2026-10-01T09:00:00Z"
    }
  ];

  const daysFromNow = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const SAMPLE_ORDERS = () => [
    { id: "demo-1", ref: "MZ4K7Q", created_at: new Date(Date.now() - 2 * 36e5).toISOString(), name: "Sample: Hanna G.", phone: "0911000001", garment: "cultural", who: "woman", needed_by: daysFromNow(12), measurements: { chest: "88", waist: "70" }, notes: "Wedding guest dress, red and gold.", product_id: "seed-02", product_name: "Embroidered white set", source: "website", status: "new", price: null, deposit: null, admin_notes: "" },
    { id: "demo-2", ref: "MZ8P2D", created_at: new Date(Date.now() - 3 * 864e5).toISOString(), name: "Sample: Dawit M.", phone: "0911000002", garment: "group", who: "family", needed_by: daysFromNow(4), measurements: {}, notes: "Five matching sets for a family photo.", product_id: "seed-01", product_name: "Woven panel jacket sets", source: "phone", status: "in_progress", price: 18000, deposit: 9000, admin_notes: "Fabric bought. Fitting on Thursday." },
    { id: "demo-3", ref: "MZ1V9A", created_at: new Date(Date.now() - 8 * 864e5).toISOString(), name: "Sample: Liya A.", phone: "0911000003", garment: "cultural", who: "child", needed_by: daysFromNow(-1), measurements: { height: "110" }, notes: "", product_id: "seed-05", product_name: "Children's cultural dress", source: "website", status: "ready", price: 3500, deposit: 3500, admin_notes: "Paid in full. Call for pickup." },
  ];

  const newRef = () => "MZ" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-2).toUpperCase();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + Math.random().toString(16).slice(2));

  // ---------- image resize before upload ----------
  async function resizeImage(file, max = 1400, quality = 0.85) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, bad) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => bad(new Error("That file is not an image we can read. Try a JPG or PNG photo."));
        i.src = url;
      });
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((ok) => c.toBlob(ok, "image/jpeg", quality));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ---------- demo backend ----------
  const demo = {
    read() {
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          d.collections = d.collections || SEED_COLLECTIONS.map((c) => ({ ...c }));
          d.content = d.content || {};
          return d;
        }
      } catch (e) {}
      return {
        settings: { ...DEFAULT_SETTINGS },
        collections: SEED_COLLECTIONS.map((c) => ({ ...c })),
        products: SEED_PRODUCTS.map((p) => ({ ...p })),
        orders: SAMPLE_ORDERS(),
        content: {},
      };
    },
    write(db) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(db));
      } catch (e) {
        throw new Error("This browser is out of space for demo photos. Remove a few demo products or reset the demo.");
      }
    },
  };

  const sortProducts = (list) => list.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));
  const sortOrders = (list) => list.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const Store = {
    get isLive() { return LIVE; },
    get mode() { return LIVE ? "live" : "demo"; },
    ready,
    DEFAULT_SETTINGS,

    // Public pages may take orders only when they reach the owner:
    // always in live mode, and in demo mode only in a browser that opened the demo admin.
    canTakeOrders() {
      if (LIVE) return true;
      try { return localStorage.getItem(DEMO_FLAG) === "1"; } catch (e) { return false; }
    },

    async getSettings() {
      await ready();
      if (!LIVE) return { ...DEFAULT_SETTINGS, ...demo.read().settings };
      const { data } = await api("/settings");
      const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== null && v !== ""));
      return { ...DEFAULT_SETTINGS, ...clean, announce_on: Boolean(data && data.announce_on) };
    },
    async saveSettings(data) {
      await ready();
      if (!LIVE) { const d = demo.read(); d.settings = { ...data }; demo.write(d); return; }
      await api("/admin/settings", { method: "PUT", body: data });
    },

    async listProducts({ all = false } = {}) {
      await ready();
      let list;
      if (!LIVE) list = demo.read().products;
      else list = await api(all ? "/admin/products" : "/products");
      list = list.map((p) => ({ ...p, price: p.price == null ? null : Number(p.price) }));
      if (!all) list = list.filter((p) => p.visible);
      return sortProducts(list);
    },
    async getProduct(id) {
      await ready();
      if (!LIVE) return demo.read().products.find((p) => p.id === id) || null;
      try { return await api("/products/" + encodeURIComponent(id)); } catch (e) { if (e.status === 404) return null; throw e; }
    },
    async saveProduct(p) {
      await ready();
      const row = { ...p, price: p.price === "" || p.price == null ? null : Number(p.price), sort: Number(p.sort) || 0 };
      if (!LIVE) {
        const d = demo.read();
        if (row.id) d.products = d.products.map((x) => (x.id === row.id ? { ...x, ...row } : x));
        else d.products.push({ ...row, id: uid(), created_at: new Date().toISOString() });
        demo.write(d);
        return;
      }
      const { id, created_at, updated_at, ...rest } = row;
      if (id) await api("/admin/products/" + id, { method: "PUT", body: rest });
      else await api("/admin/products", { method: "POST", body: rest });
    },
    async deleteProduct(id) {
      await ready();
      if (!LIVE) { const d = demo.read(); d.products = d.products.filter((p) => p.id !== id); demo.write(d); return; }
      await api("/admin/products/" + id, { method: "DELETE" });
    },
    async uploadImage(file) {
      await ready();
      if (!LIVE) {
        const blob = await resizeImage(file, 900, 0.8); // smaller in demo: browser storage is limited
        return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
      }
      const blob = await resizeImage(file);
      const { url } = await api("/admin/images", { method: "POST", raw: blob });
      return url;
    },

    // ---------- collections ----------
    async listCollections({ all = false } = {}) {
      await ready();
      let list;
      if (!LIVE) {
        const d = demo.read();
        list = d.collections.map((c) => ({ ...c, product_count: d.products.filter((p) => p.line === c.slug).length }));
      } else {
        list = await api(all ? "/admin/collections" : "/collections");
      }
      if (!all) list = list.filter((c) => c.visible);
      return list.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));
    },
    async saveCollection(c) {
      await ready();
      const row = { ...c, sort: Number(c.sort) || 0 };
      if (!LIVE) {
        const d = demo.read();
        if (row.id) d.collections = d.collections.map((x) => (x.id === row.id ? { ...x, ...row, slug: x.slug } : x));
        else {
          const base = String(row.name_en).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "collection";
          let slug = base;
          for (let i = 2; d.collections.some((x) => x.slug === slug); i++) slug = `${base}-${i}`;
          d.collections.push({ ...row, id: uid(), slug, created_at: new Date().toISOString() });
        }
        demo.write(d);
        return;
      }
      const { id, slug, created_at, updated_at, product_count, ...rest } = row;
      if (id) await api("/admin/collections/" + id, { method: "PUT", body: rest });
      else await api("/admin/collections", { method: "POST", body: rest });
    },
    async deleteCollection(id, moveTo) {
      await ready();
      if (!LIVE) {
        const d = demo.read();
        const c = d.collections.find((x) => x.id === id);
        if (!c) return;
        const n = d.products.filter((p) => p.line === c.slug).length;
        if (n && !moveTo) throw new Error(`This collection still has ${n} product(s). Choose a collection to move them to.`);
        d.products.forEach((p) => { if (p.line === c.slug) p.line = moveTo; });
        d.collections = d.collections.filter((x) => x.id !== id);
        demo.write(d);
        return;
      }
      await api("/admin/collections/" + id + (moveTo ? "?moveTo=" + encodeURIComponent(moveTo) : ""), { method: "DELETE" });
    },

    // ---------- website text and photos ----------
    async getContent() {
      await ready();
      if (!LIVE) return { ...demo.read().content };
      const { data } = await api("/content");
      return data || {};
    },
    async saveContent(map) {
      await ready();
      if (!LIVE) { const d = demo.read(); d.content = { ...map }; demo.write(d); return; }
      await api("/admin/content", { method: "PUT", body: map });
    },

    async listOrders() {
      await ready();
      if (!LIVE) return sortOrders(demo.read().orders);
      const list = await api("/admin/orders");
      return list.map((o) => ({
        ...o,
        price: o.price == null ? null : Number(o.price),
        deposit: o.deposit == null ? null : Number(o.deposit),
        needed_by: o.needed_by ? String(o.needed_by).slice(0, 10) : null,
      }));
    },
    // Used by the public order sheet. Returns the reference shown to the customer.
    async createOrder(o) {
      await ready();
      const row = {
        name: String(o.name || "").slice(0, 120),
        phone: String(o.phone || "").slice(0, 40),
        garment: o.garment || null,
        who: o.who || null,
        needed_by: o.needed_by || null,
        measurements: o.measurements || {},
        notes: o.notes ? String(o.notes).slice(0, 2000) : null,
        product_id: o.product_id && !String(o.product_id).startsWith("seed-") ? o.product_id : null,
        product_name: o.product_name || null,
      };
      if (!LIVE) {
        const ref = newRef();
        const d = demo.read();
        d.orders.push({ ...row, ref, id: uid(), product_id: o.product_id || null, source: "website", status: "new", created_at: new Date().toISOString(), price: null, deposit: null, admin_notes: "" });
        demo.write(d);
        return ref;
      }
      const { ref } = await api("/orders", { method: "POST", body: row });
      return ref;
    },
    // Admin: create (walk-in or phone orders) or update.
    async saveOrder(o) {
      await ready();
      const row = { ...o };
      ["price", "deposit"].forEach((k) => { row[k] = row[k] === "" || row[k] == null ? null : Number(row[k]); });
      if (!row.needed_by) row.needed_by = null;
      if (!LIVE) {
        const d = demo.read();
        if (row.id) d.orders = d.orders.map((x) => (x.id === row.id ? { ...x, ...row } : x));
        else d.orders.push({ ...row, id: uid(), ref: newRef(), created_at: new Date().toISOString() });
        demo.write(d);
        return;
      }
      if (row.product_id && String(row.product_id).startsWith("seed-")) row.product_id = null;
      const { id, ref, created_at, updated_at, ...rest } = row;
      if (id) await api("/admin/orders/" + id, { method: "PUT", body: rest });
      else await api("/admin/orders", { method: "POST", body: rest });
    },
    async deleteOrder(id) {
      await ready();
      if (!LIVE) { const d = demo.read(); d.orders = d.orders.filter((x) => x.id !== id); demo.write(d); return; }
      await api("/admin/orders/" + id, { method: "DELETE" });
    },
    // Calls cb when orders change: other tabs in demo mode, a 15-second check in live mode.
    onOrdersChange(cb) {
      if (!LIVE) {
        addEventListener("storage", (e) => { if (e.key === DEMO_KEY) cb(); });
        return;
      }
      let last = null;
      const tick = async () => {
        if (document.hidden) return;
        try {
          const { stamp } = await api("/admin/orders/stamp");
          if (last !== null && stamp !== last) cb();
          last = stamp;
        } catch (e) {}
      };
      tick();
      setInterval(tick, 15000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
    },

    // ---------- sign-in ----------
    async session() {
      await ready();
      if (!LIVE) { try { return sessionStorage.getItem("mayza-demo-session") ? { demo: true } : null; } catch (e) { return null; } }
      try { return await api("/auth/me"); } catch (e) { if (e.status === 401) return null; throw e; }
    },
    async startDemo() {
      try { sessionStorage.setItem("mayza-demo-session", "1"); localStorage.setItem(DEMO_FLAG, "1"); } catch (e) {}
      demo.write(demo.read());
    },
    resetDemo() {
      try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
      demo.write(demo.read());
    },
    async signIn(email, password) {
      await api("/auth/login", { method: "POST", body: { email, password } });
    },
    async signOut() {
      if (!LIVE) { try { sessionStorage.removeItem("mayza-demo-session"); } catch (e) {} return; }
      await api("/auth/logout", { method: "POST" }).catch(() => {});
    },
    async changePassword(current, next) {
      await api("/auth/password", { method: "POST", body: { current, next } });
    },

    // helpers shared by both sides
    intlPhone(p) {
      const d = String(p || "").replace(/\D/g, "");
      if (d.startsWith("251")) return d;
      if (d.startsWith("0")) return "251" + d.slice(1);
      if (d.length === 9) return "251" + d;
      return d;
    },
    telegramLink(v) {
      const s = String(v || "").trim();
      if (!s) return "";
      if (/^\+?\d[\d\s]+$/.test(s)) return "https://t.me/+" + Store.intlPhone(s);
      return "https://t.me/" + s.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
    },
    // Built-in photos are relative ("images/x.jpg"); uploaded ones are absolute ("/api/images/<id>").
    resolveImage(url, prefix = "") {
      if (!url) return "";
      return /^(https?:|data:|blob:|\/)/.test(url) ? url : prefix + url;
    },
  };

  window.MayzaStore = Store;
})();
