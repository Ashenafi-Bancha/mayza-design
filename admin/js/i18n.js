// English and Amharic text, plus date and money formatting.
import { STRINGS } from "./strings.js";

let current = "en";
try { current = localStorage.getItem("mayza-admin-lang") || localStorage.getItem("mayza-lang") || "en"; } catch (e) {}
if (!STRINGS[current]) current = "en";

export const lang = () => current;
export function setLang(l) {
  current = STRINGS[l] ? l : "en";
  try { localStorage.setItem("mayza-admin-lang", current); } catch (e) {}
  document.documentElement.lang = current;
}

export const t = (k, v = {}) => String(STRINGS[current][k] ?? STRINGS.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? ""));

const locale = () => (current === "am" ? "am-ET" : "en-GB");
export const num = (n) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
export const money = (n) => (n == null || n === "" ? "—" : current === "am" ? `${num(n)} ብር` : `ETB ${num(n)}`);

export const parseDay = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
export const fmtDay = (s, opts = { day: "numeric", month: "short", year: "numeric" }) => { const d = parseDay(s); return d ? d.toLocaleDateString(locale(), opts) : ""; };
export const fmtTime = (iso) => new Date(iso).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export function daysUntil(s) {
  const d = parseDay(s);
  if (!d) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 864e5);
}
export function ago(iso) {
  const diff = (new Date(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(current === "am" ? "am" : "en", { numeric: "auto" });
  for (const [u, s] of [["day", 86400], ["hour", 3600], ["minute", 60]]) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return rtf.format(0, "minute");
}
