// Fills a database with sample clients, orders, payments and website visits so
// every screen of the admin has something to show. Also adds one staff account
// per role (manager, editor, tailor) for trying out permissions.
//   npm run seed                 (refuses to run twice, or on a production database)
//   npm run seed -- --force      (adds the sample data even if orders exist)
// The staff accounts share one password: SEED_STAFF_PASSWORD from .env, or a
// random one printed at the end.
require("dotenv").config();
const crypto = require("crypto");
const db = require("../api/_lib/db");
const auth = require("../api/_lib/auth");
const core = require("../api/_lib/orders-core");
const { normPhone } = require("../api/_lib/validate");
const { migrate } = require("./migrate");

const CLIENTS = [
  ["Hanna Tesfaye", "0911 234 567", { telegram: "hanna_t", city: "Addis Ababa", vip: true, tags: ["wedding"] }],
  ["Dawit Mekonnen", "0922 345 678", { whatsapp: "+251922345678", city: "Addis Ababa" }],
  ["Selam Alemu", "0933 456 789", { city: "Hawassa", tags: ["family"] }],
  ["Yonas Bekele", "0944 567 890", { telegram: "yonasb" }],
  ["Meron Haile", "0955 678 901", { city: "Addis Ababa", vip: true }],
  ["Abel Girma", "0966 789 012", {}],
  ["Liya Tadesse", "0977 890 123", { tags: ["artist"], telegram: "liya_music" }],
  ["Kidist Worku", "0988 901 234", { city: "Bahir Dar" }],
];

const d = (days) => { const x = new Date(); x.setDate(x.getDate() + days); return x.toISOString().slice(0, 10); };

// [client, status, type, source, product hint, due in days, event in days, price, payments, priority, assign to tailor]
const ORDERS = [
  [0, "in_production", "custom", "phone", "Embroidered white set", 5, 9, 18000, [8000], "vip", true],
  [0, "delivered", "event_styling", "walk-in", "Woven panel jacket sets", -30, -28, 26000, [10000, 16000], "normal", false],
  [1, "new", "custom", "telegram", "Cultural trim jackets", 12, null, null, [], "normal", false],
  [2, "quote_sent", "custom", "website", "Children's cultural dress", 20, 24, 6500, [], "normal", false],
  [3, "confirmed", "ready_to_wear", "instagram", "Stripe-panel bomber", 3, null, 4200, [2000], "normal", false],
  [4, "ready", "custom", "whatsapp", "Embroidered white set", 0, 2, 15000, [7500], "urgent", true],
  [4, "contacted", "alteration", "phone", null, 6, null, 1200, [], "normal", false],
  [5, "in_production", "custom", "referral", "Woven trim shirt", -2, null, 5200, [2500], "urgent", true],
  [6, "new", "event_styling", "instagram", "Studio looks", 15, 18, null, [], "vip", false],
  [7, "cancelled", "ready_to_wear", "website", "Denim set", null, null, 3800, [], "normal", false],
  [1, "new", "custom", "website", "Burgundy leather jacket", null, null, null, [], "normal", false],
  [2, "confirmed", "custom", "walk-in", "Woven panel jacket sets", 9, 14, 21000, [10000], "normal", true],
];

const MEASURE = { chest: "92", waist: "74", hip: "98", shoulder: "40", sleeve: "58", length: "110" };

async function staff(email, name, role, password) {
  const { rows } = await db.q(
    `insert into admins (email, name, role, password_hash) values ($1, $2, $3, $4)
     on conflict (email) do update set role = excluded.role returning id`, [email, name, role, await auth.hash(password)]);
  return rows[0].id;
}

(async () => {
  if (!db.configured()) { console.error("Set DATABASE_URL first (see .env.example)."); process.exit(1); }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) { console.error("Not seeding a production database."); process.exit(1); }
  try {
    await migrate({ quiet: true });
    const { rows: existing } = await db.q("select count(*)::int as n from orders");
    if (existing[0].n && !process.argv.includes("--force")) {
      console.log(`The database already has ${existing[0].n} orders. Run with --force to add the sample data anyway.`);
      return;
    }
    const password = process.env.SEED_STAFF_PASSWORD || crypto.randomBytes(9).toString("base64url");
    const domain = (process.env.ADMIN_EMAIL || "owner@mayza.test").split("@")[1];
    const manager = await staff(`manager@${domain}`, "Tigist (manager)", "manager", password);
    await staff(`editor@${domain}`, "Bethel (content)", "editor", password);
    const tailor = await staff(`tailor@${domain}`, "Getachew (tailor)", "tailor", password);
    const actor = { id: manager, name: "Tigist (manager)" };

    const { rows: products } = await db.q("select id, name_en from products");
    const productId = (name) => (products.find((p) => p.name_en === name) || {}).id || null;

    const clientIds = [];
    for (const [name, phone, extra] of CLIENTS) {
      const { rows } = await db.q(
        `insert into clients (full_name, phone, phone_norm, telegram, whatsapp, city, vip, tags, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [name, phone, normPhone(phone), extra.telegram || null, extra.whatsapp || null, extra.city || null, Boolean(extra.vip), extra.tags || [], manager]);
      clientIds.push(rows[0].id);
    }
    await db.q("insert into measurements (client_id, label, data, created_by) values ($1, 'Wedding dress', $2, $3), ($4, 'Jacket', $5, $3)",
      [clientIds[0], MEASURE, manager, clientIds[4], { chest: "88", waist: "70", shoulder: "38", sleeve: "56" }]);

    let n = 0;
    for (const [ci, status, type, source, product, due, event, price, payments, priority, assign] of ORDERS) {
      await db.tx(async (c) => {
        const created = new Date(Date.now() - (ORDERS.length - n++) * 36e5 * 20);
        const number = await core.nextNumber(c, created);
        const [name, phone] = CLIENTS[ci];
        const { rows } = await c.query(
          `insert into orders (number, client_id, name, phone, product_id, product_name, source, status, type, priority, needed_by, event_date,
             occasion, price, measurements, notes, assigned_to, created_by, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19) returning id`,
          [number, clientIds[ci], name, phone, productId(product), product, source, status, type, priority,
            due == null ? null : d(due), event == null ? null : d(event), event == null ? null : "Wedding",
            price, status === "new" ? {} : MEASURE, "Sample order: red and gold woven band, knee length.", assign ? tailor : null,
            source === "website" ? null : manager, created]);
        const oid = rows[0].id;
        await core.addEvent(c, oid, source === "website" ? null : actor,
          { kind: "created", to: "new", body: source === "website" ? "Sent from the website order form" : `Created by Tigist (manager) via ${core.SOURCE_LABEL[source]}` });
        if (status !== "new") await core.addEvent(c, oid, actor, { kind: "status", from: "new", to: status });
        for (const amount of payments) {
          await c.query("insert into order_payments (order_id, amount, method, paid_on, created_by) values ($1, $2, $3, $4, $5)",
            [oid, amount, amount > 5000 ? "bank" : "telebirr", created.toISOString().slice(0, 10), manager]);
        }
      });
    }

    // two weeks of website visits for the dashboard
    const sources = ["instagram", "instagram", "google", "telegram", "direct", "direct", "facebook", "tiktok"];
    const lines = ["cultural", "cultural", "modern", "streetwear", "children"];
    const values = [];
    for (let day = 13; day >= 0; day--) {
      const visits = 15 + Math.round(Math.random() * 25) + (13 - day);
      for (let i = 0; i < visits; i++) {
        values.push(`('${d(-day)}', '/', '${sources[i % sources.length]}', null, true)`);
        if (i % 2) values.push(`('${d(-day)}', '/collections.html', 'internal', '${lines[i % lines.length]}', false)`);
      }
    }
    await db.q(`insert into page_views (day, path, source, collection, visit) values ${values.join(",")}`);

    console.log(`Added ${CLIENTS.length} clients, ${ORDERS.length} orders and ${values.length} page views.`);
    console.log(`Staff accounts (one per role): manager@${domain}, editor@${domain}, tailor@${domain}`);
    if (!process.env.SEED_STAFF_PASSWORD) console.log(`Their shared password: ${password}  (set SEED_STAFF_PASSWORD in .env to choose one)`);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
