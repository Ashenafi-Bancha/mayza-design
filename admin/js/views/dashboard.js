// Dashboard: today's work, new inquiries, deadlines, events and website numbers.
import { get } from "../api.js";
import { t, money, num, fmtDay, ago, lang } from "../i18n.js";
import { state, can, isTailor } from "../state.js";
import { esc, I, pill, prio, dueBadge, emptyBox } from "../ui.js";
import { on, go } from "../router.js";

const typeLabel = (o) => t("ty_" + o.type);

export function orderLine(o, { showDue = true, showEvent = false } = {}) {
  return `<a class="line-row" href="#order/${esc(o.id)}">
    <span class="lr-main"><b>${esc(o.client_name || "—")}</b>
      <small>${esc(o.number)} · ${esc(o.product_name || typeLabel(o))}${o.assigned_name ? ` · ${esc(o.assigned_name)}` : ""}</small></span>
    <span class="lr-side">${prio(o.priority)}${showEvent && o.event_date ? `<span class="due">${I.star}${fmtDay(o.event_date, { day: "numeric", month: "short" })}${o.occasion ? " · " + esc(o.occasion) : ""}</span>` : ""}${showDue ? dueBadge(o, { short: true }) : ""}${pill(o.status)}</span>
  </a>`;
}

const block = (title, list, empty, opts = {}, action = "") => `<section class="card">
  <div class="card-head"><h2>${title}${list.length ? ` <span class="count">${list.length}</span>` : ""}</h2>${action}</div>
  <div class="lines">${list.length ? list.map((o) => orderLine(o, opts)).join("") : `<p class="muted pad">${empty}</p>`}</div></section>`;

function bars(rows, labelFn, tone = "var(--red)") {
  if (!rows.length) return `<p class="muted">${t("noDataYet")}</p>`;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return `<ol class="top-list">${rows.map((r) => `<li><span>${esc(labelFn(r))}</span><b>${num(r.n)}</b><i style="--w:${Math.round((r.n / max) * 100)}%;--c:${tone}"></i></li>`).join("")}</ol>`;
}

function spark(daily) {
  const max = Math.max(...daily.map((d) => d.visitors), 1);
  return `<div class="spark" role="img" aria-label="${t("visitorsByDay")}">${daily.map((d) => `<span title="${fmtDay(d.day)}: ${d.visitors}" style="--h:${Math.max(4, Math.round((d.visitors / max) * 100))}%"><i></i><small>${new Date(d.day + "T00:00").toLocaleDateString(lang() === "am" ? "am-ET" : "en-GB", { weekday: "narrow" })}</small></span>`).join("")}</div>`;
}

const SOURCE_LABEL = (s) => t("src_" + s) !== "src_" + s ? t("src_" + s) : s;
const collName = (slug) => { const c = state.collections.find((x) => x.slug === slug); return c ? (lang() === "am" && c.name_am ? c.name_am : c.name_en) : t("g_" + slug) !== "g_" + slug ? t("g_" + slug) : slug; };

function quickActions() {
  const q = [];
  if (can("orders")) q.push(["new-order-go", I.plus, t("newOrder"), t("newOrderHint"), "var(--red)"]);
  if (can("clients")) q.push(["new-client", I.userPlus, t("newClient"), t("newClientHint"), "var(--ink)"]);
  if (can("catalog")) q.push(["add-collection", I.layers, t("addCollection"), t("addCollectionHint"), "var(--green)"]);
  if (can("catalog")) q.push(["add-photo", I.image, t("addPhoto"), t("addPhotoHint"), "var(--amber)"]);
  if (can("settings")) q.push(["post-news", I.mega, t("postNews"), t("postNewsHint"), "var(--gold)"]);
  if (!q.length) return "";
  return `<section class="card"><div class="card-head"><h2>${t("quick")}</h2></div><div class="card-body quick-grid">
    ${q.map(([a, ic, label, hint, c]) => `<button type="button" data-action="${a}"><span class="qi" style="background:${c}">${ic}</span><span>${label}<small>${hint}</small></span></button>`).join("")}
  </div></section>`;
}

export default {
  async render() {
    const d = await get("/admin/dashboard");
    const me = state.me;
    const hello = t("hello", { name: esc((me.name || "").split(" ")[0]) });
    const todayStr = new Date().toLocaleDateString(lang() === "am" ? "am-ET" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
    let body = "";

    if (isTailor()) {
      const work = d.my_work || [];
      body = `<section class="card"><div class="card-head"><h2>${t("myWork")}</h2></div>
        <div class="lines">${work.length ? work.map((o) => orderLine(o)).join("") : emptyBox(t("myWorkEmpty"), I.check)}</div></section>`;
      return { eyebrow: esc(todayStr), title: hello, body };
    }

    if (can("orders")) {
      const p = d.pipeline || {};
      const stat = (n, label, tone, href) => `<a class="card stat" href="${href}" style="--tone:${tone}"><strong>${num(n)}</strong><span>${label}</span></a>`;
      body += `<div class="stats">
        ${stat(d.new_count, t("statNew"), "var(--red)", "#inbox?status=new")}
        ${stat((p.confirmed || 0) + (p.in_production || 0), t("statWork"), "var(--amber)", "#inbox?status=confirmed,in_production")}
        ${stat(p.ready || 0, t("statReady"), "var(--green)", "#inbox?status=ready")}
        ${stat(d.overdue.length, t("statOverdue"), d.overdue.length ? "var(--red-deep)" : "var(--ink)", "#inbox?due=overdue")}
      </div>`;
      if (d.money) body += `<div class="card money">
        <div><span>${t("paidThisWeek")}</span><strong>${money(d.money.week)}</strong></div>
        <div><span>${t("paidThisMonth")}</span><strong>${money(d.money.month)}</strong></div>
        <div class="gold"><span>${t("toCollect")}</span><strong>${money(d.money.outstanding)}</strong></div></div>`;
      body += `<div class="two-col"><div class="stack">
        ${block(t("todayBlock"), d.today, t("todayEmpty"), { showEvent: true })}
        ${block(t("newInquiries"), d.new_inquiries, t("newEmpty"), { showDue: false }, `<a class="btn ghost small" href="#inbox?status=new">${t("seeAll")}</a>`)}
        ${d.overdue.length ? block(t("overdueBlock"), d.overdue, "") : ""}
        ${block(t("dueSoon"), d.due_soon, t("dueSoonEmpty"))}
      </div><div class="stack">
        ${quickActions()}
        ${block(t("upcomingEvents"), d.upcoming_events, t("eventsEmpty"), { showDue: false, showEvent: true })}
        ${statsCards(d.stats)}
      </div></div>`;
    } else {
      body += `<div class="two-col"><div class="stack">${statsCards(d.stats)}</div><div class="stack">${quickActions()}
        ${d.catalog ? `<section class="card"><div class="card-head"><h2>${t("catalogBlock")}</h2></div><div class="card-body kv">
          <div><span>${t("nav_products")}</span><b>${num(d.catalog.products)}</b></div>
          <div><span>${t("hiddenProducts")}</span><b>${num(d.catalog.hidden)}</b></div>
          <div><span>${t("nav_collections")}</span><b>${num(d.catalog.collections)}</b></div>
          <div><span>${t("contentUpdated")}</span><b>${d.catalog.content_updated ? ago(d.catalog.content_updated) : "—"}</b></div></div></section>` : ""}
      </div></div>`;
    }
    const actions = can("orders") ? `<a class="btn red" href="#order/new">${I.plus}${t("newOrder")}</a>` : "";
    return { eyebrow: esc(todayStr), title: hello, actions, body };
  },
};

function statsCards(s) {
  if (!s) return "";
  const delta = s.visitors_last_week ? Math.round(((s.visitors_week - s.visitors_last_week) / s.visitors_last_week) * 100) : null;
  return `<section class="card"><div class="card-head"><h2>${t("websiteWeek")}</h2></div><div class="card-body">
      <div class="visits"><div><strong>${num(s.visitors_week)}</strong><span>${t("visitorsWeek")}${delta !== null ? ` <em class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "+" : ""}${delta}%</em>` : ""}</span></div>
        <div><strong>${num(s.views_week)}</strong><span>${t("pageViews")}</span></div></div>
      ${spark(s.daily)}</div></section>
    <section class="card"><div class="card-head"><h2>${t("trafficSources")}</h2></div><div class="card-body">${bars(s.sources, (r) => SOURCE_LABEL(r.source), "var(--blue)")}</div></section>
    <section class="card"><div class="card-head"><h2>${t("topCollections")}</h2></div><div class="card-body">${bars(s.top_collections, (r) => collName(r.collection), "var(--green)")}</div></section>
    <section class="card"><div class="card-head"><h2>${t("inquiriesPerCollection")}</h2></div><div class="card-body">${bars(s.inquiries_by_collection, (r) => collName(r.collection))}</div></section>`;
}

on({
  "new-order-go": () => go("order/new"),
  "add-collection": () => { go("collections"); setTimeout(() => document.querySelector('[data-action="new-collection"]')?.click(), 250); },
  "add-photo": () => { go("products"); setTimeout(() => document.querySelector('[data-action="new-product"]')?.click(), 250); },
  "post-news": () => go("settings/announce"),
});
