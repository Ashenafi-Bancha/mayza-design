// Staff accounts and the activity log (owner), plus the staff list for assigning orders.
const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../auth");
const activity = require("../activity");
const { ROLES, requirePerm } = require("../perms");
const { z, text, id, h, httpError } = require("../validate");

const r = express.Router();
const COLS = "id, email, name, role, active, totp_enabled, last_login_at, created_at";

// Who an order can be assigned to.
r.get("/staff/options", requirePerm("orders", "production"), h(async (_req, res) => {
  const { rows } = await db.q("select id, name, email, role from admins where active order by role = 'tailor' desc, name nulls last, email");
  res.json(rows);
}));

r.get("/staff", requirePerm("staff"), h(async (_req, res) => {
  const { rows } = await db.q(`select ${COLS} from admins order by active desc, created_at`);
  res.json(rows);
}));

const staffBody = z.object({
  email: z.string().trim().toLowerCase().email("That email address does not look right.").max(200),
  name: text(120),
  role: z.enum(ROLES),
  active: z.coerce.boolean().default(true),
});

const tempPassword = () => crypto.randomBytes(9).toString("base64url"); // 12 characters

r.post("/staff", requirePerm("staff"), h(async (req, res) => {
  const b = staffBody.parse(req.body);
  const password = z.string().min(8, "Use at least 8 characters.").max(200).optional().parse(req.body.password || undefined) || tempPassword();
  try {
    const { rows } = await db.q(`insert into admins (email, name, role, active, password_hash) values ($1,$2,$3,$4,$5) returning ${COLS}`,
      [b.email, b.name, b.role, b.active, await auth.hash(password)]);
    await activity.log(req, { action: "staff.create", entity: "staff", id: rows[0].id, summary: `Added ${b.role} ${b.name || b.email}` });
    res.status(201).json({ ...rows[0], password });
  } catch (err) {
    if (err.code === "23505") throw httpError(400, "Someone with that email already has an account.");
    throw err;
  }
}));

async function ownersLeft(exceptId) {
  const { rows } = await db.q("select count(*)::int as n from admins where role = 'owner' and active and id <> $1", [exceptId]);
  return rows[0].n;
}

r.put("/staff/:id", requirePerm("staff"), h(async (req, res) => {
  const sid = id.parse(req.params.id);
  const b = staffBody.parse(req.body);
  const { rows: cur } = await db.q("select * from admins where id = $1", [sid]);
  if (!cur[0]) throw httpError(404, "That account no longer exists.");
  if (cur[0].role === "owner" && (b.role !== "owner" || !b.active) && !(await ownersLeft(sid))) {
    throw httpError(400, "There must always be at least one active owner.");
  }
  const signOut = cur[0].role !== b.role || (cur[0].active && !b.active);
  const { rows } = await db.q(
    `update admins set email=$2, name=$3, role=$4, active=$5, token_version = token_version + $6, updated_at=now() where id=$1 returning ${COLS}`,
    [sid, b.email, b.name, b.role, b.active, signOut ? 1 : 0]);
  await activity.log(req, { action: "staff.update", entity: "staff", id: sid, summary: `Updated ${b.name || b.email} (${b.role}${b.active ? "" : ", disabled"})` });
  res.json(rows[0]);
}));

r.post("/staff/:id/reset-password", requirePerm("staff"), h(async (req, res) => {
  const sid = id.parse(req.params.id);
  const password = tempPassword();
  const { rows } = await db.q(`update admins set password_hash = $2, token_version = token_version + 1, updated_at = now() where id = $1 returning ${COLS}`,
    [sid, await auth.hash(password)]);
  if (!rows[0]) throw httpError(404, "That account no longer exists.");
  await activity.log(req, { action: "staff.reset_password", entity: "staff", id: sid, summary: `Reset the password for ${rows[0].name || rows[0].email}` });
  res.json({ ...rows[0], password });
}));

r.post("/staff/:id/reset-2fa", requirePerm("staff"), h(async (req, res) => {
  const sid = id.parse(req.params.id);
  const { rows } = await db.q(`update admins set totp_enabled = false, totp_secret = null, token_version = token_version + 1, updated_at = now() where id = $1 returning ${COLS}`, [sid]);
  if (!rows[0]) throw httpError(404, "That account no longer exists.");
  await activity.log(req, { action: "staff.reset_2fa", entity: "staff", id: sid, summary: `Reset two-step sign-in for ${rows[0].name || rows[0].email}` });
  res.json(rows[0]);
}));

r.get("/activity", requirePerm("activity"), h(async (req, res) => {
  const f = z.object({
    user: z.string().uuid().optional(), entity: z.string().max(30).optional(), entity_id: z.string().max(60).optional(),
    q: z.string().trim().max(100).optional(), before: z.coerce.number().int().optional(),
  }).strip().parse(req.query);
  const args = [];
  const cond = [];
  const p = (v) => { args.push(v); return "$" + args.length; };
  if (f.user) cond.push(`user_id = ${p(f.user)}`);
  if (f.entity) cond.push(`entity_type = ${p(f.entity)}`);
  if (f.entity_id) cond.push(`entity_id = ${p(f.entity_id)}`);
  if (f.q) cond.push(`lower(summary) like ${p(`%${f.q.toLowerCase()}%`)}`);
  if (f.before) cond.push(`id < ${p(f.before)}`);
  const { rows } = await db.q(`select * from activity_log ${cond.length ? "where " + cond.join(" and ") : ""} order by id desc limit 100`, args);
  res.json(rows);
}));

module.exports = r;
