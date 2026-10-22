// Shared admin state. Permissions mirror api/_lib/perms.js; the server checks
// them again on every request, so this only decides what to show.
export const PERMISSIONS = {
  owner: ["*"],
  manager: ["dashboard", "orders", "orders.money", "orders.export", "clients", "clients.export", "catalog.read", "images"],
  editor: ["dashboard", "catalog", "catalog.read", "content", "images"],
  tailor: ["dashboard", "production", "images"],
};
export const STATUSES = ["new", "contacted", "quote_sent", "confirmed", "in_production", "ready", "delivered", "cancelled"];
export const OPEN = ["new", "contacted", "quote_sent", "confirmed", "in_production", "ready"];
export const SOURCES = ["phone", "walk-in", "telegram", "whatsapp", "instagram", "referral", "website", "other"];
export const TYPES = ["custom", "ready_to_wear", "alteration", "event_styling"];
export const PRIORITIES = ["normal", "urgent", "vip"];
export const METHODS = ["telebirr", "bank", "cash", "other"];
export const GARMENTS = ["cultural", "modern", "street", "group", "other"];
export const WHOS = ["woman", "man", "child", "couple", "family"];
export const MEASURES = ["chest", "bust", "waist", "hip", "shoulder", "sleeve", "arm", "neck", "length", "inseam", "thigh", "height"];

export const state = {
  me: null,
  settings: {},
  products: [],
  collections: [],
  content: {},
  staffOptions: [],
  orders: [],
  inbox: { view: "list", status: "", source: "", type: "", priority: "", assigned: "", from: "", to: "", q: "", archived: "" },
  newCount: 0,
  stamp: null,
};

export function can(perm) {
  const list = PERMISSIONS[state.me && state.me.role] || [];
  return list.includes("*") || list.includes(perm);
}
export const isTailor = () => state.me && state.me.role === "tailor";

// Pages each role sees, in menu order.
export function routesFor() {
  const r = ["dashboard"];
  if (can("orders") || can("production")) r.push("inbox");
  if (can("orders")) r.push("calendar");
  if (can("clients")) r.push("clients");
  if (can("catalog")) r.push("products", "collections");
  if (can("content")) r.push("website");
  if (can("staff")) r.push("staff");
  if (can("activity")) r.push("activity");
  r.push("settings");
  return r;
}
