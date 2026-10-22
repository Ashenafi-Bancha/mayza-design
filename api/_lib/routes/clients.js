// Clients and their saved measurements (owner and manager only).
const express = require("express");
const db = require("../db");
const activity = require("../activity");
const { requirePerm } = require("../perms");
const { z, text, day, id, normPhone, h, httpError } = require("../validate");

const r = express.Router();
r.use("/clients", requirePerm("clients"));

const blank = (s) => z.preprocess((v) => (v === "" || v === undefined ? null : v), s.nullable());
const clientBody = z.object({
  full_name: z.string().trim().min(1, "Add the client's name.").max(120),
  phone: blank(z.string().trim().min(5, "That phone number is too short.").max(40)),
  email: blank(z.string().trim().email("That email address does not look right.").max(200)),
  telegram: text(80), whatsapp: text(40), city: text(80),
  notes: text(4000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  vip: z.coerce.boolean().default(false),
});
const measureBody = z.object({
  label: text(80),
  data: z.record(z.string().trim().min(1).max(40), z.string().trim().max(40)).refine((m) => Object.keys(m).length <= 40, "Too many measurements."),
  notes: text(1000),
  taken_on: day,
});

const SUMMARY = `
  select c.*, coalesce(s.orders, 0)::int as order_count, s.last_order, coalesce(s.spent, 0) as total_paid
  from clients c
  left join lateral (
    select count(*) as orders, max(o.created_at) as last_order,
      (select sum(p.amount) from order_payments p join orders o2 on o2.id = p.order_id where o2.client_id = c.id) as spent
    from orders o where o.client_id = c.id
  ) s on true`;

r.get("/clients", h(async (req, res) => {
  const f = z.object({ q: z.string().trim().max(100).optional(), vip: z.enum(["1"]).optional(), archived: z.enum(["1"]).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(200) }).strip().parse(req.query);
  const args = [];
  const cond = [f.archived ? "c.archived_at is not null" : "c.archived_at is null"];
  if (f.vip) cond.push("c.vip");
  if (f.q) {
    args.push(`%${f.q.toLowerCase()}%`);
    const parts = [`lower(c.full_name) like $${args.length}`, `lower(coalesce(c.email, '')) like $${args.length}`, `lower(coalesce(c.telegram, '')) like $${args.length}`];
    const digits = f.q.replace(/\D/g, "").replace(/^0/, "");
    if (digits.length >= 3) { args.push(`%${digits}%`); parts.push(`c.phone_norm like $${args.length}`); }
    cond.push(`(${parts.join(" or ")})`);
  }
  args.push(f.limit);
  const { rows } = await db.q(`${SUMMARY} where ${cond.join(" and ")} order by coalesce(s.last_order, c.created_at) desc limit $${args.length}`, args);
  res.json(rows.map((c) => ({ ...c, total_paid: Number(c.total_paid) })));
}));

// Warns about an existing client with the same phone number before saving a new one.
r.get("/clients/check-phone", h(async (req, res) => {
  const { phone, exclude } = z.object({ phone: z.string().max(40), exclude: z.string().uuid().optional() }).parse(req.query);
  const pn = normPhone(phone);
  if (!pn || pn.length < 9) return res.json([]);
  const { rows } = await db.q(
    "select id, full_name, phone, vip from clients where phone_norm = $1 and archived_at is null and ($2::uuid is null or id <> $2) limit 5",
    [pn, exclude || null]);
  res.json(rows);
}));

r.get("/clients/:id", h(async (req, res) => {
  const cid = id.parse(req.params.id);
  const { rows } = await db.q(`${SUMMARY} where c.id = $1`, [cid]);
  if (!rows[0]) throw httpError(404, "That client no longer exists.");
  const [orders, measures] = await Promise.all([
    db.q(`select o.id, o.number, o.status, o.type, o.created_at, o.needed_by, o.product_name, o.price, o.archived_at,
            coalesce((select sum(amount) from order_payments p where p.order_id = o.id), 0) as paid
          from orders o where o.client_id = $1 order by o.created_at desc`, [cid]),
    db.q("select * from measurements where client_id = $1 order by taken_on desc, created_at desc", [cid]),
  ]);
  if (rows[0].vip) await activity.log(req, { action: "client.view", entity: "client", id: cid, summary: `Viewed VIP client ${rows[0].full_name}` });
  res.json({
    ...rows[0], total_paid: Number(rows[0].total_paid),
    orders: orders.rows.map((o) => ({ ...o, paid: Number(o.paid), price: o.price == null ? null : Number(o.price) })),
    measurements: measures.rows,
  });
}));

r.post("/clients", h(async (req, res) => {
  const b = clientBody.parse(req.body);
  const { rows } = await db.q(
    `insert into clients (full_name, phone, phone_norm, email, telegram, whatsapp, city, notes, tags, vip, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
    [b.full_name, b.phone, normPhone(b.phone), b.email, b.telegram, b.whatsapp, b.city, b.notes, b.tags, b.vip, req.admin.id]);
  await activity.log(req, { action: "client.create", entity: "client", id: rows[0].id, summary: `Added client ${b.full_name}` });
  res.status(201).json(rows[0]);
}));

r.put("/clients/:id", h(async (req, res) => {
  const cid = id.parse(req.params.id);
  const b = clientBody.parse(req.body);
  const { rows } = await db.q(
    `update clients set full_name=$2, phone=$3, phone_norm=$4, email=$5, telegram=$6, whatsapp=$7, city=$8, notes=$9, tags=$10, vip=$11, updated_at=now()
     where id=$1 returning *`,
    [cid, b.full_name, b.phone, normPhone(b.phone), b.email, b.telegram, b.whatsapp, b.city, b.notes, b.tags, b.vip]);
  if (!rows[0]) throw httpError(404, "That client no longer exists.");
  await activity.log(req, { action: "client.update", entity: "client", id: cid, summary: `Edited client ${b.full_name}` });
  res.json(rows[0]);
}));

r.post("/clients/:id/archive", h(async (req, res) => {
  const cid = id.parse(req.params.id);
  const { archived } = z.object({ archived: z.coerce.boolean().default(true) }).parse(req.body || {});
  const { rows } = await db.q(`update clients set archived_at = ${archived ? "now()" : "null"}, updated_at = now() where id = $1 returning full_name`, [cid]);
  if (!rows[0]) throw httpError(404, "That client no longer exists.");
  await activity.log(req, { action: archived ? "client.archive" : "client.restore", entity: "client", id: cid, summary: `${archived ? "Archived" : "Restored"} client ${rows[0].full_name}` });
  res.json({ ok: true });
}));

r.post("/clients/:id/measurements", h(async (req, res) => {
  const cid = id.parse(req.params.id);
  const b = measureBody.parse(req.body);
  const { rows } = await db.q(
    "insert into measurements (client_id, label, data, notes, taken_on, created_by) values ($1,$2,$3,$4,coalesce($5::date, current_date),$6) returning *",
    [cid, b.label, b.data, b.notes, b.taken_on, req.admin.id]);
  await activity.log(req, { action: "client.measurements", entity: "client", id: cid, summary: "Saved measurements" });
  res.status(201).json(rows[0]);
}));

r.delete("/clients/:id/measurements/:mid", h(async (req, res) => {
  await db.q("delete from measurements where id = $1 and client_id = $2", [id.parse(req.params.mid), id.parse(req.params.id)]);
  res.json({ ok: true });
}));

module.exports = r;
