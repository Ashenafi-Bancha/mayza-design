// Changing an order's status from anywhere, with an optional message to the client.
import { post } from "../api.js";
import { t } from "../i18n.js";
import { can } from "../state.js";
import { $, esc, I, toast } from "../ui.js";

export async function changeStatus(id, status, { note = "" } = {}) {
  const r = await post(`/admin/orders/${id}/status`, { status, note, notify: can("orders") });
  toast(t("statusChanged", { status: t("st_" + status) }));
  if (r.notify && (r.notify.whatsapp || r.notify.telegram || r.notify.sms)) showNotify(r.notify, r.order);
  return r.order;
}

// A bar at the bottom offering to send the client a ready-made message.
export function showNotify(n, order) {
  let bar = $("#notify-bar");
  if (!bar) { bar = document.createElement("div"); bar.id = "notify-bar"; bar.className = "notify-bar"; document.body.appendChild(bar); }
  const copy = async () => { try { await navigator.clipboard.writeText(n.message); toast(t("copied")); } catch (e) {} };
  bar.innerHTML = `<div><b>${t("tellClient", { name: esc((order.client_name || "").split(" ")[0]) })}</b><p>${esc(n.message)}</p></div>
    <div class="nb-actions">
      ${n.whatsapp ? `<a class="btn small wa" href="${esc(n.whatsapp)}" target="_blank" rel="noopener">${I.chat}WhatsApp</a>` : ""}
      ${n.telegram ? `<a class="btn small tg" href="${esc(n.telegram)}" target="_blank" rel="noopener" data-copy>${I.send}Telegram</a>` : ""}
      ${n.sms ? `<a class="btn small ghost" href="${esc(n.sms)}">SMS</a>` : ""}
      <button class="icon-btn" type="button" aria-label="${t("close")}">${I.x}</button>
    </div>`;
  bar.classList.add("show");
  const hide = () => bar.classList.remove("show");
  bar.querySelector(".icon-btn").onclick = hide;
  bar.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { if (a.hasAttribute("data-copy")) copy(); setTimeout(hide, 300); }));
  clearTimeout(bar._t);
  bar._t = setTimeout(hide, 20000);
}

// the offer only makes sense on the page where the status changed
addEventListener("hashchange", () => { const bar = document.getElementById("notify-bar"); if (bar) bar.classList.remove("show"); });
