const SERVICE_NAME = process.env.SERVICE_NAME || "customer-backend";
const ENVIRONMENT = process.env.NODE_ENV || "development";
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "local";

const serialize = (payload) => {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return JSON.stringify({
      level: "error",
      message: "Failed to serialize log payload",
      service: SERVICE_NAME,
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

const write = (level, message, meta = {}) => {
  const basePayload = {
    level,
    message,
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    awsRegion: AWS_REGION,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const serialized = serialize(basePayload);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
};

export const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  debug: (message, meta) => write("debug", message, meta),
};

export const buildRequestMeta = (req) => ({
  requestId: req.headers?.["x-request-id"] || null,
  path: req.originalUrl || req.url,
  method: req.method,
  userId: req.user?.id || null,
  userRole: req.user?.role || null,
  ip: req.ip,
});
