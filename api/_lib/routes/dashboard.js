// The dashboard: what needs attention today, and how the website is doing.
// Each role only gets the blocks it is allowed to see.
const express = require("express");
const db = require("../db");
const { can, requirePerm } = require("../perms");
const { h } = require("../validate");

const r = express.Router();

const BRIEF = `o.id, o.number, o.status, o.type, o.priority, o.needed_by, o.event_date, o.occasion, o.created_at, o.source,
  coalesce(c.full_name, o.name) as client_name, o.product_name, a.name as assigned_name`;
const FROM = "from orders o left join clients c on c.id = o.client_id left join admins a on a.id = o.assigned_to";
const OPEN = "o.archived_at is null and o.status not in ('delivered', 'cancelled')";

r.get("/dashboard", requirePerm("dashboard"), h(async (req, res) => {
  const role = req.admin.role;
  const out = { role };

  if (can(role, "orders")) {
    const [today, fresh, newCount, soon, overdue, events, pipeline] = await Promise.all([
      db.q(`select ${BRIEF} ${FROM} where ${OPEN} and (o.needed_by = current_date or o.event_date = current_date) order by o.priority desc limit 20`),
      db.q(`select ${BRIEF} ${FROM} where o.archived_at is null and o.status = 'new' order by o.created_at desc limit 6`),
      db.q("select count(*)::int as n from orders where archived_at is null and status = 'new'"),
      db.q(`select ${BRIEF} ${FROM} where ${OPEN} and o.needed_by between current_date + 1 and current_date + 7 order by o.needed_by limit 12`),
      db.q(`select ${BRIEF} ${FROM} where ${OPEN} and o.needed_by < current_date order by o.needed_by limit 12`),
      db.q(`select ${BRIEF} ${FROM} where o.archived_at is null and o.status <> 'cancelled' and o.event_date between current_date and current_date + 21 order by o.event_date limit 12`),
      db.q("select status, count(*)::int as n from orders where archived_at is null group by status"),
    ]);
    Object.assign(out, {
      today: today.rows, new_inquiries: fresh.rows, new_count: newCount.rows[0].n,
      due_soon: soon.rows, overdue: overdue.rows, upcoming_events: events.rows,
      pipeline: Object.fromEntries(pipeline.rows.map((x) => [x.status, x.n])),
    });
    if (can(role, "orders.money")) {
      const { rows } = await db.q(
        `select coalesce(sum(amount) filter (where paid_on >= date_trunc('month', current_date)), 0) as month,
           coalesce(sum(amount) filter (where paid_on >= current_date - 6), 0) as week from order_payments`);
      const { rows: owed } = await db.q(
        `select coalesce(sum(greatest(o.price - coalesce(p.paid, 0), 0)), 0) as owed from orders o
         left join lateral (select sum(amount) as paid from order_payments where order_id = o.id) p on true
         where o.archived_at is null and o.status not in ('cancelled') and o.price is not null`);
      out.money = { month: Number(rows[0].month), week: Number(rows[0].week), outstanding: Number(owed[0].owed) };
    }
  }

  if (role === "tailor") {
    const { rows } = await db.q(
      `select ${BRIEF}, o.notes, o.measurements ${FROM} where o.archived_at is null and o.assigned_to = $1
         and o.status in ('in_production', 'ready') order by o.status, o.needed_by nulls last`, [req.admin.id]);
    out.my_work = rows;
  }

  if (role !== "tailor") {
    const [visits, sources, collections, daily, inquiries] = await Promise.all([
      db.q(`select count(*) filter (where visit and day >= current_date - 6)::int as visitors,
              count(*) filter (where day >= current_date - 6)::int as views,
              count(*) filter (where visit and day < current_date - 6)::int as last_week
            from page_views where day >= current_date - 13`),
      db.q(`select source, count(*)::int as n from page_views where visit and day >= current_date - 6 group by source order by n desc limit 8`),
      db.q(`select collection, count(*)::int as n from page_views where collection is not null and day >= current_date - 29 group by collection order by n desc limit 6`),
      db.q(`select d::date as day, coalesce(v.n, 0)::int as visitors
            from generate_series(current_date - 6, current_date, '1 day') d
            left join (select day, count(*) as n from page_views where visit and day >= current_date - 6 group by day) v on v.day = d::date
            order by d`),
      db.q(`select coalesce(p.line, case o.garment when 'street' then 'streetwear' when 'group' then 'streetwear' else o.garment end, 'other') as collection, count(*)::int as n
            from orders o left join products p on p.id = o.product_id
            where o.created_at >= current_date - 29 group by 1 order by n desc limit 8`),
    ]);
    const v = visits.rows[0];
    out.stats = {
      visitors_week: v.visitors, views_week: v.views, visitors_last_week: v.last_week,
      sources: sources.rows, top_collections: collections.rows, daily: daily.rows,
      inquiries_by_collection: inquiries.rows,
    };
  }

  if (can(role, "catalog")) {
    const { rows } = await db.q(
      `select (select count(*)::int from products) as products, (select count(*)::int from products where not visible) as hidden,
              (select count(*)::int from collections) as collections, (select max(updated_at) from content) as content_updated`);
    out.catalog = rows[0];
  }

  res.json(out);
}));

module.exports = r;
