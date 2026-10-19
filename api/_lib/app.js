// Mayza Design API (Express). Public routes serve settings, products, photos
// and accept website orders; /api/admin routes need a signed-in admin.
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const db = require("./db");
const auth = require("./auth");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const api = express.Router();
app.use("/api", api);

api.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: "same-origin" },
}));
api.use(cookieParser());
api.use(express.json({ limit: "100kb" }));
api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

// Block cross-site form posts and scripts on other sites from changing anything.
api.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  const host = req.get("x-forwarded-host") || req.get("host");
  try {
    if (new URL(origin).host === host) return next();
  } catch (e) {}
  res.status(403).json({ error: "This request came from another website and was blocked." });
});

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const limit = (windowMinutes, max, message, extra = {}) => rateLimit({
  windowMs: windowMinutes * 60 * 1000, limit: max, standardHeaders: "draft-7", legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: message }),
  ...extra,
});

// ---------- validation ----------
const blankToNull = (schema) => z.preprocess((v) => (v === "" || v === undefined ? null : v), schema.nullable());
const text = (max) => blankToNull(z.string().trim().max(max));
const money = blankToNull(z.coerce.number().min(0).max(100000000));
const day = blankToNull(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-12-31."));
const uuid = blankToNull(z.string().uuid());
const GARMENTS = ["cultural", "modern", "street", "group", "other"];
const WHOS = ["woman", "man", "child", "couple", "family"];
const STATUSES = ["new", "confirmed", "in_progress", "ready", "delivered", "cancelled"];
const SOURCES = ["website", "phone", "walk-in", "social"];
const SLUG = /^[a-z0-9-]{1,60}$/;
const measurements = z.object({
  chest: z.string().max(10).optional(), waist: z.string().max(10).optional(),
  hip: z.string().max(10).optional(), height: z.string().max(10).optional(),
}).strip().default({});

const orderBase = {
  name: z.string().trim().min(1, "Add the customer's name.").max(120),
  phone: z.string().trim().min(5, "Add a phone number.").max(40),
  garment: blankToNull(z.enum(GARMENTS)),
  who: blankToNull(z.enum(WHOS)),
  needed_by: day,
  measurements,
  notes: text(2000),
  product_id: uuid,
  product_name: text(160),
};
const publicOrder = z.object({ ...orderBase, company: z.string().optional() });
const adminOrder = z.object({
  ...orderBase,
  status: z.enum(STATUSES).default("new"),
  source: z.enum(SOURCES).default("phone"),
  price: money,
  deposit: money,
  admin_notes: text(4000),
});
const IMAGE_PATH = /^(images\/[\w.-]+|\/api\/images\/[0-9a-f-]{36})$/;
const product = z.object({
  name_en: z.string().trim().min(1, "Add an English name for the product.").max(120),
  name_am: text(120),
  description_en: text(1000),
  description_am: text(1000),
  line: z.string().regex(SLUG, "Choose a collection."),
  price: money,
  image_url: z.string().regex(IMAGE_PATH, "Add a photo for the product."),
  featured: z.coerce.boolean().default(false),
  visible: z.coerce.boolean().default(true),
  sort: z.coerce.number().int().min(-100000).max(100000).default(0),
});
const collection = z.object({
  name_en: z.string().trim().min(1, "Add an English name for the collection.").max(120),
  name_am: text(120),
  tagline_en: text(120), tagline_am: text(120),
  summary_en: text(300), summary_am: text(300),
  description_en: text(1500), description_am: text(1500),
  tags_en: text(500), tags_am: text(500),
  image_url: blankToNull(z.string().regex(IMAGE_PATH, "Choose a cover photo.")),
  sort: z.coerce.number().int().min(-100000).max(100000).default(0),
  visible: z.coerce.boolean().default(true),
  on_home: z.coerce.boolean().default(false),
});
const contentEntry = z.object({
  en: z.string().max(3000).optional(),
  am: z.string().max(3000).optional(),
  img: z.string().regex(IMAGE_PATH, "Use a photo uploaded from the admin.").optional(),
}).strip();
const contentMap = z.record(z.string().regex(/^[a-z0-9_.-]{1,80}$/, "One of the content fields has a name the website does not use."), contentEntry)
  .refine((m) => Object.keys(m).length <= 400, "Too many content fields in one save.");
const slugify = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "collection";

const settings = z.object({
  phone: text(40), phone2: text(40), whatsapp: text(40), telegram: text(80),
  address_en: text(200), address_am: text(200), hours_en: text(200), hours_am: text(200),
  facebook: text(300), tiktok: text(300), instagram: text(300),
  stat_facebook: text(20), stat_tiktok: text(20), stat_likes: text(20),
  announce_on: z.coerce.boolean().default(false), announce_en: text(200), announce_am: text(200),
}).strip();

const newRef = () => "MZ" + crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();

async function insertOrder(row) {
  for (let i = 0; i < 4; i++) {
    try {
      const { rows } = await db.q(
        `insert into orders (ref, name, phone, garment, who, needed_by, measurements, notes, product_id, product_name, source, status, price, deposit, admin_notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
        [newRef(), row.name, row.phone, row.garment, row.who, row.needed_by, row.measurements, row.notes, row.product_id, row.product_name,
          row.source, row.status, row.price ?? null, row.deposit ?? null, row.admin_notes ?? null]);
      return rows[0];
    } catch (err) {
      if (err.code !== "23505") throw err; // retry only if the reference was already taken
    }
  }
  throw new Error("Could not create an order reference. Please try again.");
}

// The order keeps the product's name even if the product is later deleted.
async function productName(id, fallback) {
  if (!id) return fallback || null;
  const { rows } = await db.q("select name_en from products where id = $1", [id]);
  return rows[0] ? rows[0].name_en : fallback || null;
}

const imageId = (url) => { const m = /^\/api\/images\/([0-9a-f-]{36})$/.exec(url || ""); return m ? m[1] : null; };
// Removes an uploaded photo once nothing on the site uses it any more
// (a duplicated product or a page section may share the same photo).
async function dropImage(url) {
  const id = imageId(url);
  if (!id) return;
  const { rows } = await db.q(
    `select 1 from products where image_url = $1
     union all select 1 from collections where image_url = $1
     union all select 1 from content where data->>'img' = $1 limit 1`, [url]);
  if (!rows.length) await db.q("delete from images where id = $1", [id]);
}

// ---------- public ----------
api.get("/health", (_req, res) => res.json({ ok: true, configured: db.configured() }));

api.get("/settings", h(async (_req, res) => {
  const { rows } = await db.q("select data from settings where id = 1");
  res.set("Cache-Control", "public, max-age=30");
  res.json({ data: rows[0] ? rows[0].data : {} });
}));

api.get("/products", h(async (_req, res) => {
  const { rows } = await db.q("select * from products where visible order by featured desc, sort, created_at");
  res.set("Cache-Control", "public, max-age=30");
  res.json(rows);
}));

api.get("/products/:id", h(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(404).json({ error: "Product not found." });
  const { rows } = await db.q("select * from products where id = $1 and visible", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json(rows[0]);
}));

api.get("/collections", h(async (_req, res) => {
  const { rows } = await db.q("select * from collections where visible order by sort, created_at");
  res.set("Cache-Control", "public, max-age=30");
  res.json(rows);
}));

api.get("/content", h(async (_req, res) => {
  const { rows } = await db.q("select key, data from content");
  res.set("Cache-Control", "public, max-age=30");
  res.json({ data: Object.fromEntries(rows.map((r) => [r.key, r.data])) });
}));

api.get("/images/:id", h(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(404).end();
  const { rows } = await db.q("select mime, data from images where id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).end();
  res.set({ "Content-Type": rows[0].mime, "Cache-Control": "public, max-age=31536000, immutable" });
  res.send(rows[0].data);
}));

api.post("/orders", limit(10, 8, "Too many orders from this connection. Please call or message us instead."), h(async (req, res) => {
  const body = publicOrder.parse(req.body);
  if (body.company) return res.status(201).json({ ref: newRef() }); // honeypot: quietly ignore bots
  const order = await insertOrder({
    ...body,
    product_name: await productName(body.product_id, body.product_name),
    source: "website", status: "new",
  });
  res.status(201).json({ ref: order.ref });
}));

// ---------- sign-in ----------
api.post("/auth/login", limit(15, 10, "Too many sign-in attempts. Wait 15 minutes and try again.", { skipSuccessfulRequests: true }), h(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().min(3).max(200), password: z.string().min(1).max(200) }).parse(req.body);
  const admin = await auth.verifyLogin(email, password);
  if (!admin) return res.status(401).json({ error: "The email or password is not correct." });
  auth.setSession(res, admin);
  res.json({ email: admin.email, name: admin.name });
}));

api.post("/auth/logout", (_req, res) => { auth.clearSession(res); res.json({ ok: true }); });

api.get("/auth/me", auth.requireAdmin, (req, res) => res.json({ email: req.admin.email, name: req.admin.name }));

api.post("/auth/password", auth.requireAdmin, h(async (req, res) => {
  const { current, next } = z.object({
    current: z.string().min(1, "Type your current password.").max(200),
    next: z.string().min(8, "Use at least 8 characters.").max(200),
  }).parse(req.body);
  if (!(await auth.compare(current, req.admin.password_hash))) return res.status(400).json({ error: "Your current password is not correct." });
  const { rows } = await db.q(
    "update admins set password_hash = $1, token_version = token_version + 1 where id = $2 returning id, token_version",
    [await auth.hash(next), req.admin.id]);
  auth.setSession(res, rows[0]); // keep this device signed in, sign out the others
  res.json({ ok: true });
}));

// ---------- admin ----------
const admin = express.Router();
api.use("/admin", auth.requireAdmin, admin);

admin.get("/orders", h(async (_req, res) => {
  const { rows } = await db.q("select * from orders order by created_at desc limit 2000");
  res.json(rows);
}));

// cheap check the admin polls to notice new or changed orders
admin.get("/orders/stamp", h(async (_req, res) => {
  const { rows } = await db.q("select count(*)::int as n, coalesce(max(greatest(created_at, updated_at)), 'epoch') as t from orders");
  res.json({ stamp: `${rows[0].n}:${new Date(rows[0].t).getTime()}` });
}));

admin.post("/orders", h(async (req, res) => {
  const body = adminOrder.parse(req.body);
  const order = await insertOrder({ ...body, product_name: await productName(body.product_id, body.product_name) });
  res.status(201).json(order);
}));

admin.put("/orders/:id", h(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const b = adminOrder.parse(req.body);
  const { rows } = await db.q(
    `update orders set name=$2, phone=$3, garment=$4, who=$5, needed_by=$6, measurements=$7, notes=$8, product_id=$9, product_name=$10,
       source=$11, status=$12, price=$13, deposit=$14, admin_notes=$15, updated_at=now() where id=$1 returning *`,
    [id, b.name, b.phone, b.garment, b.who, b.needed_by, b.measurements, b.notes, b.product_id, await productName(b.product_id, b.product_name),
      b.source, b.status, b.price, b.deposit, b.admin_notes]);
  if (!rows[0]) return res.status(404).json({ error: "That order no longer exists." });
  res.json(rows[0]);
}));

admin.delete("/orders/:id", h(async (req, res) => {
  await db.q("delete from orders where id = $1", [z.string().uuid().parse(req.params.id)]);
  res.json({ ok: true });
}));

admin.get("/products", h(async (_req, res) => {
  const { rows } = await db.q("select * from products order by sort, created_at");
  res.json(rows);
}));

admin.post("/products", h(async (req, res) => {
  const p = product.parse(req.body);
  const { rows } = await db.q(
    `insert into products (name_en, name_am, description_en, description_am, line, price, image_url, featured, visible, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [p.name_en, p.name_am, p.description_en, p.description_am, p.line, p.price, p.image_url, p.featured, p.visible, p.sort]);
  res.status(201).json(rows[0]);
}));

admin.put("/products/:id", h(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const p = product.parse(req.body);
  const before = await db.q("select image_url from products where id = $1", [id]);
  if (!before.rows[0]) return res.status(404).json({ error: "That product no longer exists." });
  const { rows } = await db.q(
    `update products set name_en=$2, name_am=$3, description_en=$4, description_am=$5, line=$6, price=$7, image_url=$8,
       featured=$9, visible=$10, sort=$11, updated_at=now() where id=$1 returning *`,
    [id, p.name_en, p.name_am, p.description_en, p.description_am, p.line, p.price, p.image_url, p.featured, p.visible, p.sort]);
  if (before.rows[0].image_url !== p.image_url) await dropImage(before.rows[0].image_url);
  res.json(rows[0]);
}));

admin.delete("/products/:id", h(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { rows } = await db.q("delete from products where id = $1 returning image_url", [id]);
  if (rows[0]) await dropImage(rows[0].image_url);
  res.json({ ok: true });
}));

const MAGIC = { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47], "image/webp": [0x52, 0x49, 0x46, 0x46] };
admin.post("/images", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "4mb" }), h(async (req, res) => {
  const mime = (req.get("content-type") || "").split(";")[0].trim();
  const sig = MAGIC[mime];
  if (!Buffer.isBuffer(req.body) || !sig || !sig.every((b, i) => req.body[i] === b)) {
    return res.status(400).json({ error: "That file is not a JPG, PNG or WebP photo." });
  }
  const { rows } = await db.q("insert into images (mime, data) values ($1, $2) returning id", [mime, req.body]);
  res.status(201).json({ url: `/api/images/${rows[0].id}` });
}));

admin.get("/collections", h(async (_req, res) => {
  const { rows } = await db.q(
    `select c.*, (select count(*)::int from products p where p.line = c.slug) as product_count
     from collections c order by sort, created_at`);
  res.json(rows);
}));

const COLLECTION_COLS = ["name_en", "name_am", "tagline_en", "tagline_am", "summary_en", "summary_am", "description_en", "description_am", "tags_en", "tags_am", "image_url", "sort", "visible", "on_home"];

admin.post("/collections", h(async (req, res) => {
  const c = collection.parse(req.body);
  const base = slugify(c.name_en);
  const { rows: taken } = await db.q("select slug from collections where slug = $1 or slug like $2", [base, base + "-%"]);
  const used = new Set(taken.map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const { rows } = await db.q(
    `insert into collections (slug, ${COLLECTION_COLS.join(", ")}) values ($1, ${COLLECTION_COLS.map((_, i) => "$" + (i + 2)).join(", ")}) returning *`,
    [slug, ...COLLECTION_COLS.map((k) => c[k])]);
  res.status(201).json(rows[0]);
}));

admin.put("/collections/:id", h(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const c = collection.parse(req.body);
  const before = await db.q("select image_url from collections where id = $1", [id]);
  if (!before.rows[0]) return res.status(404).json({ error: "That collection no longer exists." });
  const { rows } = await db.q(
    `update collections set ${COLLECTION_COLS.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = now() where id = $1 returning *`,
    [id, ...COLLECTION_COLS.map((k) => c[k])]);
  if (before.rows[0].image_url !== c.image_url) await dropImage(before.rows[0].image_url);
  res.json(rows[0]);
}));

// Deleting a collection that still has products needs somewhere to move them.
admin.delete("/collections/:id", h(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const moveTo = req.query.moveTo ? z.string().regex(SLUG).parse(req.query.moveTo) : null;
  const client = await db.getPool().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query("select slug, image_url from collections where id = $1 for update", [id]);
    if (!rows[0]) { await client.query("rollback"); return res.json({ ok: true }); }
    const { rows: cnt } = await client.query("select count(*)::int as n from products where line = $1", [rows[0].slug]);
    if (cnt[0].n) {
      if (!moveTo || moveTo === rows[0].slug) {
        await client.query("rollback");
        return res.status(409).json({ error: `This collection still has ${cnt[0].n} product(s). Choose a collection to move them to.` });
      }
      const target = await client.query("select 1 from collections where slug = $1", [moveTo]);
      if (!target.rows[0]) { await client.query("rollback"); return res.status(400).json({ error: "The collection to move products to does not exist." }); }
      await client.query("update products set line = $1, updated_at = now() where line = $2", [moveTo, rows[0].slug]);
    }
    await client.query("delete from collections where id = $1", [id]);
    await client.query("commit");
    await dropImage(rows[0].image_url).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// Saves the whole content map: keys missing from the map go back to the page's original text.
admin.put("/content", h(async (req, res) => {
  const map = contentMap.parse(req.body);
  const entries = Object.entries(map).filter(([, v]) => v.en || v.am || v.img);
  const client = await db.getPool().connect();
  try {
    await client.query("begin");
    const { rows: old } = await client.query("select data->>'img' as img from content where data ? 'img'");
    await client.query("delete from content");
    for (const [key, data] of entries) await client.query("insert into content (key, data) values ($1, $2)", [key, data]);
    await client.query("commit");
    const keep = new Set(entries.map(([, v]) => v.img).filter(Boolean));
    for (const r of old) if (!keep.has(r.img)) await dropImage(r.img).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

admin.put("/settings", h(async (req, res) => {
  const data = settings.parse(req.body);
  await db.q("insert into settings (id, data, updated_at) values (1, $1, now()) on conflict (id) do update set data = $1, updated_at = now()", [data]);
  res.json({ ok: true });
}));

api.use((_req, res) => res.status(404).json({ error: "Not found." }));

// ---------- errors ----------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That file is too large. Use a photo under 4 MB." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "The request could not be read." });
  if (err.code === "23503") return res.status(400).json({ error: "That collection does not exist any more. Choose another one." });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? "Something went wrong on the server. Please try again." : err.message });
});

module.exports = app;
