// Order building blocks shared by the website order form and the admin.
const { normPhone } = require("./validate");

const STATUSES = ["new", "contacted", "quote_sent", "confirmed", "in_production", "ready", "delivered", "cancelled"];
const SOURCES = ["phone", "walk-in", "telegram", "whatsapp", "instagram", "referral", "website", "other"];
const TYPES = ["custom", "ready_to_wear", "alteration", "event_styling"];
const PRIORITIES = ["normal", "urgent", "vip"];
const METHODS = ["telebirr", "bank", "cash", "other"];
const SOURCE_LABEL = {
  phone: "phone call", "walk-in": "walk-in", telegram: "Telegram", whatsapp: "WhatsApp",
  instagram: "Instagram DM", referral: "referral", website: "the website", other: "other",
};
const STATUS_LABEL = {
  new: "New", contacted: "Contacted", quote_sent: "Quote sent", confirmed: "Confirmed",
  in_production: "In production", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled",
};

// Next ORD-YYYY-NNNN number. The counter row is locked by the upsert, so two
// orders saved at the same moment never get the same number.
async function nextNumber(q, date = new Date()) {
  const year = date.getFullYear();
  const { rows } = await q.query(
    `insert into order_counters (year, last) values ($1, 1)
     on conflict (year) do update set last = order_counters.last + 1 returning last`, [year]);
  return `ORD-${year}-${String(rows[0].last).padStart(4, "0")}`;
}

// Finds the client with this phone number, or creates one.
async function findOrCreateClient(q, { name, phone, createdBy = null }) {
  const pn = normPhone(phone);
  if (pn) {
    const { rows } = await q.query("select id from clients where phone_norm = $1 and archived_at is null order by created_at limit 1", [pn]);
    if (rows[0]) return rows[0].id;
  }
  const { rows } = await q.query(
    "insert into clients (full_name, phone, phone_norm, created_by) values ($1, $2, $3, $4) returning id",
    [name, phone, pn, createdBy]);
  return rows[0].id;
}

async function addEvent(q, orderId, admin, { kind, from = null, to = null, body = null }) {
  await q.query(
    `insert into order_events (order_id, user_id, user_label, kind, from_status, to_status, body)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [orderId, admin ? admin.id : null, admin ? admin.name || admin.email : "Website", kind, from, to, body]);
}

// The order keeps the product's name even if the product is later deleted.
async function productName(q, id, fallback) {
  if (!id) return fallback || null;
  const { rows } = await q.query("select name_en from products where id = $1", [id]);
  return rows[0] ? rows[0].name_en : fallback || null;
}

const paymentStatus = (price, paid) => {
  const p = Number(paid) || 0;
  if (p <= 0) return "unpaid";
  if (price != null && p >= Number(price)) return "paid";
  return "deposit";
};

module.exports = {
  STATUSES, SOURCES, TYPES, PRIORITIES, METHODS, SOURCE_LABEL, STATUS_LABEL,
  nextNumber, findOrCreateClient, addEvent, productName, paymentStatus,
};
