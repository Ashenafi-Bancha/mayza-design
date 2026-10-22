// Products, collections, photos, website text and site settings (signed-in staff).
const express = require("express");
const db = require("../db");
const activity = require("../activity");
const { requirePerm } = require("../perms");
const { dropImage, isImage, MIMES } = require("../images");
const { z, text, money, id, IMAGE_PATH, SLUG, h } = require("../validate");

const r = express.Router();
const blankToNull = (s) => z.preprocess((v) => (v === "" || v === undefined ? null : v), s.nullable());

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
const settings = z.object({
  phone: text(40), phone2: text(40), whatsapp: text(40), telegram: text(80),
  address_en: text(200), address_am: text(200), hours_en: text(200), hours_am: text(200),
  facebook: text(300), tiktok: text(300), instagram: text(300),
  stat_facebook: text(20), stat_tiktok: text(20), stat_likes: text(20),
  announce_on: z.coerce.boolean().default(false), announce_en: text(200), announce_am: text(200),
}).strip();
const slugify = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "collection";

// ---------- products ----------
r.get("/products", requirePerm("catalog.read", "catalog"), h(async (_req, res) => {
  const { rows } = await db.q("select * from products order by sort, created_at");
  res.json(rows);
}));

r.post("/products", requirePerm("catalog"), h(async (req, res) => {
  const p = product.parse(req.body);
  const { rows } = await db.q(
    `insert into products (name_en, name_am, description_en, description_am, line, price, image_url, featured, visible, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [p.name_en, p.name_am, p.description_en, p.description_am, p.line, p.price, p.image_url, p.featured, p.visible, p.sort]);
  await activity.log(req, { action: "product.create", entity: "product", id: rows[0].id, summary: `Added product "${p.name_en}"` });
  res.status(201).json(rows[0]);
}));

r.put("/products/:id", requirePerm("catalog"), h(async (req, res) => {
  const pid = id.parse(req.params.id);
  const p = product.parse(req.body);
  const before = await db.q("select image_url from products where id = $1", [pid]);
  if (!before.rows[0]) return res.status(404).json({ error: "That product no longer exists." });
  const { rows } = await db.q(
    `update products set name_en=$2, name_am=$3, description_en=$4, description_am=$5, line=$6, price=$7, image_url=$8,
       featured=$9, visible=$10, sort=$11, updated_at=now() where id=$1 returning *`,
    [pid, p.name_en, p.name_am, p.description_en, p.description_am, p.line, p.price, p.image_url, p.featured, p.visible, p.sort]);
  if (before.rows[0].image_url !== p.image_url) await dropImage(before.rows[0].image_url);
  await activity.log(req, { action: "product.update", entity: "product", id: pid, summary: `Edited product "${p.name_en}"` });
  res.json(rows[0]);
}));

r.delete("/products/:id", requirePerm("catalog"), h(async (req, res) => {
  const pid = id.parse(req.params.id);
  const { rows } = await db.q("delete from products where id = $1 returning image_url, name_en", [pid]);
  if (rows[0]) {
    await dropImage(rows[0].image_url);
    await activity.log(req, { action: "product.delete", entity: "product", id: pid, summary: `Deleted product "${rows[0].name_en}"` });
  }
  res.json({ ok: true });
}));

// ---------- photos ----------
r.post("/images", requirePerm("images"), express.raw({ type: MIMES, limit: "4mb" }), h(async (req, res) => {
  const mime = (req.get("content-type") || "").split(";")[0].trim();
  if (!isImage(mime, req.body)) return res.status(400).json({ error: "That file is not a JPG, PNG or WebP photo." });
  const { rows } = await db.q("insert into images (mime, data) values ($1, $2) returning id", [mime, req.body]);
  res.status(201).json({ id: rows[0].id, url: `/api/images/${rows[0].id}` });
}));

// ---------- collections ----------
r.get("/collections", requirePerm("catalog.read", "catalog"), h(async (_req, res) => {
  const { rows } = await db.q(
    `select c.*, (select count(*)::int from products p where p.line = c.slug) as product_count
     from collections c order by sort, created_at`);
  res.json(rows);
}));

const COLLECTION_COLS = ["name_en", "name_am", "tagline_en", "tagline_am", "summary_en", "summary_am", "description_en", "description_am", "tags_en", "tags_am", "image_url", "sort", "visible", "on_home"];

r.post("/collections", requirePerm("catalog"), h(async (req, res) => {
  const c = collection.parse(req.body);
  const base = slugify(c.name_en);
  const { rows: taken } = await db.q("select slug from collections where slug = $1 or slug like $2", [base, base + "-%"]);
  const used = new Set(taken.map((x) => x.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const { rows } = await db.q(
    `insert into collections (slug, ${COLLECTION_COLS.join(", ")}) values ($1, ${COLLECTION_COLS.map((_, i) => "$" + (i + 2)).join(", ")}) returning *`,
    [slug, ...COLLECTION_COLS.map((k) => c[k])]);
  await activity.log(req, { action: "collection.create", entity: "collection", id: rows[0].id, summary: `Added collection "${c.name_en}"` });
  res.status(201).json(rows[0]);
}));

r.put("/collections/:id", requirePerm("catalog"), h(async (req, res) => {
  const cid = id.parse(req.params.id);
  const c = collection.parse(req.body);
  const before = await db.q("select image_url from collections where id = $1", [cid]);
  if (!before.rows[0]) return res.status(404).json({ error: "That collection no longer exists." });
  const { rows } = await db.q(
    `update collections set ${COLLECTION_COLS.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = now() where id = $1 returning *`,
    [cid, ...COLLECTION_COLS.map((k) => c[k])]);
  if (before.rows[0].image_url !== c.image_url) await dropImage(before.rows[0].image_url);
  await activity.log(req, { action: "collection.update", entity: "collection", id: cid, summary: `Edited collection "${c.name_en}"` });
  res.json(rows[0]);
}));

// Deleting a collection that still has products needs somewhere to move them.
r.delete("/collections/:id", requirePerm("catalog"), h(async (req, res) => {
  const cid = id.parse(req.params.id);
  const moveTo = req.query.moveTo ? z.string().regex(SLUG).parse(req.query.moveTo) : null;
  const out = await db.tx(async (c) => {
    const { rows } = await c.query("select slug, image_url, name_en from collections where id = $1 for update", [cid]);
    if (!rows[0]) return { ok: true };
    const { rows: cnt } = await c.query("select count(*)::int as n from products where line = $1", [rows[0].slug]);
    if (cnt[0].n) {
      if (!moveTo || moveTo === rows[0].slug) return { status: 409, error: `This collection still has ${cnt[0].n} product(s). Choose a collection to move them to.` };
      const target = await c.query("select 1 from collections where slug = $1", [moveTo]);
      if (!target.rows[0]) return { status: 400, error: "The collection to move products to does not exist." };
      await c.query("update products set line = $1, updated_at = now() where line = $2", [moveTo, rows[0].slug]);
    }
    await c.query("delete from collections where id = $1", [cid]);
    await activity.log(req, { action: "collection.delete", entity: "collection", id: cid, summary: `Deleted collection "${rows[0].name_en}"` }, c);
    return { ok: true, image: rows[0].image_url };
  });
  if (out.status) return res.status(out.status).json({ error: out.error });
  if (out.image) await dropImage(out.image).catch(() => {});
  res.json({ ok: true });
}));

// ---------- website text ----------
// Saves the whole content map: keys missing from the map go back to the page's original text.
r.put("/content", requirePerm("content"), h(async (req, res) => {
  const map = contentMap.parse(req.body);
  const entries = Object.entries(map).filter(([, v]) => v.en || v.am || v.img);
  const old = await db.tx(async (c) => {
    const { rows } = await c.query("select data->>'img' as img from content where data ? 'img'");
    await c.query("delete from content");
    for (const [key, data] of entries) await c.query("insert into content (key, data) values ($1, $2)", [key, data]);
    await activity.log(req, { action: "content.update", entity: "content", summary: `Saved website text (${entries.length} edited fields)` }, c);
    return rows;
  });
  const keep = new Set(entries.map(([, v]) => v.img).filter(Boolean));
  for (const x of old) if (!keep.has(x.img)) await dropImage(x.img).catch(() => {});
  res.json({ ok: true });
}));

// ---------- settings (owner) ----------
r.put("/settings", requirePerm("settings"), h(async (req, res) => {
  const data = settings.parse(req.body);
  await db.q("insert into settings (id, data, updated_at) values (1, $1, now()) on conflict (id) do update set data = $1, updated_at = now()", [data]);
  await activity.log(req, { action: "settings.update", entity: "settings", summary: "Updated contact details and site settings" });
  res.json({ ok: true });
}));

module.exports = r;
