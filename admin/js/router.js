// Hash routes (#inbox?status=new, #order/<id>, ...) and the shared click-action registry.
export const actions = {};
export const on = (map) => Object.assign(actions, map);

let renderFn = () => {};
export const setRender = (fn) => { renderFn = fn; };
export const rerender = () => renderFn();

export function route() {
  const [path, qs = ""] = location.hash.replace(/^#/, "").split("?");
  const [name, ...rest] = path.split("/");
  return { name: name || "dashboard", arg: rest.join("/") || "", query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function go(hash) {
  if (location.hash === "#" + hash) rerender();
  else location.hash = hash;
}
