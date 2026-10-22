// Roles and what each may do. Checked on the server for every admin request;
// the admin interface only hides what a role cannot use.
const ROLES = ["owner", "manager", "editor", "tailor"];

const PERMISSIONS = {
  // Owner / Admin: everything
  owner: ["*"],
  // Manager / Assistant: inquiries, orders, clients (bookings and calendar arrive in phase 5)
  manager: ["dashboard", "orders", "orders.money", "orders.export", "clients", "clients.export", "catalog.read", "images"],
  // Content editor: collections, products, photos and website text; never client data
  editor: ["dashboard", "catalog", "catalog.read", "content", "images"],
  // Production / tailor: only orders in production assigned to them
  tailor: ["dashboard", "production", "images"],
};

function can(role, perm) {
  const list = PERMISSIONS[role] || [];
  return list.includes("*") || list.includes(perm);
}

// Express middleware: allow the request when the signed-in staff member has any of the permissions.
const requirePerm = (...perms) => (req, res, next) => {
  if (req.admin && perms.some((p) => can(req.admin.role, p))) return next();
  res.status(403).json({ error: "Your role does not have access to this." });
};

module.exports = { ROLES, PERMISSIONS, can, requirePerm };
