import jwt from "jsonwebtoken";

const decodeToken = (authorization) => {
  if (!authorization) {
    return null;
  }
  const [, token] = authorization.split(" ");
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "change_me");
  } catch (error) {
    return null;
  }
};

export const authenticate = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    const payload = decodeToken(req.headers.authorization);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = payload;
    if (
      allowedRoles.length > 0 &&
      payload.role &&
      !allowedRoles.includes(payload.role)
    ) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
};

export const authenticateOptional = () => {
  return (req, _res, next) => {
    const payload = decodeToken(req.headers.authorization);
    if (payload) {
      req.user = payload;
    }
    next();
  };
};
