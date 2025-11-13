import jwt from "jsonwebtoken";

export const authenticate = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const [, token] = header.split(" ");
    if (!token) {
      return res.status(401).json({ error: "Invalid Authorization header" });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "change_me");
      req.user = payload;
      if (
        allowedRoles.length > 0 &&
        payload.role &&
        !allowedRoles.includes(payload.role)
      ) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
};
