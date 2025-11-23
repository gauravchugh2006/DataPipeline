const { logError } = require("../utils/logger");

const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const response = {
    message: err.message || "Unexpected error"
  };

  if (err.details) {
    response.details = err.details;
  }

  if (status >= 500) {
    logError("internal server error", { error: err.stack });
  }

  res.status(status).json(response);
};

module.exports = {
  errorHandler
};
