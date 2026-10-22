// Upgrading a database made before the admin panel keeps every order.
const { test, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { db } = require("./helpers");
const { migrate } = require("../scripts/migrate");

after(() => db.close());

test("older orders get numbers, clients, payments and a timeline", async () => {
  await db.q("drop schema public cascade; create schema public;");
  await db.q(fs.readFileSync(path.join(__dirname, "..", "api", "_lib", "schema.sql"), "utf8"));
  await db.q(`insert into orders (ref, name, phone, status, source, deposit, created_at) values
    ('MZ0001', 'Hanna', '0911 234 567', 'in_progress', 'social', 2000, '2025-11-02'),
    ('MZ0002', 'Hanna T', '+251911234567', 'new', 'website', null, '2026-01-05'),
    ('MZ0003', 'Dawit', '922345678', 'delivered', 'phone', 0, '2026-02-01')`);
  await migrate({ quiet: true });

  const { rows } = await db.q("select ref, number, status, source, client_id from orders order by created_at");
  assert.deepEqual(rows.map((r) => r.number), ["ORD-2025-0001", "ORD-2026-0001", "ORD-2026-0002"]);
  assert.equal(rows[0].status, "in_production");
  assert.equal(rows[0].source, "other");
  assert.equal(rows[0].client_id, rows[1].client_id, "same phone in two formats is one client");
  assert.notEqual(rows[0].client_id, rows[2].client_id);

  const pay = await db.q("select amount from order_payments");
  assert.deepEqual(pay.rows.map((p) => Number(p.amount)), [2000]);
  const ev = await db.q("select count(*)::int as n from order_events where kind = 'created'");
  assert.equal(ev.rows[0].n, 3);
  const { rows: phones } = await db.q("select phone_norm from clients order by phone_norm");
  assert.deepEqual(phones.map((p) => p.phone_norm), ["251911234567", "251922345678"]);

  // new orders continue from the backfilled counter
  const core = require("../api/_lib/orders-core");
  assert.equal(await core.nextNumber(db, new Date("2026-06-01")), "ORD-2026-0003");
});
