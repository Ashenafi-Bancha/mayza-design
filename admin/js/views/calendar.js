// Month calendar of due dates and event dates. Bookings and fittings join it in phase 5.
import { get } from "../api.js";
import { t, lang, today } from "../i18n.js";
import { esc, I } from "../ui.js";
import { route } from "../router.js";

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default {
  async render() {
    const { query } = route();
    const now = new Date();
    const [y, m] = (query.m || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`).split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const orders = await get("/admin/orders");
    const byDay = {};
    const add = (day, o, kind) => { if (!day) return; (byDay[day] = byDay[day] || []).push({ o, kind }); };
    orders.filter((o) => o.status !== "cancelled").forEach((o) => { add(o.needed_by, o, "due"); add(o.event_date, o, "event"); });

    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
    const loc = lang() === "am" ? "am-ET" : "en-GB";
    const days = [];
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
    const heads = days.slice(0, 7).map((d) => `<div class="cal-h">${d.toLocaleDateString(loc, { weekday: "short" })}</div>`).join("");
    const td = today();
    const cells = days.map((d) => {
      const k = key(d);
      const items = byDay[k] || [];
      return `<div class="cal-d ${d.getMonth() !== m - 1 ? "out" : ""} ${k === td ? "today" : ""}">
        <span class="cal-n">${d.getDate()}</span>
        ${items.slice(0, 4).map(({ o, kind }) => `<a class="cal-ev ${kind} ${esc(o.status)}" href="#order/${esc(o.id)}" title="${esc(o.number)} · ${esc(o.client_name || "")}">${kind === "event" ? I.star : I.clock}<span>${esc(o.client_name || o.number)}</span></a>`).join("")}
        ${items.length > 4 ? `<small class="cal-more">+${items.length - 4}</small>` : ""}
      </div>`;
    }).join("");
    const prev = new Date(y, m - 2, 1), next = new Date(y, m, 1);
    const mk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const actions = `<a class="btn ghost small" href="#calendar?m=${mk(prev)}" aria-label="${t("prevMonth")}">‹</a>
      <a class="btn ghost small" href="#calendar">${t("today")}</a>
      <a class="btn ghost small" href="#calendar?m=${mk(next)}" aria-label="${t("nextMonth")}">›</a>`;
    const body = `<div class="cal-legend"><span class="cal-ev due">${I.clock}${t("dueDate")}</span><span class="cal-ev event">${I.star}${t("eventDate")}</span></div>
      <section class="card cal"><div class="cal-grid">${heads}${cells}</div></section>`;
    return { eyebrow: t("calendarEyebrow"), title: first.toLocaleDateString(loc, { month: "long", year: "numeric" }), actions, body };
  },
};
