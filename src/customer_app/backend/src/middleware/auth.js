const { logWarn } = require("../utils/logger");

const AUTH_HEADER = "x-admin-role";

const authenticateOptionalUser = (req, _res, next) => {
  const role = req.headers[AUTH_HEADER] || req.headers[AUTH_HEADER.toUpperCase()];
  const userId = req.headers["x-admin-user"] || req.headers["x-admin-user".toUpperCase()];
  if (role || userId) {
    req.user = {
      id: userId || "anonymous",
      role: Array.isArray(role) ? role[0] : role
    };
  }
  next();
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  authenticateOptionalUser(req, res, () => {
    const role = req.user?.role;
    if (!role) {
      logWarn("admin access denied - missing role", { path: req.path });
      return res.status(401).json({ message: "Admin role header required" });
    }

    if (!allowedRoles.includes(role)) {
      logWarn("admin access denied - insufficient role", { path: req.path, role });
      return res.status(403).json({ message: "Insufficient privileges" });
    }

    next();
  });
};

module.exports = {
  authenticateOptionalUser,
  requireRole
};
