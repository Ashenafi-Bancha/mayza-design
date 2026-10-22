// Talks to the Mayza API. Every change sends the CSRF token from the mz_csrf cookie.
const BASE = (window.MAYZA_CONFIG && window.MAYZA_CONFIG.apiBase) || "/api";

const csrf = () => (document.cookie.match(/(?:^|;\s*)mz_csrf=([^;]+)/) || [])[1] || "";

export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.code = data.code;
    this.field = data.field;
  }
}

let onSignedOut = () => {};
export const setSignedOutHandler = (fn) => { onSignedOut = fn; };

export async function api(path, { method = "GET", body, raw, query } = {}) {
  const headers = {};
  let payload;
  if (raw) { payload = raw; headers["Content-Type"] = raw.type || "image/jpeg"; }
  else if (body !== undefined) { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
  if (method !== "GET") headers["X-CSRF-Token"] = decodeURIComponent(csrf());
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    if ([...qs].length) url += "?" + qs;
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, credentials: "same-origin" });
  } catch (e) {
    throw new ApiError("No connection. Check the internet and try again.", 0);
  }
  const type = res.headers.get("content-type") || "";
  const data = type.includes("json") ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const err = new ApiError((data && data.error) || `Something went wrong (${res.status}).`, res.status, data || {});
    if (res.status === 401 && !path.startsWith("/auth/")) onSignedOut(err);
    throw err;
  }
  return data;
}

export const get = (path, query) => api(path, { query });
export const post = (path, body = {}) => api(path, { method: "POST", body });
export const put = (path, body = {}) => api(path, { method: "PUT", body });
export const del = (path, query) => api(path, { method: "DELETE", query });

// Photos are resized in the browser first, so uploads stay small on mobile data.
async function resize(file, max = 1600, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("That file is not a photo we can read. Try a JPG or PNG."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, "image/jpeg", quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function upload(file) {
  if (!/^image\//.test(file.type)) throw new Error("Choose a photo (JPG, PNG or WebP).");
  const blob = await resize(file);
  return api("/admin/images", { method: "POST", raw: blob }); // { id, url }
}

export const imgUrl = (u) => (!u ? "" : /^(https?:|data:|blob:|\/)/.test(u) ? u : "../" + u);
