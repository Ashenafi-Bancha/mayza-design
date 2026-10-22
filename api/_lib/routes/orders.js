// Orders and inquiries: the pipeline, manual orders, payments, timeline and photos.
// Owners and managers see everything; tailors only see orders in production that
// are assigned to them, without prices or client contact details.
const express = require("express");
const db = require("../db");
const activity = require("../activity");
const core = require("../orders-core");
const { can, requirePerm } = require("../perms");
const { dropImage } = require("../images");
const { z, text, money, day, uuid, id, normPhone, h, httpError } = require("../validate");

const r = express.Router();
r.use("/orders", requirePerm("orders", "production"));

const isTailor = (req) => !can(req.admin.role, "orders");
const TAILOR_STATUSES = ["in_production", "ready"];
const MONEY_FIELDS = ["price", "deposit", "paid", "balance", "payment_status", "payment_note", "payments"];
const CONTACT_FIELDS = ["phone", "client_phone", "client_email", "client_telegram", "client_whatsapp"];

const measureMap = z.record(z.string().trim().min(1).max(40), z.string().trim().max(40))
  .refine((m) => Object.keys(m).length <= 40, "Too many measurements.")
  .transform((m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== "")))
  .default({});
const payment = z.object({
  amount: z.coerce.number().positive("A payment must be more than 0.").max(100000000),
  method: z.enum(core.METHODS).default("cash"),
  paid_on: day,
  note: text(300),
});
const inlineClient = z.object({
  full_name: z.string().trim().min(1, "Add the client's name.").max(120),
  phone: z.string().trim().min(5, "Add the client's phone number.").max(40),
  email: blank(z.string().trim().email("That email address does not look right.").max(200)),
  telegram: text(80), whatsapp: text(40), city: text(80),
});
function blank(s) { return z.preprocess((v) => (v === "" || v === undefined ? null : v), s.nullable()); }

const orderFields = {
  source: z.enum(core.SOURCES).default("phone"),
  type: z.enum(core.TYPES).default("custom"),
  priority: z.enum(core.PRIORITIES).default("normal"),
  garment: blank(z.enum(["cultural", "modern", "street", "group", "other"])),
  who: blank(z.enum(["woman", "man", "child", "couple", "family"])),
  product_id: uuid,
  product_name: text(160),
  notes: text(4000),          // what the client wants
  preferences: text(2000),    // fabric, colour, style
  occasion: text(160),
  event_date: day,
  needed_by: day,
  measurements: measureMap,
  assigned_to: uuid,
  admin_notes: text(4000),
  price: money,
  payment_note: text(500),
};
const createOrder = z.object({
  ...orderFields,
  client_id: uuid,
  client: inlineClient.optional().nullable(),
  status: z.enum(["new", "confirmed"]).default("new"),
  payments: z.array(payment).max(20).default([]),
  image_ids: z.array(z.string().uuid()).max(20).default([]),
  save_measurements: z.coerce.boolean().default(false),
  measurement_label: text(80),
}).refine((o) => o.client_id || o.client, { message: "Choose a client or add a new one.", path: ["client_id"] });
const updateOrder = z.object({ ...orderFields, client_id: id });

// ---------- loading ----------
const SELECT = `
  select o.*, c.full_name as client_name, c.phone as client_phone, c.email as client_email,
    c.telegram as client_telegram, c.whatsapp as client_whatsapp, c.vip as client_vip, c.phone_norm as client_phone_norm,
    a.name as assigned_name, a.email as assigned_email,
    coalesce(p.paid, 0) as paid,
    (select count(*)::int from order_images i where i.order_id = o.id) as image_count,
    (select '/api/images/' || i.image_id from order_images i where i.order_id = o.id order by i.kind = 'progress' desc, i.created_at desc limit 1) as cover
  from orders o
  left join clients c on c.id = o.client_id
  left join admins a on a.id = o.assigned_to
  left join lateral (select sum(amount) as paid from order_payments where order_id = o.id) p on true`;

function shape(req, o) {
  const out = { ...o, paid: Number(o.paid) || 0, price: o.price == null ? null : Number(o.price) };
  out.balance = out.price == null ? null : Math.max(0, out.price - out.paid);
  out.payment_status = core.paymentStatus(out.price, out.paid);
  delete out.client_phone_norm;
  delete out.ref;
  delete out.deposit;
  if (!can(req.admin.role, "orders.money")) MONEY_FIELDS.forEach((k) => delete out[k]);
  if (isTailor(req)) CONTACT_FIELDS.forEach((k) => delete out[k]);
  return out;
}

async function loadOrder(req, orderId, q = db) {
  const { rows } = await q.query(`${SELECT} where o.id = $1`, [orderId]);
  const o = rows[0];
  if (!o) throw httpError(404, "That order no longer exists.");
  if (isTailor(req) && (o.assigned_to !== req.admin.id || !TAILOR_STATUSES.includes(o.status))) {
    throw httpError(404, "That order is not assigned to you.");
  }
  return o;
}

// ---------- list ----------
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().max(200).optional(),
  source: z.enum(core.SOURCES).optional(),
  type: z.enum(core.TYPES).optional(),
  priority: z.enum(core.PRIORITIES).optional(),
  assigned: z.union([z.literal("me"), z.literal("none"), z.string().uuid()]).optional(),
  client: z.string().uuid().optional(),
  from: day.optional(), to: day.optional(),
  due: z.enum(["soon", "overdue"]).optional(),
  archived: z.enum(["1", "0"]).optional(),
}).strip();

function where(req, f) {
  const cond = [];
  const args = [];
  const p = (v) => { args.push(v); return "$" + args.length; }; // adds a parameter, returns its $n
  cond.push(f.archived === "1" ? "o.archived_at is not null" : "o.archived_at is null");
  if (isTailor(req)) cond.push(`o.assigned_to = ${p(req.admin.id)} and o.status = any(${p(TAILOR_STATUSES)})`);
  if (f.status) {
    const list = f.status.split(",").filter((s) => core.STATUSES.includes(s));
    if (list.length) cond.push(`o.status = any(${p(list)})`);
  }
  if (f.source) cond.push(`o.source = ${p(f.source)}`);
  if (f.type) cond.push(`o.type = ${p(f.type)}`);
  if (f.priority) cond.push(`o.priority = ${p(f.priority)}`);
  if (f.client) cond.push(`o.client_id = ${p(f.client)}`);
  if (f.assigned === "me") cond.push(`o.assigned_to = ${p(req.admin.id)}`);
  else if (f.assigned === "none") cond.push("o.assigned_to is null");
  else if (f.assigned) cond.push(`o.assigned_to = ${p(f.assigned)}`);
  if (f.from) cond.push(`o.created_at >= ${p(f.from)}::date`);
  if (f.to) cond.push(`o.created_at < ${p(f.to)}::date + 1`);
  if (f.due) {
    cond.push("o.status not in ('delivered', 'cancelled') and o.needed_by is not null");
    cond.push(f.due === "overdue" ? "o.needed_by < current_date" : "o.needed_by between current_date and current_date + 7");
  }
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    const like = p(`%${f.q.toLowerCase()}%`);
    const parts = [`lower(o.name) like ${like}`, `lower(c.full_name) like ${like}`, `lower(o.number) like ${like}`];
    if (digits.length >= 3) {
      const d = p(`%${digits.replace(/^0/, "")}%`);
      parts.push(`regexp_replace(o.phone, '\\D', '', 'g') like ${d}`, `c.phone_norm like ${d}`);
    }
    cond.push(`(${parts.join(" or ")})`);
  }
  return { sql: cond.length ? "where " + cond.join(" and ") : "", args };
}

r.get("/orders", h(async (req, res) => {
  const f = listQuery.parse(req.query);
  const w = where(req, f);
  const { rows } = await db.q(`${SELECT} ${w.sql} order by o.created_at desc limit 1000`, w.args);
  res.json(rows.map((o) => shape(req, o)));
}));

// cheap check the admin polls to notice new or changed orders
r.get("/orders/stamp", h(async (req, res) => {
  const mine = isTailor(req) ? "where assigned_to = $1" : "";
  const { rows } = await db.q(
    `select count(*)::int as n, coalesce(max(greatest(created_at, updated_at)), 'epoch') as t,
       count(*) filter (where status = 'new' and archived_at is null)::int as fresh from orders ${mine}`,
    isTailor(req) ? [req.admin.id] : []);
  res.json({ stamp: `${rows[0].n}:${new Date(rows[0].t).getTime()}`, fresh: rows[0].fresh });
}));

r.get("/orders/export.csv", requirePerm("orders.export"), h(async (req, res) => {
  const f = listQuery.parse(req.query);
  const w = where(req, f);
  const { rows } = await db.q(`${SELECT} ${w.sql} order by o.created_at desc`, w.args);
  const cols = ["number", "created_at", "status", "type", "source", "priority", "client_name", "phone", "product_name", "occasion", "event_date", "needed_by", "assigned_name", "price", "paid", "balance", "payment_status"];
  const cell = (v) => {
    if (v == null) return "";
    let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // keep spreadsheet apps from running formulas
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(","), ...rows.map((o) => shape(req, o)).map((o) => cols.map((k) => cell(o[k])).join(","))];
  await activity.log(req, { action: "orders.export", entity: "order", summary: `Exported ${rows.length} orders` });
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mayza-orders-${new Date().toISOString().slice(0, 10)}.csv"` });
  res.send("﻿" + lines.join("\r\n"));
}));

// ---------- detail ----------
r.get("/orders/:id", h(async (req, res) => {
  const o = await loadOrder(req, id.parse(req.params.id));
  const [events, images, payments] = await Promise.all([
    db.q("select * from order_events where order_id = $1 order by created_at, id", [o.id]),
    db.q("select id, image_id, kind, caption, created_at, '/api/images/' || image_id as url from order_images where order_id = $1 order by created_at", [o.id]),
    can(req.admin.role, "orders.money") ? db.q("select * from order_payments where order_id = $1 order by paid_on, created_at", [o.id]) : { rows: [] },
  ]);
  const out = shape(req, o);
  out.events = events.rows.filter((e) => can(req.admin.role, "orders.money") || e.kind !== "payment");
  out.images = images.rows;
  if (can(req.admin.role, "orders.money")) out.payments = payments.rows.map((p) => ({ ...p, amount: Number(p.amount) }));
  res.json(out);
}));

// ---------- create (manual "+ New Order") ----------
async function checkAssignee(q, staffId) {
  if (!staffId) return;
  const { rows } = await q.query("select 1 from admins where id = $1 and active", [staffId]);
  if (!rows[0]) throw httpError(400, "The staff member you assigned is not active.");
}

async function checkImages(q, ids) {
  if (!ids.length) return;
  const { rows } = await q.query("select count(*)::int as n from images where id = any($1)", [ids]);
  if (rows[0].n !== new Set(ids).size) throw httpError(400, "One of the photos was not uploaded. Add it again.");
}

r.post("/orders", requirePerm("orders"), h(async (req, res) => {
  const b = createOrder.parse(req.body);
  const order = await db.tx(async (c) => {
    await checkAssignee(c, b.assigned_to);
    await checkImages(c, b.image_ids);
    let clientId = b.client_id;
    let client;
    if (clientId) {
      const { rows } = await c.query("select * from clients where id = $1", [clientId]);
      if (!rows[0]) throw httpError(400, "That client no longer exists.");
      client = rows[0];
    } else {
      const { rows } = await c.query(
        `insert into clients (full_name, phone, phone_norm, email, telegram, whatsapp, city, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [b.client.full_name, b.client.phone, normPhone(b.client.phone), b.client.email, b.client.telegram, b.client.whatsapp, b.client.city, req.admin.id]);
      client = rows[0];
      clientId = client.id;
      await activity.log(req, { action: "client.create", entity: "client", id: clientId, summary: `Added client ${client.full_name}` }, c);
    }
    if (!client.phone || client.phone.length < 5) throw httpError(400, "This client has no phone number. Add one to their profile first.");
    const number = await core.nextNumber(c);
    const { rows } = await c.query(
      `insert into orders (number, client_id, name, phone, garment, who, needed_by, measurements, notes, product_id, product_name,
         source, status, type, priority, assigned_to, occasion, event_date, preferences, price, payment_note, admin_notes, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) returning id`,
      [number, clientId, client.full_name, client.phone, b.garment, b.who, b.needed_by, b.measurements, b.notes, b.product_id,
        await core.productName(c, b.product_id, b.product_name), b.source, b.status, b.type, b.priority, b.assigned_to,
        b.occasion, b.event_date, b.preferences, b.price, b.payment_note, b.admin_notes, req.admin.id]);
    const orderId = rows[0].id;
    for (const p of b.payments) {
      await c.query("insert into order_payments (order_id, amount, method, paid_on, note, created_by) values ($1,$2,$3,coalesce($4::date, current_date),$5,$6)",
        [orderId, p.amount, p.method, p.paid_on, p.note, req.admin.id]);
    }
    for (const img of b.image_ids) {
      await c.query("insert into order_images (order_id, image_id, kind, created_by) values ($1, $2, 'reference', $3)", [orderId, img, req.admin.id]);
    }
    if (b.save_measurements && Object.keys(b.measurements).length) {
      await c.query("insert into measurements (client_id, label, data, created_by) values ($1, $2, $3, $4)",
        [clientId, b.measurement_label || `For ${number}`, b.measurements, req.admin.id]);
    }
    const who = req.admin.name || req.admin.email;
    const via = core.SOURCE_LABEL[b.source];
    await core.addEvent(c, orderId, req.admin, { kind: "created", to: b.status, body: `Created by ${who} via ${via}` });
    if (b.assigned_to) await core.addEvent(c, orderId, req.admin, { kind: "assigned", body: "Assigned when the order was created" });
    await activity.log(req, { action: "order.create", entity: "order", id: orderId, summary: `Created ${number} for ${client.full_name} via ${via}`,
      details: { source: b.source, payments: b.payments.length, images: b.image_ids.length } }, c);
    return loadOrder(req, orderId, c);
  });
  res.status(201).json(shape(req, order));
}));

// ---------- edit ----------
const TRACKED = ["client_id", "source", "type", "priority", "garment", "who", "product_id", "product_name", "notes", "preferences", "occasion",
  "event_date", "needed_by", "measurements", "assigned_to", "admin_notes", "price", "payment_note"];
const LABELS = { needed_by: "due date", event_date: "event date", admin_notes: "internal notes", notes: "description", product_name: "catalog item", assigned_to: "assigned staff", payment_note: "payment note", client_id: "client" };
const same = (a, b) => JSON.stringify(a instanceof Date ? a.toISOString().slice(0, 10) : a ?? null) === JSON.stringify(b ?? null)
  || (a != null && b != null && String(a instanceof Date ? a.toISOString().slice(0, 10) : a) === String(b));

r.put("/orders/:id", requirePerm("orders"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const b = updateOrder.parse(req.body);
  const order = await db.tx(async (c) => {
    const before = await loadOrder(req, oid, c);
    await checkAssignee(c, b.assigned_to);
    const { rows: cl } = await c.query("select * from clients where id = $1", [b.client_id]);
    if (!cl[0]) throw httpError(400, "That client no longer exists.");
    const name = await core.productName(c, b.product_id, b.product_name);
    // without money access, keep the price as it was
    const price = can(req.admin.role, "orders.money") ? b.price : before.price;
    const paymentNote = can(req.admin.role, "orders.money") ? b.payment_note : before.payment_note;
    await c.query(
      `update orders set client_id=$2, name=$3, phone=$4, source=$5, type=$6, priority=$7, garment=$8, who=$9, product_id=$10, product_name=$11,
         notes=$12, preferences=$13, occasion=$14, event_date=$15, needed_by=$16, measurements=$17, assigned_to=$18, admin_notes=$19,
         price=$20, payment_note=$21, updated_at=now() where id=$1`,
      [oid, b.client_id, cl[0].full_name, cl[0].phone || before.phone, b.source, b.type, b.priority, b.garment, b.who, b.product_id, name,
        b.notes, b.preferences, b.occasion, b.event_date, b.needed_by, b.measurements, b.assigned_to, b.admin_notes, price, paymentNote]);
    const after = { ...b, product_name: name, price, payment_note: paymentNote };
    const changed = TRACKED.filter((k) => !same(before[k] == null ? null : (k === "price" ? Number(before[k]) : before[k]), after[k]));
    if (changed.includes("assigned_to")) {
      const { rows: s } = b.assigned_to ? await c.query("select name, email from admins where id = $1", [b.assigned_to]) : { rows: [] };
      await core.addEvent(c, oid, req.admin, { kind: "assigned", body: s[0] ? `Assigned to ${s[0].name || s[0].email}` : "Unassigned" });
    }
    const rest = changed.filter((k) => k !== "assigned_to");
    if (rest.length) {
      await core.addEvent(c, oid, req.admin, { kind: "edit", body: "Changed " + rest.map((k) => LABELS[k] || k.replace(/_/g, " ")).join(", ") });
      await activity.log(req, { action: "order.update", entity: "order", id: oid, summary: `Edited ${before.number}`, details: { changed } }, c);
    }
    return loadOrder(req, oid, c);
  });
  res.json(shape(req, order));
}));

// ---------- status ----------
function notifyLinks(order, status, settings = {}) {
  const first = (order.client_name || order.name || "").split(" ")[0];
  const msgs = {
    contacted: `Hello ${first}, this is Mayza Design about your order ${order.number}. We will be in touch with the details.`,
    quote_sent: `Hello ${first}, the quote for your order ${order.number} is ready. Please let us know if you would like to go ahead.`,
    confirmed: `Hello ${first}, your order ${order.number} with Mayza Design is confirmed. Thank you!`,
    in_production: `Hello ${first}, good news: your order ${order.number} is now being made in our workshop.`,
    ready: `Hello ${first}, your order ${order.number} is ready! You can collect it from Mayza Design${settings.address_en ? ", " + settings.address_en : ""}.`,
    delivered: `Thank you ${first} for choosing Mayza Design. We hope you love your outfit (${order.number}).`,
    cancelled: `Hello ${first}, your order ${order.number} has been cancelled. Please contact us if you have any questions.`,
    new: `Hello ${first}, we have received your order ${order.number} at Mayza Design.`,
  };
  const message = msgs[status];
  const wa = normPhone(order.client_whatsapp || order.client_phone || order.phone);
  const tg = String(order.client_telegram || "").replace(/^@|^https?:\/\/t\.me\//i, "");
  return {
    message,
    whatsapp: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : null,
    telegram: /^[A-Za-z0-9_]{4,32}$/.test(tg) ? `https://t.me/${tg}` : null,
    sms: order.phone ? `sms:${order.phone.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(message)}` : null,
  };
}

r.post("/orders/:id/status", h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const b = z.object({ status: z.enum(core.STATUSES), note: text(1000), notify: z.coerce.boolean().default(false) }).parse(req.body);
  const out = await db.tx(async (c) => {
    const o = await loadOrder(req, oid, c);
    if (isTailor(req) && !TAILOR_STATUSES.includes(b.status)) throw httpError(403, "You can only move your orders between In production and Ready.");
    if (o.status === b.status) return { order: o, notify: null };
    await c.query("update orders set status = $2, updated_at = now() where id = $1", [oid, b.status]);
    await core.addEvent(c, oid, req.admin, { kind: "status", from: o.status, to: b.status, body: b.note });
    await activity.log(req, { action: "order.status", entity: "order", id: oid,
      summary: `${o.number}: ${core.STATUS_LABEL[o.status]} → ${core.STATUS_LABEL[b.status]}`, details: { from: o.status, to: b.status } }, c);
    const fresh = await loadOrder(req, oid, c).catch(() => ({ ...o, status: b.status })); // a tailor may lose sight of it
    let notify = null;
    if (b.notify && !isTailor(req)) {
      const { rows } = await c.query("select data from settings where id = 1");
      notify = notifyLinks(o, b.status, rows[0] ? rows[0].data : {});
    }
    return { order: fresh, notify };
  });
  res.json({ order: shape(req, out.order), notify: out.notify });
}));

// ---------- notes ----------
r.post("/orders/:id/notes", h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const { body } = z.object({ body: z.string().trim().min(1, "Write a note first.").max(2000) }).parse(req.body);
  const o = await loadOrder(req, oid);
  await core.addEvent(db, oid, req.admin, { kind: "note", body });
  await db.q("update orders set updated_at = now() where id = $1", [oid]);
  await activity.log(req, { action: "order.note", entity: "order", id: oid, summary: `Added a note to ${o.number}` });
  res.status(201).json({ ok: true });
}));

// ---------- payments ----------
r.post("/orders/:id/payments", requirePerm("orders.money"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const p = payment.parse(req.body);
  const o = await loadOrder(req, oid);
  await db.tx(async (c) => {
    await c.query("insert into order_payments (order_id, amount, method, paid_on, note, created_by) values ($1,$2,$3,coalesce($4::date, current_date),$5,$6)",
      [oid, p.amount, p.method, p.paid_on, p.note, req.admin.id]);
    await c.query("update orders set updated_at = now() where id = $1", [oid]);
    await core.addEvent(c, oid, req.admin, { kind: "payment", body: `Payment of ${p.amount.toLocaleString("en-US")} ETB (${p.method})${p.note ? ": " + p.note : ""}` });
    await activity.log(req, { action: "order.payment", entity: "order", id: oid, summary: `Recorded ${p.amount} ETB on ${o.number}` }, c);
  });
  res.status(201).json(shape(req, await loadOrder(req, oid)));
}));

r.delete("/orders/:id/payments/:pid", requirePerm("orders.money"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const pid = id.parse(req.params.pid);
  const o = await loadOrder(req, oid);
  await db.tx(async (c) => {
    const { rows } = await c.query("delete from order_payments where id = $1 and order_id = $2 returning amount", [pid, oid]);
    if (!rows[0]) return;
    await core.addEvent(c, oid, req.admin, { kind: "payment", body: `Removed a payment of ${Number(rows[0].amount).toLocaleString("en-US")} ETB` });
    await activity.log(req, { action: "order.payment_delete", entity: "order", id: oid, summary: `Removed a ${rows[0].amount} ETB payment from ${o.number}` }, c);
  });
  res.json(shape(req, await loadOrder(req, oid)));
}));

// ---------- photos ----------
r.post("/orders/:id/images", h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const b = z.object({ image_id: id, kind: z.enum(["reference", "progress"]).default("reference"), caption: text(200) }).parse(req.body);
  const o = await loadOrder(req, oid);
  if (isTailor(req) && b.kind !== "progress") throw httpError(403, "You can add progress photos only.");
  await checkImages(db, [b.image_id]);
  await db.tx(async (c) => {
    await c.query("insert into order_images (order_id, image_id, kind, caption, created_by) values ($1,$2,$3,$4,$5)", [oid, b.image_id, b.kind, b.caption, req.admin.id]);
    await c.query("update orders set updated_at = now() where id = $1", [oid]);
    await core.addEvent(c, oid, req.admin, { kind: "image", body: b.kind === "progress" ? `Added a progress photo${b.caption ? ": " + b.caption : ""}` : "Added a reference photo" });
  });
  await activity.log(req, { action: "order.image", entity: "order", id: oid, summary: `Added a ${b.kind} photo to ${o.number}` });
  res.status(201).json({ ok: true });
}));

r.delete("/orders/:id/images/:iid", requirePerm("orders"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const iid = id.parse(req.params.iid);
  await loadOrder(req, oid);
  const { rows } = await db.q("delete from order_images where id = $1 and order_id = $2 returning image_id", [iid, oid]);
  if (rows[0]) await dropImage(`/api/images/${rows[0].image_id}`).catch(() => {});
  res.json({ ok: true });
}));

// ---------- duplicate, archive, delete ----------
r.post("/orders/:id/duplicate", requirePerm("orders"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const order = await db.tx(async (c) => {
    const o = await loadOrder(req, oid, c);
    const number = await core.nextNumber(c);
    const { rows } = await c.query(
      `insert into orders (number, client_id, name, phone, garment, who, measurements, notes, product_id, product_name, source, status, type,
         priority, occasion, preferences, price, admin_notes, created_by)
       select $2, client_id, name, phone, garment, who, measurements, notes, product_id, product_name, source, 'new', type,
         priority, occasion, preferences, price, admin_notes, $3 from orders where id = $1 returning id`,
      [oid, number, req.admin.id]);
    const nid = rows[0].id;
    await c.query("insert into order_images (order_id, image_id, kind, caption, created_by) select $2, image_id, kind, caption, $3 from order_images where order_id = $1 and kind = 'reference'", [oid, nid, req.admin.id]);
    await core.addEvent(c, nid, req.admin, { kind: "created", to: "new", body: `Duplicated from ${o.number} by ${req.admin.name || req.admin.email}` });
    await activity.log(req, { action: "order.duplicate", entity: "order", id: nid, summary: `Duplicated ${o.number} as ${number}` }, c);
    return loadOrder(req, nid, c);
  });
  res.status(201).json(shape(req, order));
}));

r.post("/orders/:id/archive", requirePerm("orders"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const { archived } = z.object({ archived: z.coerce.boolean().default(true) }).parse(req.body || {});
  const o = await loadOrder(req, oid);
  await db.q(`update orders set archived_at = ${archived ? "now()" : "null"}, updated_at = now() where id = $1`, [oid]);
  await activity.log(req, { action: archived ? "order.archive" : "order.restore", entity: "order", id: oid, summary: `${archived ? "Archived" : "Restored"} ${o.number}` });
  res.json({ ok: true });
}));

r.delete("/orders/:id", requirePerm("orders.delete"), h(async (req, res) => {
  const oid = id.parse(req.params.id);
  const o = await loadOrder(req, oid);
  const { rows: imgs } = await db.q("select image_id from order_images where order_id = $1", [oid]);
  await db.q("delete from orders where id = $1", [oid]);
  for (const i of imgs) await dropImage(`/api/images/${i.image_id}`).catch(() => {});
  await activity.log(req, { action: "order.delete", entity: "order", id: oid, summary: `Deleted ${o.number} (${o.client_name || o.name})` });
  res.json({ ok: true });
}));

module.exports = r;
module.exports.notifyLinks = notifyLinks;
