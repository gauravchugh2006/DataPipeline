const log = (level, message, meta = {}) => {
  const payload = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString()
  };
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(payload));
};

module.exports = {
  logInfo: (message, meta) => log("info", message, meta),
  logWarn: (message, meta) => log("warn", message, meta),
  logError: (message, meta) => log("error", message, meta)
};
