// Where the Mayza API lives. The site checks /api/health on load: if the API
// reports a connected database it runs live; otherwise the admin and the
// order sheet fall back to demo mode (data kept in the visitor's browser).
window.MAYZA_CONFIG = {
  apiBase: "/api",
  forceDemo: false,
};
