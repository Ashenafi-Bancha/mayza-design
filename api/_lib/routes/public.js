// Public routes: what the website reads, the website order form, and the visitor tracker.
const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const activity = require("../activity");
const core = require("../orders-core");
const { z, text, day, uuid, h, limit } = require("../validate");

const r = express.Router();

r.get("/health", (_req, res) => res.json({ ok: true, configured: db.configured() }));

const cached = (res) => res.set("Cache-Control", "public, max-age=30");

r.get("/settings", h(async (_req, res) => {
  const { rows } = await db.q("select data from settings where id = 1");
  cached(res).json({ data: rows[0] ? rows[0].data : {} });
}));

r.get("/products", h(async (_req, res) => {
  const { rows } = await db.q("select * from products where visible order by featured desc, sort, created_at");
  cached(res).json(rows);
}));

r.get("/products/:id", h(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(404).json({ error: "Product not found." });
  const { rows } = await db.q("select * from products where id = $1 and visible", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json(rows[0]);
}));

r.get("/collections", h(async (_req, res) => {
  const { rows } = await db.q("select * from collections where visible order by sort, created_at");
  cached(res).json(rows);
}));

r.get("/content", h(async (_req, res) => {
  const { rows } = await db.q("select key, data from content");
  cached(res).json({ data: Object.fromEntries(rows.map((x) => [x.key, x.data])) });
}));

r.get("/images/:id", h(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(404).end();
  const { rows } = await db.q("select mime, data from images where id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).end();
  res.set({ "Content-Type": rows[0].mime, "Cache-Control": "public, max-age=31536000, immutable" });
  res.send(rows[0].data);
}));

const measurements = z.object({
  chest: z.string().max(10).optional(), waist: z.string().max(10).optional(),
  hip: z.string().max(10).optional(), height: z.string().max(10).optional(),
}).strip().default({});

const publicOrder = z.object({
  name: z.string().trim().min(1, "Add your name.").max(120),
  phone: z.string().trim().min(5, "Add a phone number.").max(40),
  garment: z.preprocess((v) => v || null, z.enum(["cultural", "modern", "street", "group", "other"]).nullable()),
  who: z.preprocess((v) => v || null, z.enum(["woman", "man", "child", "couple", "family"]).nullable()),
  needed_by: day,
  measurements,
  notes: text(2000),
  product_id: uuid,
  product_name: text(160),
  company: z.string().optional(), // honeypot
});

r.post("/orders", limit(10, 8, "Too many orders from this connection. Please call or message us instead."), h(async (req, res) => {
  const body = publicOrder.parse(req.body);
  if (body.company) return res.status(201).json({ ref: "ORD-" + crypto.randomBytes(3).toString("hex").toUpperCase() }); // quietly ignore bots
  const order = await db.tx(async (c) => {
    const clientId = await core.findOrCreateClient(c, { name: body.name, phone: body.phone });
    const number = await core.nextNumber(c);
    const { rows } = await c.query(
      `insert into orders (number, client_id, name, phone, garment, who, needed_by, measurements, notes, product_id, product_name, source, status, type)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'website','new','custom') returning id, number`,
      [number, clientId, body.name, body.phone, body.garment, body.who, body.needed_by, body.measurements, body.notes,
        body.product_id, await core.productName(c, body.product_id, body.product_name)]);
    await core.addEvent(c, rows[0].id, null, { kind: "created", to: "new", body: "Sent from the website order form" });
    await activity.log(req, { action: "order.create", entity: "order", id: rows[0].id, summary: `${number} received from the website` }, c);
    return rows[0];
  });
  res.status(201).json({ ref: order.number, number: order.number });
}));

// Visitor tracker for the dashboard: no cookies, no IP addresses stored.
const SOURCE_HOSTS = [["instagram", /instagram\.com$/], ["google", /(^|\.)google\./], ["telegram", /(t\.me|telegram\.(org|me))$/],
  ["facebook", /(facebook\.com|fb\.com|fb\.me)$/], ["tiktok", /tiktok\.com$/], ["whatsapp", /whatsapp\.(com|net)$/]];
function sourceOf(ref, utm, host) {
  if (utm) { const u = String(utm).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30); if (u) return u; }
  if (!ref) return "direct";
  try {
    const rh = new URL(ref).hostname.replace(/^www\./, "");
    if (host && rh === String(host).split(":")[0]) return null; // internal navigation
    const hit = SOURCE_HOSTS.find(([, re]) => re.test(rh));
    return hit ? hit[0] : "other";
  } catch (e) { return "direct"; }
}
const track = z.object({
  path: z.string().max(200).regex(/^\/[\w\-./]*$/),
  ref: z.string().max(500).optional().nullable(),
  utm: z.string().max(60).optional().nullable(),
  collection: z.string().max(60).regex(/^[a-z0-9-]*$/).optional().nullable(),
  visit: z.boolean().optional(),
}).strip();

r.post("/track", limit(1, 60, "Slow down."), express.text({ type: "text/plain", limit: "2kb" }), h(async (req, res) => {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { return res.status(204).end(); } }
  const t = track.safeParse(body);
  if (!t.success || /bot|crawl|spider|lighthouse|headless/i.test(req.get("user-agent") || "")) return res.status(204).end();
  const src = sourceOf(t.data.ref, t.data.utm, req.get("x-forwarded-host") || req.get("host"));
  await db.q("insert into page_views (path, source, collection, visit) values ($1, $2, $3, $4)",
    [t.data.path, src || "internal", t.data.collection || null, Boolean(t.data.visit) && src !== null]);
  res.status(204).end();
}));

module.exports = r;
module.exports.sourceOf = sourceOf;
