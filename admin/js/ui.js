// Small UI helpers shared by every screen: escaping, icons, toasts, drawers, badges.
import { t, lang, fmtDay, daysUntil } from "./i18n.js";
import { OPEN } from "./state.js";

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  home: icon('<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
  inbox: icon('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
  tag: icon('<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>'),
  gear: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  ext: icon('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>'),
  out: icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  phone: icon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  chat: icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  send: icon('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
  x: icon('<path d="M18 6 6 18M6 6l12 12"/>'),
  download: icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
  image: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  layers: icon('<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>'),
  pen: icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  print: icon('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
  copy: icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  search: icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'),
  mega: icon('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
  users: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  user: icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  userPlus: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>'),
  shield: icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  list: icon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  board: icon('<rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="11" rx="1.5"/>'),
  calendar: icon('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  clock: icon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  alert: icon('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'),
  star: icon('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'),
  money: icon('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  ruler: icon('<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>'),
  archive: icon('<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>'),
  more: icon('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'),
  menu: icon('<path d="M3 12h18M3 6h18M3 18h18"/>'),
  check: icon('<path d="M20 6 9 17l-5-5"/>'),
  arrowLeft: icon('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  chevron: icon('<path d="m9 18 6-6-6-6"/>'),
  note: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>'),
  activity: icon('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
  chart: icon('<path d="M18 20V10M12 20V4M6 20v-6"/>'),
  key: icon('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>'),
};

// ---------- toast ----------
let toastTimer;
export function toast(msg, kind = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast"), kind === "new" ? 5200 : 2800);
}
export function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch (e) {}
}

// ---------- drawer ----------
let lastFocus = null;
let onClose = null;
export const drawerEl = () => $("#drawer .drawer");
export const drawerOpen = () => !$("#drawer").hidden;
export function openDrawer(html, { wide = false, close } = {}) {
  lastFocus = document.activeElement;
  onClose = close || null;
  const d = drawerEl();
  d.className = "drawer" + (wide ? " wide" : "");
  d.innerHTML = html;
  $("#drawer").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => { const f = d.querySelector("[autofocus], input, select, textarea, button"); if (f) f.focus({ preventScroll: true }); }, 60);
  return d;
}
export function closeDrawer() {
  if ($("#drawer").hidden) return;
  $("#drawer").hidden = true;
  drawerEl().innerHTML = "";
  document.body.style.overflow = "";
  const cb = onClose; onClose = null;
  if (cb) cb();
  if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
export const drawerHead = (eyebrow, title, sub = "") => `<div class="drawer-head"><div>
    <p class="eyebrow">${eyebrow}</p><h2 id="drawer-title">${title}</h2>${sub ? `<small>${sub}</small>` : ""}
  </div><button class="icon-btn" type="button" data-action="close-drawer" aria-label="${t("close")}">${I.x}</button></div>`;

// two-step delete: first tap arms the button, second tap runs
export function armDelete(btn, run, label = t("delete")) {
  if (!btn.classList.contains("armed")) {
    btn.classList.add("armed");
    btn.textContent = t("yesSure");
    setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.textContent = label; } }, 4000);
    return;
  }
  btn.disabled = true;
  Promise.resolve(run()).catch((err) => { toast(err.message); btn.disabled = false; });
}

// Runs an async save with the button showing progress; shows errors in msgEl.
export async function busy(btn, fn, msgEl) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = t("saving");
  if (msgEl) { msgEl.textContent = ""; msgEl.className = "form-msg"; }
  try {
    return await fn();
  } catch (err) {
    if (msgEl) msgEl.textContent = err.message; else toast(err.message);
    if (err.field && btn.form) {
      const f = btn.form.querySelector(`[name="${CSS.escape(err.field)}"]`);
      if (f) f.focus();
    }
    return undefined;
  } finally {
    if (btn.isConnected) { btn.disabled = false; btn.innerHTML = label; }
  }
}

// ---------- badges ----------
export const pill = (s) => `<span class="pill ${esc(s)}">${t("st_" + s)}</span>`;
export const prio = (p) => (p && p !== "normal" ? `<span class="prio ${esc(p)}">${p === "vip" ? I.star : I.alert}${t("pr_" + p)}</span>` : "");
export function dueBadge(o, { short = false } = {}) {
  if (!o.needed_by) return short ? "" : `<span class="due">${t("noDate")}</span>`;
  const d = daysUntil(o.needed_by);
  if (!OPEN.includes(o.status)) return `<span class="due">${fmtDay(o.needed_by)}</span>`;
  if (d < 0) return `<span class="due late">${I.clock}${t("overdue", { n: -d })}</span>`;
  if (d === 0) return `<span class="due late">${I.clock}${t("dueToday")}</span>`;
  if (d <= 7) return `<span class="due soon">${I.clock}${t("dueIn", { n: d })}</span>`;
  return `<span class="due">${fmtDay(o.needed_by)}</span>`;
}
export const payBadge = (o) => (o.payment_status ? `<span class="paytag ${o.payment_status}">${t("pay_" + o.payment_status)}</span>` : "");
export const emptyBox = (text, ic = I.inbox) => `<div class="empty">${ic}<p>${text}</p></div>`;
export const opts = (list, val, label, blank) => (blank !== undefined ? `<option value="">${blank}</option>` : "") +
  list.map((v) => `<option value="${esc(v)}" ${String(v) === String(val ?? "") ? "selected" : ""}>${esc(label(v))}</option>`).join("");
export const initials = (s) => String(s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const nameOf = (x, base = "name") => (lang() === "am" && x[base + "_am"] ? x[base + "_am"] : x[base + "_en"]);

export function intlPhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("251")) return d;
  if (d.startsWith("0")) return "251" + d.slice(1);
  if (d.length === 9) return "251" + d;
  return d;
}
export function telegramLink(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\+?\d[\d\s]+$/.test(s)) return "https://t.me/+" + intlPhone(s);
  return "https://t.me/" + s.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
}

// Contact buttons for a client or an order.
export function contactButtons(c, message = "") {
  const phone = c.phone || c.client_phone;
  const wa = c.whatsapp || c.client_whatsapp || phone;
  const tg = c.telegram || c.client_telegram;
  const out = [];
  if (phone) out.push(`<a class="btn green small" href="tel:+${intlPhone(phone)}">${I.phone}${t("call")}</a>`);
  if (wa) out.push(`<a class="btn small wa" href="https://wa.me/${intlPhone(wa)}${message ? "?text=" + encodeURIComponent(message) : ""}" target="_blank" rel="noopener">${I.chat}WhatsApp</a>`);
  if (tg) out.push(`<a class="btn small tg" href="${esc(telegramLink(tg))}" target="_blank" rel="noopener">${I.send}Telegram</a>`);
  return out.join("");
}
